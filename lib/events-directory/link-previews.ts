/**
 * Server-only: og:image / title cache for the external event pages listed on
 * /events and the city hubs.
 *
 * The municipal open-data feeds carry no photos, so an events page built on
 * them alone is a wall of text. Each event's own page nearly always has an
 * og:image, so we fetch that once per URL and keep it in
 * `event_link_previews` (url → image_url, title, ok, fetched_at). A daily cron
 * (app/api/cron/event-images) fills the table ahead of time; the page tops up
 * a handful of missing ones at render so a new event is not blank for a day.
 *
 * Reads and writes use the service role: the table has RLS and no policies,
 * so nothing in the browser can touch it.
 */

import { getServiceClient } from '@/lib/supabase-admin'

export interface LinkPreview {
  url: string
  imageUrl: string | null
  title: string | null
  ok: boolean
  fetchedAt: string
}

const TABLE = 'event_link_previews'
// Organizers swap their hero image a few times a season; re-check fortnightly.
const REFRESH_AFTER_DAYS = 14
// Failed lookups are retried sooner: a 503 on a Tuesday is not a verdict.
const RETRY_FAILED_AFTER_DAYS = 2
const FETCH_TIMEOUT_MS = 6_000
// og tags live in <head>; no need to download a 4 MB page to find them.
const MAX_HTML_BYTES = 256 * 1024
const USER_AGENT = 'CultureAlberta/1.0 (+https://www.culturealberta.com; hello@culturealberta.com)'

/** Only fetch public http(s) pages; anything else is not a preview candidate. */
export function isPreviewableUrl(url: string | null | undefined): url is string {
  if (!url) return false
  try {
    const u = new URL(url)
    return (u.protocol === 'https:' || u.protocol === 'http:') && !!u.hostname.includes('.')
  } catch {
    return false
  }
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

function metaContent(html: string, names: string[]): string | null {
  for (const name of names) {
    // Attribute order varies: property before content and content before property.
    const patterns = [
      new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]*content=["']([^"']+)["']`, 'i'),
      new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${name}["']`, 'i'),
    ]
    for (const re of patterns) {
      const m = html.match(re)
      if (m?.[1]) return decodeEntities(m[1].trim())
    }
  }
  return null
}

/** Reject tracking pixels, icons and vector logos; keep real photos. */
function isUsableImage(url: string): boolean {
  const lower = url.toLowerCase()
  if (/\.(svg|gif|ico)(\?|$)/.test(lower)) return false
  if (/(favicon|sprite|pixel|spacer|logo-?only|1x1)/.test(lower)) return false
  return true
}

/**
 * Fetch one page and pull its share image. Never throws: a failed fetch is a
 * row with ok=false so the cron does not hammer a dead site every night.
 */
export async function fetchLinkPreview(url: string): Promise<Pick<LinkPreview, 'imageUrl' | 'title' | 'ok'>> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xhtml+xml' },
      redirect: 'follow',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      cache: 'no-store',
    })
    if (!res.ok || !res.body) return { imageUrl: null, title: null, ok: false }
    const type = res.headers.get('content-type') || ''
    if (!type.includes('html')) return { imageUrl: null, title: null, ok: false }

    // Read only the first chunk of the document.
    const reader = res.body.getReader()
    const chunks: Uint8Array[] = []
    let received = 0
    while (received < MAX_HTML_BYTES) {
      const { done, value } = await reader.read()
      if (done || !value) break
      chunks.push(value)
      received += value.length
    }
    reader.cancel().catch(() => {})
    const html = Buffer.concat(chunks.map(c => Buffer.from(c))).toString('utf8')

    const rawImage = metaContent(html, ['og:image:secure_url', 'og:image', 'twitter:image', 'twitter:image:src'])
    const title = metaContent(html, ['og:title']) || decodeEntities((html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] || '').trim()) || null

    let imageUrl: string | null = null
    if (rawImage) {
      try {
        const abs = new URL(rawImage, res.url || url)
        // Mixed content is blocked on the site (CSP), so http images are useless.
        if (abs.protocol === 'https:' && isUsableImage(abs.href)) imageUrl = abs.href
      } catch {
        imageUrl = null
      }
    }

    return { imageUrl, title: title ? title.slice(0, 200) : null, ok: true }
  } catch {
    return { imageUrl: null, title: null, ok: false }
  }
}

/** Cached previews for a set of URLs, keyed by URL. Missing URLs are absent. */
export async function getLinkPreviews(urls: string[]): Promise<Map<string, LinkPreview>> {
  const result = new Map<string, LinkPreview>()
  const unique = [...new Set(urls.filter(isPreviewableUrl))]
  if (unique.length === 0) return result

  const supabase = getServiceClient()
  // PostgREST `in` filters have a URL-length ceiling; chunk generously below it.
  for (let i = 0; i < unique.length; i += 100) {
    const { data, error } = await supabase
      .from(TABLE)
      .select('url, image_url, title, ok, fetched_at')
      .in('url', unique.slice(i, i + 100))
    if (error) {
      console.warn('[link-previews] read failed:', error.message)
      return result
    }
    for (const row of data || []) {
      result.set(row.url, {
        url: row.url,
        imageUrl: row.image_url,
        title: row.title,
        ok: !!row.ok,
        fetchedAt: row.fetched_at,
      })
    }
  }
  return result
}

function isStale(preview: LinkPreview | undefined, now: number): boolean {
  if (!preview) return true
  const age = now - new Date(preview.fetchedAt).getTime()
  const days = age / 86_400_000
  return preview.ok ? days > REFRESH_AFTER_DAYS : days > RETRY_FAILED_AFTER_DAYS
}

export interface RefreshOptions {
  /** Max URLs fetched this call. */
  limit: number
  /** Stop starting new fetches once this much time has passed. */
  budgetMs: number
  /** Parallel fetches; organizer sites are small, keep this polite. */
  concurrency?: number
  /** Already-loaded previews, to skip the read. */
  known?: Map<string, LinkPreview>
}

/**
 * Fetch and store previews for URLs that are missing or stale. Returns what it
 * fetched so a caller rendering right now can use the fresh rows without a
 * second read.
 */
export async function refreshLinkPreviews(
  urls: string[],
  { limit, budgetMs, concurrency = 4, known }: RefreshOptions
): Promise<{ fetched: number; ok: number; previews: Map<string, LinkPreview> }> {
  const started = Date.now()
  const unique = [...new Set(urls.filter(isPreviewableUrl))]
  const existing = known ?? await getLinkPreviews(unique)
  const now = Date.now()
  const queue = unique.filter(u => isStale(existing.get(u), now)).slice(0, limit)
  const fresh = new Map<string, LinkPreview>()
  if (queue.length === 0) return { fetched: 0, ok: 0, previews: fresh }

  const supabase = getServiceClient()
  let index = 0
  let okCount = 0

  const worker = async () => {
    while (index < queue.length && Date.now() - started < budgetMs) {
      const url = queue[index++]
      const preview = await fetchLinkPreview(url)
      if (preview.ok) okCount++
      const row = {
        url,
        image_url: preview.imageUrl,
        title: preview.title,
        ok: preview.ok,
        fetched_at: new Date().toISOString(),
      }
      const { error } = await supabase.from(TABLE).upsert(row, { onConflict: 'url' })
      if (error) console.warn('[link-previews] upsert failed:', error.message)
      fresh.set(url, { url, imageUrl: row.image_url, title: row.title, ok: row.ok, fetchedAt: row.fetched_at })
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, queue.length) }, worker))
  return { fetched: fresh.size, ok: okCount, previews: fresh }
}
