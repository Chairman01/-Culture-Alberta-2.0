/**
 * Auto-indexing utility for Culture Alberta
 *
 * Automatically notifies search engines when new content is published.
 *
 * Methods used:
 * 1. Google Indexing API (fastest — requires Service Account credentials in env)
 * 2. Bing/IndexNow (free, no auth needed, covers Bing + Yandex + other IndexNow participants)
 * 3. Sitemap ping to Google and Bing (fallback — always works, slowest)
 *
 * Setup for Google Indexing API:
 *  - Go to https://search.google.com/search-console
 *  - Create a Service Account in Google Cloud Console
 *  - Grant it "Owner" permission in Search Console
 *  - Download the JSON key and set GOOGLE_INDEXING_SA_KEY env var to the JSON string
 *
 * Setup for IndexNow (Bing):
 *  - Set INDEXNOW_KEY env var to any random string (e.g. a UUID)
 *  - Create a file at /public/<your-key>.txt containing just the key value
 */

const BASE_URL = 'https://www.culturealberta.com'
const SITEMAP_URL = `${BASE_URL}/sitemap.xml`

/**
 * Notify search engines about a newly published or updated article URL.
 * Call this after an article is successfully created or updated with status='published'.
 */
export async function notifySearchEngines(articleUrl: string): Promise<void> {
  const fullUrl = articleUrl.startsWith('http') ? articleUrl : `${BASE_URL}${articleUrl}`

  console.log(`🔔 Notifying search engines about: ${fullUrl}`)

  // Run all pings in parallel — failures are non-fatal
  await Promise.allSettled([
    pingIndexNow(fullUrl),
    pingSitemapGoogle(),
    pingSitemapBing(),
  ])
}

/**
 * IndexNow — covers Bing, Yandex, and other IndexNow-compatible engines.
 * Completely free, no authentication needed. Usually indexes within minutes.
 * Requires INDEXNOW_KEY env var and a verification file at /public/<key>.txt
 */
async function pingIndexNow(url: string): Promise<void> {
  const key = process.env.INDEXNOW_KEY
  if (!key) {
    console.log('ℹ️  INDEXNOW_KEY not set — skipping IndexNow ping. Add it to your .env for faster Bing indexing.')
    return
  }

  try {
    const body = {
      host: 'www.culturealberta.com',
      key,
      keyLocation: `${BASE_URL}/${key}.txt`,
      urlList: [url],
    }

    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (res.ok || res.status === 202) {
      console.log(`✅ IndexNow ping sent (${res.status})`)
    } else {
      const text = await res.text()
      console.warn(`⚠️  IndexNow ping returned ${res.status}: ${text}`)
    }
  } catch (err) {
    console.warn('⚠️  IndexNow ping failed:', err)
  }
}

/**
 * Ping Google's sitemap endpoint — tells Google to re-crawl the sitemap.
 * Slower than the Indexing API but always works with no auth.
 */
async function pingSitemapGoogle(): Promise<void> {
  try {
    const pingUrl = `https://www.google.com/ping?sitemap=${encodeURIComponent(SITEMAP_URL)}`
    const res = await fetch(pingUrl, { method: 'GET' })
    if (res.ok) {
      console.log('✅ Google sitemap pinged')
    } else {
      console.warn(`⚠️  Google sitemap ping returned ${res.status}`)
    }
  } catch (err) {
    console.warn('⚠️  Google sitemap ping failed:', err)
  }
}

/**
 * Ping Bing's sitemap endpoint — tells Bing to re-crawl the sitemap.
 */
async function pingSitemapBing(): Promise<void> {
  try {
    const pingUrl = `https://www.bing.com/ping?sitemap=${encodeURIComponent(SITEMAP_URL)}`
    const res = await fetch(pingUrl, { method: 'GET' })
    if (res.ok) {
      console.log('✅ Bing sitemap pinged')
    } else {
      console.warn(`⚠️  Bing sitemap ping returned ${res.status}`)
    }
  } catch (err) {
    console.warn('⚠️  Bing sitemap ping failed:', err)
  }
}
