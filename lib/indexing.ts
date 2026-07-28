/**
 * Auto-indexing utility for Culture Alberta
 *
 * Automatically notifies search engines when new content is published.
 *
 * Method used: Bing/IndexNow (free, no auth, covers Bing + Yandex + other
 * IndexNow participants). Verified returning HTTP 200 as of 2026-07-28.
 *
 * The old google.com/ping and bing.com/ping sitemap endpoints were REMOVED:
 * both search engines retired them (Google now 404s, Bing 410 Gone), so every
 * publish fired two guaranteed-to-fail requests and logged warnings that
 * buried real IndexNow failures. Google has no ping replacement — it
 * rediscovers via the sitemap in robots.txt and Search Console.
 *
 * Setup for IndexNow (Bing):
 *  - Set INDEXNOW_KEY env var to any random string (e.g. a UUID)
 *  - Create a file at /public/<your-key>.txt containing just the key value
 */

const BASE_URL = 'https://www.culturealberta.com'

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

  // Failures are non-fatal — publishing must never block on indexing.
  await pingIndexNow(fullUrl)
}

/**
 * IndexNow — covers Bing, Yandex, and other IndexNow-compatible engines.
 * Completely free, no authentication needed. Usually indexes within minutes.
 * Requires INDEXNOW_KEY env var and a verification file at /public/<key>.txt
 */
async function pingIndexNow(url: string): Promise<void> {
  await submitUrlsToIndexNow([url])
}
