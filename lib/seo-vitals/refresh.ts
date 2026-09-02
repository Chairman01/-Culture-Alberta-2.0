/**
 * The refresh loop's memory: what was changed, and whether it worked.
 *
 * A title rewrite is a bet. Without a record of when it was made and what the
 * page was doing beforehand, the bet can never be settled — which is how a
 * cluster can sit at 19,266 impressions and 1.22% CTR for months without
 * anyone being able to say whether last month's rewrite helped or hurt.
 *
 * The shape of the loop:
 *   1. a row lands in seo_refreshes with status 'queued' and a `baseline`
 *      snapshot of the 28 days before it;
 *   2. the change is approved and applied — status 'applied', applied_at set;
 *   3. MEASURE_AFTER_DAYS later the same window is measured again and the two
 *      are compared — status 'measured', with an `outcome` and a `verdict`.
 *
 * Step 3 is arithmetic over seo_query_daily, so it runs in the cron and needs
 * no judgement. Steps 1 and 2 are editorial and stay with a person.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { shiftDay } from './site'

/** A title change takes about two weeks to settle in the index. */
export const MEASURE_AFTER_DAYS = 14
/** Compared window, before and after. */
export const WINDOW_DAYS = 28
/** Below this many days of data in either window, no verdict is issued. */
const MIN_DAYS = 7

export type Verdict = 'improved' | 'flat' | 'worse' | 'insufficient-data'

export interface Metrics {
  clicks: number
  impressions: number
  /** Impression-weighted, so a one-impression day cannot swing it. */
  position: number
  ctr: number
  days: number
}

export interface Snapshot {
  window: { from: string; to: string }
  gsc: Metrics
  bing: Metrics
  /** The queries this page ranked for, biggest first. */
  queries: Array<{ query: string; source: string; impressions: number; clicks: number; position: number }>
}

const ZERO: Metrics = { clicks: 0, impressions: 0, position: 0, ctr: 0, days: 0 }

interface RawRow {
  day: string
  source: string
  page: string
  query: string
  clicks: number
  impressions: number
  ctr: number
  position: number
}

/**
 * Articles live at /articles/<slug>. Both collectors are normalised to a
 * pathname so a GSC row and a Bing row for the same article land on the same
 * key — GSC returns absolute URLs, Bing returns whatever the account is
 * verified under.
 */
export function toPath(urlOrPath: string): string {
  const raw = (urlOrPath || '').trim()
  if (!raw) return ''
  try {
    return new URL(raw).pathname.replace(/\/+$/, '') || '/'
  } catch {
    return raw.startsWith('/') ? raw.replace(/\/+$/, '') : `/${raw}`.replace(/\/+$/, '')
  }
}

export function slugToPath(slug: string): string {
  return `/articles/${slug}`
}

function aggregate(rows: RawRow[]): Metrics {
  if (!rows.length) return { ...ZERO }
  let clicks = 0
  let impressions = 0
  let weightedPosition = 0
  const days = new Set<string>()
  for (const r of rows) {
    clicks += r.clicks
    impressions += r.impressions
    weightedPosition += r.position * r.impressions
    days.add(r.day)
  }
  return {
    clicks,
    impressions,
    position: impressions > 0 ? weightedPosition / impressions : 0,
    ctr: impressions > 0 ? clicks / impressions : 0,
    days: days.size,
  }
}

function toRawRows(data: unknown[]): RawRow[] {
  return (data || []).map((r) => {
    const row = r as Record<string, unknown>
    return {
      day: String(row.day),
      source: String(row.source),
      page: String(row.page ?? ''),
      query: String(row.query ?? ''),
      clicks: Number(row.clicks) || 0,
      impressions: Number(row.impressions) || 0,
      ctr: Number(row.ctr) || 0,
      position: Number(row.position) || 0,
    }
  })
}

