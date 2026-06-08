#!/usr/bin/env node

/**
 * One-time IndexNow bulk backfill.
 *
 * Submits the most recent published article URLs to IndexNow (Bing, Yandex,
 * etc.) so search engines pick up everything they haven't crawled yet.
 *
 * Mirrors app/sitemap.ts exactly:
 *   - only status = 'published'
 *   - URL = https://www.culturealberta.com/articles/{slug}  (slug || slugify(title))
 *   - newest first
 *
 * Usage:
 *   node scripts/indexnow-backfill.js            # last 100 (default)
 *   node scripts/indexnow-backfill.js 250        # last 250
 *   node scripts/indexnow-backfill.js --dry-run  # print URLs, do not submit
 */

const BASE_URL = 'https://www.culturealberta.com'
const INDEXNOW_HOST = 'www.culturealberta.com'
const INDEXNOW_KEY = process.env.INDEXNOW_KEY || '212727a642e2a57d8980c5df27bd95f2'
const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://itdmwpbsnviassgqfhxk.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0ZG13cGJzbnZpYXNzZ3FmaHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0ODU5NjUsImV4cCI6MjA2OTA2MTk2NX0.pxAXREQJrXJFZEBB3s7iwfm3rV_C383EbWCwf6ayPQo'

// Same slugify rules as lib/utils/article-url.ts -> titleToSlug()
function titleToSlug(title) {
  return String(title || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 100)
}

function getArticleUrl(article) {
  const urlTitle = article.slug || titleToSlug(article.title)
  return `${BASE_URL}/articles/${urlTitle}`
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const limitArg = args.find((a) => /^\d+$/.test(a))
  const limit = limitArg ? parseInt(limitArg, 10) : 100

  console.log(`🔎 Fetching last ${limit} published articles from Supabase...`)

  // Only published articles, newest first — identical filter to the sitemap.
  const query =
    `${SUPABASE_URL}/rest/v1/articles` +
    `?select=id,title,slug,status,created_at` +
    `&status=eq.published` +
    `&order=created_at.desc` +
    `&limit=${limit}`

  const res = await fetch(query, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
  })

  if (!res.ok) {
    throw new Error(`Supabase request failed: ${res.status} ${res.statusText} ${await res.text()}`)
  }

  const rows = await res.json()
  console.log(`✅ Fetched ${rows.length} published articles`)

  // Build URLs, dedupe, drop any row that can't produce a slug.
  const urlList = [...new Set(
    rows
      .filter((r) => r.slug || r.title)
      .map(getArticleUrl)
  )]

  console.log(`🔗 Prepared ${urlList.length} unique URLs to submit`)

  if (dryRun) {
    urlList.forEach((u) => console.log('   ' + u))
    console.log('\n(dry run — nothing submitted)')
    return
  }

  // IndexNow accepts up to 10,000 URLs per request; chunk at 1,000 to be safe.
  const CHUNK = 1000
  for (let i = 0; i < urlList.length; i += CHUNK) {
    const chunk = urlList.slice(i, i + CHUNK)
    const body = {
      host: INDEXNOW_HOST,
      key: INDEXNOW_KEY,
      keyLocation: `${BASE_URL}/${INDEXNOW_KEY}.txt`,
      urlList: chunk,
    }

    const r = await fetch(INDEXNOW_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const text = await r.text()
    console.log(
      `📡 IndexNow response for ${chunk.length} URLs: HTTP ${r.status} ${r.statusText}` +
      (text ? ` — ${text}` : ' (empty body = accepted)')
    )
  }

  console.log('🏁 Backfill complete.')
}

main().catch((err) => {
  console.error('❌ Backfill failed:', err)
  process.exit(1)
})
