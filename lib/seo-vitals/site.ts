/**
 * The collectors that need nothing but the database. These run from day one,
 * before any Google credential exists, and they cover the two August 2026
 * findings that were not about traffic at all:
 *
 *   - the publishing mix (guide/utility output fell 15 → 5 while tool usage
 *     fell 35%), and
 *   - the <title> length problem (714 of 741 headlines over 60 characters).
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
// Relative, not '@/…': this module is also imported by plain-node tests.
import { MAX_TITLE_LENGTH } from '../seo/title'

export function getServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  // Service role in production: seo_daily and seo_alerts have RLS on and no
  // policies, so only that key can write them. The anon fallback exists for
  // local ?dryRun=1 runs (same pattern as indexnow-sweep) — it can read
  // published articles and nothing else, which is all a dry run needs.
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set')
  return createClient(url, key)
}

// ---------------------------------------------------------------------------
// Headline classification. A keyword heuristic, checked in this order. Guides
// are tested before money on purpose: "what's open" and "holiday" pieces
// contain "open"/"pay", and the first version of this list (and the August
// 2026 close it was lifted from) filed every Heritage Day guide under
// money_business because of it. Keep the order if you extend the patterns.
// ---------------------------------------------------------------------------

export type TitleClass = 'crime_death' | 'money_business' | 'weather' | 'guide_utility' | 'other'

const CLASSIFIERS: Array<[TitleClass, RegExp]> = [
  ['crime_death', /(kill|dead|death|homicide|shoot|stab|murder|body|remains|missing|crash|collision|fatal|assault|arrest|charged|police|rcmp|died|drown|victim)/i],
  ['guide_utility', /(things to do|weekend|guide|what'?s open|holiday|festival|calculator|payment dates|how to)/i],
  ['money_business', /(open|opening|sold|sale|closes|closing|store|mall|costco|restaurant|jobs|hiring|layoff|cuts|million|billion|\$|rebate|benefit|payment|tax|cra|settlement|lawsuit|court|sued|company|business|develop|build|constru|arena|project)/i],
  ['weather', /(weather|storm|hail|tornado|lightning|wildfire|smoke|heat|snow)/i],
]

export function classifyTitle(title: string): TitleClass {
  for (const [cls, re] of CLASSIFIERS) {
    if (re.test(title || '')) return cls
  }
  return 'other'
}

// ---------------------------------------------------------------------------
// Edmonton calendar days. Editors think in local time, and `created_at` is a
// timestamptz, so a "day" here runs midnight-to-midnight America/Edmonton.
// ---------------------------------------------------------------------------

function edmontonOffsetMinutes(at: Date): number {
  const name = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Edmonton', timeZoneName: 'longOffset' })
    .formatToParts(at)
    .find((p) => p.type === 'timeZoneName')?.value || 'GMT-07:00'
  const m = name.match(/GMT([+-])(\d{2}):?(\d{2})?/)
  if (!m) return -420
  const sign = m[1] === '-' ? -1 : 1
  return sign * (parseInt(m[2], 10) * 60 + parseInt(m[3] || '0', 10))
}

/** The UTC instant of local midnight at the start of `day` (YYYY-MM-DD). */
function edmontonMidnightUtc(day: string): Date {
  const naive = new Date(`${day}T00:00:00Z`)
  let start = new Date(naive.getTime() - edmontonOffsetMinutes(naive) * 60_000)
  // Re-check with the offset in force at the instant we just computed; the two
  // differ only if a DST switch falls between them, and it never does (the
  // switch is at 02:00 local), but the second pass costs nothing.
  const corrected = new Date(naive.getTime() - edmontonOffsetMinutes(start) * 60_000)
  if (corrected.getTime() !== start.getTime()) start = corrected
  return start
}

export function edmontonDayRange(day: string): { start: string; end: string } {
  return { start: edmontonMidnightUtc(day).toISOString(), end: edmontonMidnightUtc(shiftDay(day, 1)).toISOString() }
}

export function shiftDay(day: string, deltaDays: number): string {
  const d = new Date(`${day}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + deltaDays)
  return d.toISOString().slice(0, 10)
}

// ---------------------------------------------------------------------------
// Collectors
// ---------------------------------------------------------------------------

interface ArticleLite {
  id: string
  title: string
  seo_title: string | null
  created_at: string
  indexnow_submitted_at: string | null
}

/** Every published, non-event article — id/title-level columns only. */
async function fetchPublished(supabase: SupabaseClient): Promise<ArticleLite[]> {
  const out: ArticleLite[] = []
  const PAGE = 1000 // PostgREST caps a response at 1,000 rows regardless of the request
  for (let page = 0; ; page++) {
    const { data, error } = await supabase
      .from('articles')
      .select('id, title, seo_title, created_at, indexnow_submitted_at')
      .eq('status', 'published')
      // `neq('type','event')` alone would drop rows whose type is NULL.
      .or('type.is.null,type.neq.event')
      .order('created_at', { ascending: false })
      .range(page * PAGE, (page + 1) * PAGE - 1)
    if (error) throw new Error(`articles: ${error.message}`)
    if (!data || data.length === 0) break
    out.push(...(data as ArticleLite[]))
    if (data.length < PAGE) break
  }
  return out
}

export type PublishingCounts = Record<'published' | TitleClass, number>

/** How many articles were published on `day` (Edmonton), by headline class. */
export function publishingForDay(articles: ArticleLite[], day: string): PublishingCounts {
  const { start, end } = edmontonDayRange(day)
  const counts: PublishingCounts = { published: 0, crime_death: 0, money_business: 0, weather: 0, guide_utility: 0, other: 0 }
  for (const a of articles) {
    if (a.created_at >= start && a.created_at < end) {
      counts.published++
      counts[classifyTitle(a.title)]++
    }
  }
  return counts
}

export interface SiteSnapshot {
  published_total: number
  /** Published articles whose <title> is still being auto-cut: headline > 60 and no seo_title. */
  long_titles_no_override: number
  /** Same, but only among articles published in the last 7 days — the ones an editor can still fix cheaply. */
  new_long_titles_7d: number
  /** Published articles never submitted to IndexNow (the sweeper should keep this at 0). */
  indexnow_unstamped: number
}

export function siteSnapshot(articles: ArticleLite[], runDay: string): SiteSnapshot {
  const weekAgo = edmontonDayRange(shiftDay(runDay, -7)).start
  let long = 0
  let newLong = 0
  let unstamped = 0
  for (const a of articles) {
    const tooLong = (a.title || '').trim().length > MAX_TITLE_LENGTH && !(a.seo_title || '').trim()
    if (tooLong) {
      long++
      if (a.created_at >= weekAgo) newLong++
    }
    if (!a.indexnow_submitted_at) unstamped++
  }
  return { published_total: articles.length, long_titles_no_override: long, new_long_titles_7d: newLong, indexnow_unstamped: unstamped }
}

export async function collectSite(supabase: SupabaseClient, publishingDay: string, runDay: string) {
  const articles = await fetchPublished(supabase)
  return { publishing: publishingForDay(articles, publishingDay), snapshot: siteSnapshot(articles, runDay) }
}