/** Everything seo_query_daily holds for one page over one window. */
export async function snapshotPage(
  supabase: SupabaseClient,
  slug: string,
  from: string,
  to: string,
): Promise<Snapshot> {
  const path = slugToPath(slug)
  const { data, error } = await supabase
    .from('seo_query_daily')
    .select('day, source, page, query, clicks, impressions, ctr, position')
    .eq('page', path)
    .gte('day', from)
    .lte('day', to)
  if (error) throw new Error(`seo_query_daily read: ${error.message}`)

  const rows = toRawRows(data || [])

  // Page totals are the rows with no query attached; per-query rows would
  // double-count them.
  const pageRows = rows.filter((r) => r.query === '')
  const queryRows = rows.filter((r) => r.query !== '')

  const byQuery = new Map<string, { query: string; source: string; impressions: number; clicks: number; weighted: number }>()
  for (const r of queryRows) {
    const k = `${r.source}|${r.query}`
    const cur = byQuery.get(k) || { query: r.query, source: r.source, impressions: 0, clicks: 0, weighted: 0 }
    cur.impressions += r.impressions
    cur.clicks += r.clicks
    cur.weighted += r.position * r.impressions
    byQuery.set(k, cur)
  }

  return {
    window: { from, to },
    gsc: aggregate(pageRows.filter((r) => r.source === 'gsc')),
    bing: aggregate(pageRows.filter((r) => r.source === 'bing')),
    queries: [...byQuery.values()]
      .map((q) => ({
        query: q.query,
        source: q.source,
        impressions: q.impressions,
        clicks: q.clicks,
        position: q.impressions > 0 ? q.weighted / q.impressions : 0,
      }))
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 25),
  }
}

/** The same window, for a bare query rather than a page. */
export async function snapshotQuery(
  supabase: SupabaseClient,
  query: string,
  from: string,
  to: string,
): Promise<{ gsc: Metrics; bing: Metrics }> {
  const { data, error } = await supabase
    .from('seo_query_daily')
    .select('day, source, page, query, clicks, impressions, ctr, position')
    .eq('query', query)
    .eq('page', '')
    .gte('day', from)
    .lte('day', to)
  if (error) throw new Error(`seo_query_daily read: ${error.message}`)
  const rows = toRawRows(data || [])
  return {
    gsc: aggregate(rows.filter((r) => r.source === 'gsc')),
    bing: aggregate(rows.filter((r) => r.source === 'bing')),
  }
}

function combined(s: Snapshot): Metrics {
  const impressions = s.gsc.impressions + s.bing.impressions
  return {
    clicks: s.gsc.clicks + s.bing.clicks,
    impressions,
    position:
      impressions > 0 ? (s.gsc.position * s.gsc.impressions + s.bing.position * s.bing.impressions) / impressions : 0,
    ctr: impressions > 0 ? (s.gsc.clicks + s.bing.clicks) / impressions : 0,
    days: Math.max(s.gsc.days, s.bing.days),
  }
}

/**
 * The verdict, from the two windows.
 *
 * Clicks decide it, because clicks are what earn: a rewrite that lifts
 * position while losing clicks answered the wrong question. Position only
 * breaks a tie, and a move of less than a full place is noise.
 *
 * For a new article there is no before, so the test is simply whether it
 * picked up impressions at all.
 */
