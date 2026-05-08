import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'
export const maxDuration = 55

const FALLBACK_PATH = path.join(process.cwd(), 'optimized-fallback.json')
const SUPABASE_URL = 'https://itdmwpbsnviassgqfhxk.supabase.co'
const SUPABASE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0ZG13cGJzbnZpYXNzZ3FmaHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0ODU5NjUsImV4cCI6MjA2OTA2MTk2NX0.pxAXREQJrXJFZEBB3s7iwfm3rV_C383EbWCwf6ayPQo'

function makeClient() {
  return createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function normalizeCategories(val: unknown): string[] {
  if (Array.isArray(val)) return val.map((c) => String(c || '').trim()).filter(Boolean)
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val)
      return Array.isArray(parsed) ? parsed.map((c: unknown) => String(c || '').trim()).filter(Boolean) : [val.trim()].filter(Boolean)
    } catch {
      return val.trim() ? [val.trim()] : []
    }
  }
  return []
}

export async function POST(request: NextRequest) {
  try {
    const supabase = makeClient()

    console.log('🔄 Full fallback sync: fetching all articles from Supabase...')

    // Fetch ALL articles including content
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Supabase timeout')), 45000)
    )

    const { data, error } = await Promise.race([
      supabase
        .from('articles')
        .select('id, title, slug, excerpt, content, category, categories, location, author, tags, type, status, created_at, updated_at, trending_home, trending_edmonton, trending_calgary, featured_home, featured_edmonton, featured_calgary, image_url, image')
        .order('created_at', { ascending: false })
        .limit(500),
      timeoutPromise,
    ]) as any

    if (error) throw new Error(error.message)
    if (!data || data.length === 0) throw new Error('No articles returned from Supabase')

    console.log(`✅ Got ${data.length} articles from Supabase`)

    // Read existing fallback to preserve any content we already have
    let existingMap = new Map<string, any>()
    if (fs.existsSync(FALLBACK_PATH)) {
      try {
        const existing = JSON.parse(fs.readFileSync(FALLBACK_PATH, 'utf-8'))
        for (const a of existing) {
          existingMap.set(a.id, a)
        }
      } catch {}
    }

    // Build the new fallback from Supabase data
    const articles = data.map((row: any) => {
      const categories = normalizeCategories(row.categories)
      const existing = existingMap.get(row.id)
      // Use Supabase content; fall back to whatever we had in the file
      const content = (row.content && row.content.trim()) || (existing?.content ?? '')
      return {
        id: row.id,
        title: row.title,
        excerpt: row.excerpt || '',
        content,
        category: row.category || (categories[0] ?? ''),
        categories: categories.length > 0 ? categories : (row.category ? [row.category] : []),
        location: row.location || '',
        author: row.author || '',
        tags: row.tags || [],
        type: row.type || 'article',
        status: row.status || 'published',
        imageUrl: row.image_url || row.image || '',
        date: row.created_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        trendingHome: row.trending_home || false,
        trendingEdmonton: row.trending_edmonton || false,
        trendingCalgary: row.trending_calgary || false,
        featuredHome: row.featured_home || false,
        featuredEdmonton: row.featured_edmonton || false,
        featuredCalgary: row.featured_calgary || false,
        slug: row.slug || '',
      }
    })

    const withContent = articles.filter((a: any) => a.content && a.content.trim().length > 100).length

    // Atomic write
    const tmpPath = FALLBACK_PATH + '.tmp'
    fs.writeFileSync(tmpPath, JSON.stringify(articles, null, 2))
    fs.renameSync(tmpPath, FALLBACK_PATH)

    console.log(`✅ Wrote ${articles.length} articles to fallback (${withContent} with full content)`)

    return NextResponse.json({
      success: true,
      total: articles.length,
      withContent,
      withoutContent: articles.length - withContent,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('❌ Full sync error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
