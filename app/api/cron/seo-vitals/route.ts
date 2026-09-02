/**
 * SEO vitals — the daily watch.
 *
 * August 2026: revenue fell 31% while traffic rose 5%. Google Search clicks
 * halved, Bing sessions halved, Facebook went 18,463 → 425 sessions, and
 * desktop position slid from page one to page two. All of it started in the
 * first week; all of it was found on the 31st, because none of the nine crons
 * in vercel.json watched anything. This one does.
 *
 * Every run:
 *   1. collects one day of Search Console (Search by device, Discover, Google
 *      News), one day of GA4 (total, per channel, per source), one day of
 *      publishing mix, and an as-of snapshot of site health;
 *   2. upserts each number into seo_daily as (day, source, metric, segment);
 *   3. evaluates lib/seo-vitals/rules.ts over the last 15 days;
 *   4. records new alerts in seo_alerts and, if ALERT_EMAIL_TO is set, mails them.
 *
 * Collectors are independent. One that lacks its credential reports
 * `skipped`; one that has it and fails reports `error` — and an error is
 * itself an alert, so a revoked key cannot stop the watch quietly.
 *
 *   ?dryRun=1     collect and evaluate, write nothing, send nothing
 *   ?day=YYYY-MM-DD   run as if today were that day (backfill / testing)
 *
 * Auth: Bearer {CRON_SECRET} (or AUTOMATION_CRON_SECRET) — see lib/cron-auth.
 */

import { NextRequest, NextResponse } from 'next/server'
import { isCronAuthorized } from '@/lib/cron-auth'
import { queryGsc, queryGscPages, queryGscQueries, queryGscPageQueries } from '@/lib/seo-vitals/gsc'
import { queryGa4Day } from '@/lib/seo-vitals/ga4'
import { bingPageQueryStats, bingPageStats, bingQueryStats, hasBingCredential } from '@/lib/seo-vitals/bing'
import { collectSite, getServiceClient, shiftDay } from '@/lib/seo-vitals/site'
import { measureDueRefreshes, slugToPath, toPath, trackedSlugs, type MeasuredRefresh } from '@/lib/seo-vitals/refresh'
import { evaluateRules, type SeoAlert, type SeoDailyRow } from '@/lib/seo-vitals/rules'
import { sendAlertEmail, type NotifyResult } from '@/lib/seo-vitals/notify'

export const dynamic = 'force-dynamic'
// Raised from 60 for the per-page pulls: Bing bills one request per page and
// they cannot be batched.
export const maxDuration = 120

// Search Console is final after ~3 days; GA4 after 1. Each collector is
// stamped with the day its numbers describe, not the day the cron ran.
const GSC_LAG_DAYS = 3
const GA4_LAG_DAYS = 1
const HISTORY_DAYS = 15
// How many articles get their own per-page query pull. The refresh loop only
// ever measures a handful at a time, and each one costs an API request per
// source.
const TRACKED_PAGE_LIMIT = 12
// Both APIs key pages by absolute URL; seo_query_daily stores the path.
const SITE_ORIGIN = 'https://www.culturealberta.com'

type CollectorStatus = { status: 'ok'; rows: number } | { status: 'skipped'; reason: string } | { status: 'error'; error: string }

interface SeoQueryRow {
  day: string
  source: string
  surface: string
  page: string
  query: string
  clicks: number
  impressions: number
  ctr: number
  position: number
}

/** Run promises a few at a time — 12 sequential API calls do not fit the budget. */
async function inBatches<T, R>(items: T[], size: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = []
  for (let i = 0; i < items.length; i += size) {
    out.push(...(await Promise.all(items.slice(i, i + size).map(fn))))
  }
  return out
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10)
}

