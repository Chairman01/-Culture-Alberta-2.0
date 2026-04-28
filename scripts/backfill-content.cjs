/**
 * One-time script: fetches full article content from Supabase and writes it
 * into optimized-fallback.json so article pages can render without needing live DB access.
 *
 * Run: node scripts/backfill-content.cjs
 */

const fs = require('fs')
const path = require('path')

const SUPABASE_URL = 'https://itdmwpbsnviassgqfhxk.supabase.co'
const SUPABASE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0ZG13cGJzbnZpYXNzZ3FmaHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0ODU5NjUsImV4cCI6MjA2OTA2MTk2NX0.pxAXREQJrXJFZEBB3s7iwfm3rV_C383EbWCwf6ayPQo'

const FALLBACK_PATH = path.join(__dirname, '..', 'optimized-fallback.json')
const TIMEOUT_MS = 30000
const BATCH_SIZE = 10   // IDs to request per batch
const DELAY_MS = 400    // pause between batches

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function fetchWithTimeout(url, options = {}, timeoutMs = TIMEOUT_MS) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { ...options, signal: controller.signal })
    return res
  } finally {
    clearTimeout(timer)
  }
}

async function fetchBatch(ids) {
  const filter = ids.map(id => `id.eq.${id}`).join(',')
  const url = `${SUPABASE_URL}/rest/v1/articles?or=(${filter})&select=id,content`
  const res = await fetchWithTimeout(url, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
    },
  })
  if (!res.ok) {
    throw new Error(`Supabase responded ${res.status}: ${await res.text()}`)
  }
  return res.json()
}

async function main() {
  if (!fs.existsSync(FALLBACK_PATH)) {
    console.error('❌ optimized-fallback.json not found at', FALLBACK_PATH)
    process.exit(1)
  }

  const articles = JSON.parse(fs.readFileSync(FALLBACK_PATH, 'utf-8'))
  const missing = articles.filter(a => !a.content || a.content.trim().length < 50)

  console.log(`📦 Total articles: ${articles.length}`)
  console.log(`🔍 Articles missing content: ${missing.length}`)

  if (missing.length === 0) {
    console.log('✅ All articles already have content!')
    return
  }

  let updated = 0
  const contentMap = new Map()

  for (let i = 0; i < missing.length; i += BATCH_SIZE) {
    const batch = missing.slice(i, i + BATCH_SIZE)
    const ids = batch.map(a => a.id)
    console.log(`⬇️  Fetching batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(missing.length / BATCH_SIZE)} (${ids.length} articles)...`)

    try {
      const rows = await fetchBatch(ids)
      for (const row of rows) {
        if (row.content && row.content.trim().length > 0) {
          contentMap.set(row.id, row.content)
        }
      }
      console.log(`   ✅ Got content for ${rows.filter(r => r.content && r.content.trim().length > 0).length}/${ids.length}`)
    } catch (err) {
      console.warn(`   ⚠️  Batch failed: ${err.message}`)
    }

    if (i + BATCH_SIZE < missing.length) {
      await sleep(DELAY_MS)
    }
  }

  // Merge back
  for (const article of articles) {
    if (contentMap.has(article.id)) {
      article.content = contentMap.get(article.id)
      updated++
    }
  }

  fs.writeFileSync(FALLBACK_PATH, JSON.stringify(articles, null, 2))

  const sizeKB = Math.round(fs.statSync(FALLBACK_PATH).size / 1024)
  console.log(`\n✅ Done! Updated ${updated} articles with full content.`)
  console.log(`📁 optimized-fallback.json is now ${sizeKB} KB`)
}

main().catch(err => {
  console.error('❌ Fatal:', err)
  process.exit(1)
})
