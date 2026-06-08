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

// IndexNow host + key. The key is intentionally PUBLIC (it's hosted at
// https://www.culturealberta.com/<key>.txt for verification), so a hardcoded
// fallback is safe and means IndexNow works without any Vercel env config.
// Override with INDEXNOW_KEY only if you also rename public/<key>.txt to match.
export const INDEXNOW_HOST = 'www.culturealberta.com'
export const INDEXNOW_KEY = process.env.INDEXNOW_KEY || '212727a642e2a57d8980c5df27bd95f2'
const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow'

/**
 * Submit one or more URLs to IndexNow in a single request (Bing, Yandex, etc.).
 * Accepts up to 10,000 URLs per call. Returns the HTTP status (200/202 = success)
 * or null on network error. Logs the response. Used by both the per-publish ping
 * and the bulk backfill script.
 */
export async function submitUrlsToIndexNow(urls: string[]): Promise<number | null> {
  if (!urls.length) return null
  try {
    const body = {
      host: INDEXNOW_HOST,
      key: INDEXNOW_KEY,
      keyLocation: `${BASE_URL}/${INDEXNOW_KEY}.txt`,
      urlList: urls,
    }
    const res = await fetch(INDEXNOW_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok || res.status === 202) {
      console.log(`✅ IndexNow: submitted ${urls.length} URL(s) (HTTP ${res.status})`)
    } else {
      const text = await res.text()
      console.warn(`⚠️  IndexNow returned ${res.status}: ${text}`)
    }
    return res.status
  } catch (err) {
    console.warn('⚠️  IndexNow request failed:', err)
    return null
  }
}

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
  await submitUrlsToIndexNow([url])
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