function isIsoDay(s: string | null): s is string {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`))
}

export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req, 'seo-vitals cron')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const dryRun = req.nextUrl.searchParams.get('dryRun') === '1'
  const dayParam = req.nextUrl.searchParams.get('day')
  const runDay = isIsoDay(dayParam) ? dayParam : todayUtc()
  const gscDay = shiftDay(runDay, -GSC_LAG_DAYS)
  const ga4Day = shiftDay(runDay, -GA4_LAG_DAYS)
  const publishingDay = shiftDay(runDay, -1)

  const rows: SeoDailyRow[] = []
  const collectors: Record<string, CollectorStatus> = {}
  const errors: string[] = []
  const add = (day: string, source: string, metric: string, segment: string, value: number) => {
    if (Number.isFinite(value)) rows.push({ day, source, metric, segment, value })
  }

  // --- Search Console ------------------------------------------------------
  if (!process.env.GOOGLE_ANALYTICS_CREDENTIALS) {
    collectors.gsc = { status: 'skipped', reason: 'GOOGLE_ANALYTICS_CREDENTIALS not set' }
  } else {
    try {
      const before = rows.length
      const [webAll, webByDevice, discover, news] = await Promise.all([
        queryGsc(gscDay, 'web'),
        queryGsc(gscDay, 'web', ['device']),
        queryGsc(gscDay, 'discover'),
        queryGsc(gscDay, 'googleNews'),
      ])
      const record = (source: string, segment: string, r?: { clicks: number; impressions: number; ctr: number; position: number }) => {
        if (!r) return
        add(gscDay, source, 'clicks', segment, r.clicks)
        add(gscDay, source, 'impressions', segment, r.impressions)
        add(gscDay, source, 'ctr', segment, r.ctr)
        add(gscDay, source, 'position', segment, r.position)
      }
      record('gsc_web', 'all', webAll[0])
      for (const r of webByDevice) record('gsc_web', (r.keys[0] || 'unknown').toLowerCase(), r)
      record('gsc_discover', 'all', discover[0])
      record('gsc_news', 'all', news[0])
      collectors.gsc = { status: 'ok', rows: rows.length - before }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      collectors.gsc = { status: 'error', error: msg }
      errors.push(`gsc: ${msg}`)
    }
  }

  // --- GA4 -----------------------------------------------------------------
  if (!process.env.GOOGLE_ANALYTICS_CREDENTIALS || !process.env.GA4_PROPERTY_ID) {
    collectors.ga4 = { status: 'skipped', reason: 'GOOGLE_ANALYTICS_CREDENTIALS / GA4_PROPERTY_ID not set' }
  } else {
    try {
      const before = rows.length
      const day = await queryGa4Day(ga4Day)
      const record = (segment: string, s: typeof day.total) => {
        add(ga4Day, 'ga4', 'sessions', segment, s.sessions)
        add(ga4Day, 'ga4', 'users', segment, s.users)
        add(ga4Day, 'ga4', 'engaged_sessions', segment, s.engagedSessions)
        add(ga4Day, 'ga4', 'pageviews', segment, s.pageviews)
      }
      record('all', day.total)
      for (const c of day.channels) record(`channel:${c.segment}`, c)
      for (const s of day.sources) record(`source:${s.segment.toLowerCase()}`, s)
      collectors.ga4 = { status: 'ok', rows: rows.length - before }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      collectors.ga4 = { status: 'error', error: msg }
      errors.push(`ga4: ${msg}`)
    }
  }

  // --- Database-only collectors -------------------------------------------
  let supabase: ReturnType<typeof getServiceClient> | null = null
  try {
    supabase = getServiceClient()
    const before = rows.length
    const { publishing, snapshot } = await collectSite(supabase, publishingDay, runDay)
    for (const [metric, value] of Object.entries(publishing)) add(publishingDay, 'publishing', metric, 'all', value)
    for (const [metric, value] of Object.entries(snapshot)) add(runDay, 'site', metric, 'all', value)
    collectors.site = { status: 'ok', rows: rows.length - before }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    collectors.site = { status: 'error', error: msg }
    errors.push(`site: ${msg}`)
  }

  // --- Per-page and per-query -----------------------------------------------
  // The site-level series above can say traffic fell; only these can say which
  // page or which query moved, which is the only question a refresh asks.
  const queryRows: SeoQueryRow[] = []
  const addQuery = (r: SeoQueryRow) => {
    if (Number.isFinite(r.impressions)) queryRows.push(r)
  }
  const tracked = supabase ? await trackedSlugs(supabase, TRACKED_PAGE_LIMIT).catch(() => [] as string[]) : []

  if (!process.env.GOOGLE_ANALYTICS_CREDENTIALS) {
    collectors.gscPages = { status: 'skipped', reason: 'GOOGLE_ANALYTICS_CREDENTIALS not set' }
  } else {
    try {
      const before = queryRows.length
      const [pages, queries] = await Promise.all([queryGscPages(gscDay), queryGscQueries(gscDay)])
      for (const r of pages) {
        addQuery({ day: gscDay, source: 'gsc', surface: 'web', page: toPath(r.keys[0] || ''), query: '', clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position })
      }
      for (const r of queries) {
        addQuery({ day: gscDay, source: 'gsc', surface: 'web', page: '', query: r.keys[0] || '', clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position })
      }
      // The queries each tracked article ranks for — the row a retitle moves.
      await inBatches(tracked, 4, async (slug) => {
        const path = slugToPath(slug)
        const rowsForPage = await queryGscPageQueries(gscDay, `${SITE_ORIGIN}${path}`)
        for (const r of rowsForPage) {
          addQuery({ day: gscDay, source: 'gsc', surface: 'web', page: path, query: r.keys[0] || '', clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position })
        }
      })
      collectors.gscPages = { status: 'ok', rows: queryRows.length - before }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      collectors.gscPages = { status: 'error', error: msg }
      errors.push(`gscPages: ${msg}`)
    }
  }

  // Bing carries the high-RPM half of this site's search traffic and the
  // energy-rebate cluster outright. Its API reports a rolling window with a
  // date on every row, so one call backfills history the day a key is added.
  if (!hasBingCredential()) {
    collectors.bing = { status: 'skipped', reason: 'BING_WEBMASTER_API_KEY not set' }
  } else {
    try {
      const before = queryRows.length
      const [pages, queries] = await Promise.all([bingPageStats(), bingQueryStats()])
      const ctrOf = (clicks: number, impressions: number) => (impressions > 0 ? clicks / impressions : 0)
      for (const r of pages) {
        addQuery({ day: r.day, source: 'bing', surface: 'web', page: toPath(r.subject), query: '', clicks: r.clicks, impressions: r.impressions, ctr: ctrOf(r.clicks, r.impressions), position: r.position })
      }
      for (const r of queries) {
        addQuery({ day: r.day, source: 'bing', surface: 'web', page: '', query: r.subject, clicks: r.clicks, impressions: r.impressions, ctr: ctrOf(r.clicks, r.impressions), position: r.position })
      }
      await inBatches(tracked, 4, async (slug) => {
        const path = slugToPath(slug)
        const rowsForPage = await bingPageQueryStats(`${SITE_ORIGIN}${path}`)
        for (const r of rowsForPage) {
          addQuery({ day: r.day, source: 'bing', surface: 'web', page: path, query: r.subject, clicks: r.clicks, impressions: r.impressions, ctr: ctrOf(r.clicks, r.impressions), position: r.position })
        }
      })
      collectors.bing = { status: 'ok', rows: queryRows.length - before }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      collectors.bing = { status: 'error', error: msg }
      errors.push(`bing: ${msg}`)
    }
  }

  // --- Persist -------------------------------------------------------------
  let upserted = 0
  if (!dryRun && supabase && rows.length) {
    const { error } = await supabase
      .from('seo_daily')
      .upsert(rows.map((r) => ({ ...r, collected_at: new Date().toISOString() })), { onConflict: 'day,source,metric,segment' })
    if (error) {
      errors.push(`seo_daily upsert: ${error.message}`)
    } else {
      upserted = rows.length
    }
  }

  let queryUpserted = 0
  if (!dryRun && supabase && queryRows.length) {
    // One API pull can return the same (day, page, query) twice — a page row
    // and its query row share a key when the query is empty. Last write wins,
    // but Postgres rejects a batch that conflicts with itself, so dedupe here.
    const deduped = new Map<string, SeoQueryRow>()
    for (const r of queryRows) {
      if (!r.page && !r.query) continue
      deduped.set(`${r.day}|${r.source}|${r.surface}|${r.page}|${r.query}`, r)
    }
    const batch = [...deduped.values()].map((r) => ({ ...r, collected_at: new Date().toISOString() }))
    const { error } = await supabase.from('seo_query_daily').upsert(batch, { onConflict: 'day,source,surface,page,query' })
    if (error) errors.push(`seo_query_daily upsert: ${error.message}`)
    else queryUpserted = batch.length
  }

  // --- Settle refreshes old enough to judge ---------------------------------
  let measured: MeasuredRefresh[] = []
  if (!dryRun && supabase) {
    try {
      measured = await measureDueRefreshes(supabase, runDay)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      errors.push(`refreshes: ${msg}`)
    }
  }

  // --- Evaluate over history (stored rows + this run's, deduplicated) -------
  let history: SeoDailyRow[] = []
  if (supabase) {
    const { data, error } = await supabase
      .from('seo_daily')
      .select('day, source, metric, segment, value')
      .gte('day', shiftDay(runDay, -HISTORY_DAYS))
    if (error) errors.push(`seo_daily read: ${error.message}`)
    else history = (data || []).map((r) => ({ ...r, value: Number(r.value) }))
  }
  const seen = new Set(history.map((r) => `${r.day}|${r.source}|${r.metric}|${r.segment}`))
  for (const r of rows) {
    const k = `${r.day}|${r.source}|${r.metric}|${r.segment}`
    if (!seen.has(k)) {
      history.push(r)
      seen.add(k)
    }
  }
  const alerts = evaluateRules(history, errors)

  // A refresh that made a page worse is the one thing here worth an email on
  // the day it is found: it is both important and reversible.
  for (const m of measured) {
    if (m.verdict === 'worse') {
      alerts.push({
        rule: `refresh_worse:${m.slug}`,
        severity: 'warning',
        message: `The refresh of ${m.slug} came out worse — ${m.reason}. Consider reverting the title.`,
        details: { slug: m.slug, refreshId: m.id, verdict: m.verdict },
      })
    }
  }

  // --- Record new alerts, notify once each ----------------------------------
  let newAlerts: SeoAlert[] = alerts
  let notify: NotifyResult | 'skipped:dry-run' | `error:${string}` = dryRun ? 'skipped:dry-run' : 'skipped:no-alerts'
  if (!dryRun && supabase && alerts.length) {
    const { data: existing } = await supabase.from('seo_alerts').select('rule').eq('day', runDay)
    const already = new Set((existing || []).map((r) => r.rule))
    newAlerts = alerts.filter((a) => !already.has(a.rule))
    if (newAlerts.length) {
      const { error } = await supabase
        .from('seo_alerts')
        .upsert(newAlerts.map((a) => ({ day: runDay, rule: a.rule, severity: a.severity, message: a.message, details: a.details ?? null })), {
          onConflict: 'day,rule',
          ignoreDuplicates: true,
        })
      if (error) errors.push(`seo_alerts write: ${error.message}`)
      try {
        notify = await sendAlertEmail(newAlerts, runDay)
        if (notify === 'sent') {
          await supabase.from('seo_alerts').update({ notified: true }).eq('day', runDay).in('rule', newAlerts.map((a) => a.rule))
        }
      } catch (e) {
        notify = `error:${e instanceof Error ? e.message : String(e)}`
      }
    }
  }

  return NextResponse.json({
    ok: errors.length === 0,
    dryRun,
    runDay,
    days: { gsc: gscDay, ga4: ga4Day, publishing: publishingDay },
    collectors,
    rowsCollected: rows.length,
    rowsUpserted: upserted,
    queryRowsCollected: queryRows.length,
    queryRowsUpserted: queryUpserted,
    trackedPages: tracked.length,
    measured,
    historyRows: history.length,
    alerts,
    newAlerts: dryRun ? undefined : newAlerts,
    notify,
    errors,
  })
}