export function judge(baseline: Snapshot | null, outcome: Snapshot): { verdict: Verdict; reason: string } {
  const after = combined(outcome)

  if (!baseline) {
    if (after.days < MIN_DAYS) return { verdict: 'insufficient-data', reason: `only ${after.days} days of data so far` }
    if (after.impressions === 0) return { verdict: 'worse', reason: 'no impressions at all — check indexing' }
    if (after.clicks > 0)
      return { verdict: 'improved', reason: `${after.clicks} clicks from ${after.impressions} impressions` }
    return { verdict: 'flat', reason: `${after.impressions} impressions but no clicks yet` }
  }

  const before = combined(baseline)
  if (before.days < MIN_DAYS || after.days < MIN_DAYS) {
    return {
      verdict: 'insufficient-data',
      reason: `${before.days} days before vs ${after.days} after; need ${MIN_DAYS} of each`,
    }
  }

  const clickChange = before.clicks > 0 ? (after.clicks - before.clicks) / before.clicks : after.clicks > 0 ? 1 : 0
  // Position counts down: a smaller number is a better rank.
  const positionMove = before.position - after.position
  const pct = `${clickChange >= 0 ? '+' : ''}${Math.round(clickChange * 100)}%`
  const pos = `${positionMove >= 0 ? '-' : '+'}${Math.abs(positionMove).toFixed(1)}`
  const clicks = `(${before.clicks} → ${after.clicks})`

  if (clickChange >= 0.2) return { verdict: 'improved', reason: `clicks ${pct} ${clicks}, position ${pos}` }
  if (clickChange <= -0.2) return { verdict: 'worse', reason: `clicks ${pct} ${clicks}, position ${pos}` }
  if (positionMove >= 1) return { verdict: 'improved', reason: `clicks flat at ${pct}, but position ${pos}` }
  if (positionMove <= -1) return { verdict: 'worse', reason: `clicks flat at ${pct}, and position ${pos}` }
  return { verdict: 'flat', reason: `clicks ${pct}, position ${pos} — inside the noise` }
}

export interface MeasuredRefresh {
  id: number
  slug: string
  verdict: Verdict
  reason: string
}

/**
 * Settle every applied refresh that is old enough, and leave the younger ones
 * alone. Called by the cron; safe to run repeatedly.
 */
export async function measureDueRefreshes(supabase: SupabaseClient, runDay: string): Promise<MeasuredRefresh[]> {
  const cutoff = shiftDay(runDay, -MEASURE_AFTER_DAYS)
  const { data, error } = await supabase
    .from('seo_refreshes')
    .select('id, slug, kind, baseline, applied_at')
    .eq('status', 'applied')
    .not('applied_at', 'is', null)
    .lte('applied_at', `${cutoff}T23:59:59Z`)
  if (error) throw new Error(`seo_refreshes read: ${error.message}`)

  const settled: MeasuredRefresh[] = []
  for (const row of data || []) {
    const appliedDay = String(row.applied_at).slice(0, 10)
    const to = shiftDay(appliedDay, WINDOW_DAYS)
    const outcome = await snapshotPage(supabase, String(row.slug), appliedDay, to > runDay ? runDay : to)
    const baseline = (row.baseline as Snapshot | null) ?? null
    const { verdict, reason } = judge(row.kind === 'new' ? null : baseline, outcome)

    // An unsettled verdict is not a verdict. Leave the row 'applied' so the
    // next run tries again once there is enough data.
    const status = verdict === 'insufficient-data' ? 'applied' : 'measured'
    const now = new Date().toISOString()
    const { error: writeError } = await supabase
      .from('seo_refreshes')
      .update({ outcome, verdict: `${verdict}: ${reason}`, measured_at: now, status, updated_at: now })
      .eq('id', row.id)
    if (writeError) throw new Error(`seo_refreshes write: ${writeError.message}`)
    settled.push({ id: Number(row.id), slug: String(row.slug), verdict, reason })
  }
  return settled
}

/**
 * The pages worth spending a per-page API call on: everything with a refresh
 * on the record, plus the backlog's current targets. Never the whole sitemap —
 * Bing charges one request per page.
 */
export async function trackedSlugs(supabase: SupabaseClient, limit = 25): Promise<string[]> {
  const [refreshes, backlog] = await Promise.all([
    supabase.from('seo_refreshes').select('slug').order('created_at', { ascending: false }).limit(limit),
    supabase
      .from('seo_backlog')
      .select('target_slug')
      .in('status', ['todo', 'queued'])
      .not('target_slug', 'is', null)
      .limit(limit),
  ])
  const slugs = new Set<string>()
  for (const r of refreshes.data || []) if (r.slug) slugs.add(String(r.slug))
  for (const b of backlog.data || []) if (b.target_slug) slugs.add(String(b.target_slug))
  return [...slugs].slice(0, limit)
}
