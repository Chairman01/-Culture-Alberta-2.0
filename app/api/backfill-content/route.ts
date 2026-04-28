import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'
export const maxDuration = 55

const FALLBACK_PATH = path.join(process.cwd(), 'optimized-fallback.json')
const PROD_BASE = 'https://www.culturealberta.com'

async function fetchContentFromProd(id: string, timeoutMs = 10000): Promise<string | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(`${PROD_BASE}/api/admin/articles/${encodeURIComponent(id)}`, {
      signal: controller.signal,
      cache: 'no-store',
      headers: { 'User-Agent': 'CultureAlberta-DevBackfill/1.0' },
    })
    clearTimeout(timer)
    if (!res.ok) return null
    const data = await res.json()
    const c = data?.content
    return c && typeof c === 'string' && c.trim().length > 0 ? c.trim() : null
  } catch {
    clearTimeout(timer)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!fs.existsSync(FALLBACK_PATH)) {
      return NextResponse.json({ error: 'optimized-fallback.json not found' }, { status: 404 })
    }

    const body = await request.json().catch(() => ({}))
    const batchSize: number = body.batchSize ?? 5
    const offset: number = body.offset ?? 0

    const articles: any[] = JSON.parse(fs.readFileSync(FALLBACK_PATH, 'utf-8'))
    const missing = articles
      .map((a, idx) => ({ ...a, _idx: idx }))
      .filter((a) => !a.content || a.content.trim().length < 100)

    const batch = missing.slice(offset, offset + batchSize)

    if (batch.length === 0) {
      return NextResponse.json({
        done: true,
        message: 'All articles already have content',
        total: articles.length,
        missing: missing.length,
      })
    }

    console.log(`📥 Backfill via prod: fetching ${batch.length} articles (offset=${offset})`)

    let updated = 0
    for (const item of batch) {
      console.log(`  ⬇️  ${item.id}`)
      const content = await fetchContentFromProd(item.id)
      if (content) {
        articles[item._idx].content = content
        updated++
        console.log(`  ✅ Got ${content.length} chars`)
      } else {
        console.log(`  ⚠️  No content`)
      }
    }

    // Write atomically: write to temp file then rename to prevent corruption
    const tmpPath = FALLBACK_PATH + '.tmp'
    fs.writeFileSync(tmpPath, JSON.stringify(articles, null, 2))
    fs.renameSync(tmpPath, FALLBACK_PATH)

    return NextResponse.json({
      done: false,
      offset,
      batchSize,
      batchProcessed: batch.length,
      batchUpdated: updated,
      totalMissing: missing.length,
      nextOffset: offset + batchSize,
      remaining: Math.max(0, missing.length - offset - batchSize),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('❌ Backfill error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function GET() {
  if (!fs.existsSync(FALLBACK_PATH)) {
    return NextResponse.json({ error: 'optimized-fallback.json not found' }, { status: 404 })
  }
  const articles: any[] = JSON.parse(fs.readFileSync(FALLBACK_PATH, 'utf-8'))
  const missing = articles.filter((a) => !a.content || a.content.trim().length < 100)
  return NextResponse.json({
    total: articles.length,
    withContent: articles.length - missing.length,
    missing: missing.length,
  })
}
