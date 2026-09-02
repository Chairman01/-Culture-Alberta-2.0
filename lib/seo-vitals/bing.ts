/**
 * Bing Webmaster Tools — Search Performance API.
 *
 * Bing and Yahoo are the high-RPM half of this site's search traffic, and the
 * energy-rebate cluster (19,266 impressions at position 3.19) is a Bing query
 * before it is a Google one. Search Console cannot see any of it.
 *
 * The API is a single API key on the query string — no OAuth, no service
 * account. Get it from Bing Webmaster Tools → Settings → API access, and set
 * it as BING_WEBMASTER_API_KEY. Without it every call here reports `skipped`,
 * the same way the Google collectors do.
 *
 * Two quirks the parsers below absorb:
 *   1. Dates come back as Microsoft JSON dates — "/Date(1756684800000)/" —
 *      not ISO strings.
 *   2. The field holding the row's subject is `Query` on GetQueryStats and,
 *      depending on the account, `Query` or `Url` on GetPageStats. Both are
 *      read, so a rename on their side degrades to zero rows rather than
 *      writing every page under the key "undefined".
 */

const BASE = 'https://ssl.bing.com/webmaster/api.svc/json'

export interface BingRow {
  /** Query text, or page URL for page stats. */
  subject: string
  day: string
  clicks: number
  impressions: number
  /** Average impression position; 0 when Bing does not report one. */
  position: number
}

export function bingSiteUrl(): string {
  return process.env.BING_SITE_URL || 'https://www.culturealberta.com'
}

export function hasBingCredential(): boolean {
  return !!process.env.BING_WEBMASTER_API_KEY
}

/** "/Date(1756684800000)/" → "2026-09-01". Anything else → null. */
export function parseMsDate(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const m = value.match(/\/Date\((-?\d+)([+-]\d{4})?\)\//)
  if (m) return new Date(Number(m[1])).toISOString().slice(0, 10)
  // Some responses already use ISO. Accept those too.
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10)
  return null
}

function num(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function normalize(raw: any): BingRow | null {
  if (!raw || typeof raw !== 'object') return null
  const subject = raw.Query ?? raw.Url ?? raw.Page ?? raw.query ?? raw.url
  const day = parseMsDate(raw.Date ?? raw.date)
  if (typeof subject !== 'string' || !subject || !day) return null
  return {
    subject,
    day,
    clicks: num(raw.Clicks ?? raw.clicks),
    impressions: num(raw.Impressions ?? raw.impressions),
    position: num(raw.AvgImpressionPosition ?? raw.avgImpressionPosition),
  }
}

async function call(method: string, params: Record<string, string> = {}): Promise<BingRow[]> {
  const key = process.env.BING_WEBMASTER_API_KEY
  if (!key) throw new Error('BING_WEBMASTER_API_KEY not set')

  const url = new URL(`${BASE}/${method}`)
  url.searchParams.set('apikey', key)
  url.searchParams.set('siteUrl', bingSiteUrl())
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)

  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) {
    throw new Error(`Bing ${method} ${res.status}: ${(await res.text()).slice(0, 300)}`)
  }
  const json = await res.json()
  // Successful responses wrap the array in `d`; errors put a message there.
  const list = Array.isArray(json?.d) ? json.d : Array.isArray(json) ? json : []
  return list.map(normalize).filter((r: BingRow | null): r is BingRow => r !== null)
}

/** Every query Bing reports for the site, per day, over its rolling window. */
export function bingQueryStats(): Promise<BingRow[]> {
  return call('GetQueryStats')
}

/** Every page Bing reports for the site, per day, over its rolling window. */
export function bingPageStats(): Promise<BingRow[]> {
  return call('GetPageStats')
}

/**
 * The queries that led to one page. One request per page, so callers pass the
 * handful of URLs actually being tracked — never the whole sitemap.
 */
export function bingPageQueryStats(page: string): Promise<BingRow[]> {
  return call('GetPageQueryStats', { page })
}
