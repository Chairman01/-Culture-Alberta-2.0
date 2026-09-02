/**
 * Alert rules over the seo_daily series.
 *
 * Each rule compares the 7 most recent points of a series with the 7 before
 * them. "Most recent" is by the series' own days, not the calendar: Search
 * Console lags three days and GA4 one, and a rule must not read that gap as a
 * drop. A rule stays silent until both windows hold at least MIN_POINTS days,
 * so nothing fires on a fresh table.
 *
 * Thresholds are set from August 2026, the month this exists to catch early:
 * Search clicks −55%, desktop position +5.9, Facebook sessions −98%, all of
 * it found on the 31st.
 */

export interface SeoDailyRow {
  day: string
  source: string
  metric: string
  segment: string
  value: number
}

export type Severity = 'warning' | 'info'

export interface SeoAlert {
  rule: string
  severity: Severity
  message: string
  details?: Record<string, unknown>
}

const WINDOW = 7
const MIN_POINTS = 5

type Series = Map<string, SeoDailyRow[]> // key → rows, newest first

function seriesKey(source: string, metric: string, segment: string): string {
  return `${source}|${metric}|${segment}`
}

function indexSeries(rows: SeoDailyRow[]): Series {
  const map: Series = new Map()
  for (const r of rows) {
    const k = seriesKey(r.source, r.metric, r.segment)
    if (!map.has(k)) map.set(k, [])
    map.get(k)!.push(r)
  }
  for (const list of map.values()) list.sort((a, b) => (a.day < b.day ? 1 : a.day > b.day ? -1 : 0))
  return map
}

interface Windows {
  recent: number[]
  prior: number[]
  recentDays: [string, string]
  priorDays: [string, string]
}

function windows(series: Series, key: string): Windows | null {
  const rows = series.get(key)
  if (!rows) return null
  const recent = rows.slice(0, WINDOW)
  const prior = rows.slice(WINDOW, WINDOW * 2)
  if (recent.length < MIN_POINTS || prior.length < MIN_POINTS) return null
  return {
    recent: recent.map((r) => Number(r.value)),
    prior: prior.map((r) => Number(r.value)),
    recentDays: [recent[recent.length - 1].day, recent[0].day],
    priorDays: [prior[prior.length - 1].day, prior[0].day],
  }
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)
const avg = (xs: number[]) => (xs.length ? sum(xs) / xs.length : 0)
const pct = (recent: number, prior: number) => (prior > 0 ? ((recent - prior) / prior) * 100 : 0)
const round = (n: number, d = 1) => Math.round(n * 10 ** d) / 10 ** d

/**
 * Sum-based drop rule: fires when the recent window's total is more than
 * `dropPct` below the prior window's, and the prior window was big enough to
 * mean anything.
 */
function dropRule(
  series: Series,
  key: string,
  opts: { rule: string; label: string; dropPct: number; minPrior: number; severity?: Severity }
): SeoAlert | null {
  const w = windows(series, key)
  if (!w) return null
  const recent = sum(w.recent)
  const prior = sum(w.prior)
  if (prior < opts.minPrior) return null
  const change = pct(recent, prior)
  if (change > -opts.dropPct) return null
  return {
    rule: opts.rule,
    severity: opts.severity ?? 'warning',
    message: `${opts.label} fell ${round(Math.abs(change))}%: ${Math.round(recent).toLocaleString()} (${w.recentDays[0]} → ${w.recentDays[1]}) vs ${Math.round(prior).toLocaleString()} (${w.priorDays[0]} → ${w.priorDays[1]}).`,
    details: { recent, prior, changePct: round(change), recentDays: w.recentDays, priorDays: w.priorDays },
  }
}

export function evaluateRules(rows: SeoDailyRow[], collectorErrors: string[]): SeoAlert[] {
  const series = indexSeries(rows)
  const alerts: SeoAlert[] = []
  const push = (a: SeoAlert | null) => a && alerts.push(a)

  // --- Search Console ------------------------------------------------------
  push(dropRule(series, seriesKey('gsc_web', 'clicks', 'all'), {
    rule: 'search_clicks_drop', label: 'Google Search clicks', dropPct: 25, minPrior: 500,
  }))
  push(dropRule(series, seriesKey('gsc_discover', 'clicks', 'all'), {
    rule: 'discover_clicks_drop', label: 'Google Discover clicks', dropPct: 40, minPrior: 300,
  }))

  const pos = windows(series, seriesKey('gsc_web', 'position', 'desktop'))
  if (pos) {
    const recent = avg(pos.recent)
    const prior = avg(pos.prior)
    if (recent - prior >= 2) {
      alerts.push({
        rule: 'desktop_position_worse',
        severity: 'warning',
        message: `Average desktop Search position slipped from ${round(prior, 2)} to ${round(recent, 2)} (higher is worse). August 2026 went 7.54 → 13.44 this way.`,
        details: { recent: round(recent, 2), prior: round(prior, 2), recentDays: pos.recentDays, priorDays: pos.priorDays },
      })
    }
  }

  // --- GA4 -----------------------------------------------------------------
  push(dropRule(series, seriesKey('ga4', 'sessions', 'all'), {
    rule: 'sessions_drop', label: 'Total sessions', dropPct: 25, minPrior: 5000,
  }))
  // Every channel and every source with a meaningful prior week. Facebook's
  // 98% collapse in August 2026 lived inside a channel group that grew.
  for (const key of series.keys()) {
    const [source, metric, segment] = key.split('|')
    if (source !== 'ga4' || metric !== 'sessions') continue
    if (!segment.startsWith('channel:') && !segment.startsWith('source:')) continue
    push(dropRule(series, key, {
      rule: `referrer_collapse:${segment}`, label: `Sessions from ${segment.split(':')[1]}`, dropPct: 50, minPrior: 1000,
    }))
  }

  // --- Publishing mix ------------------------------------------------------
  const utility = series.get(seriesKey('publishing', 'guide_utility', 'all'))?.slice(0, WINDOW) || []
  const published = series.get(seriesKey('publishing', 'published', 'all'))?.slice(0, WINDOW) || []
  if (utility.length >= MIN_POINTS && published.length >= MIN_POINTS) {
    const u = sum(utility.map((r) => Number(r.value)))
    const p = sum(published.map((r) => Number(r.value)))
    if (u === 0 && p >= 7) {
      alerts.push({
        rule: 'utility_drought',
        severity: 'info',
        message: `${p} articles published in the last ${utility.length} recorded days and none of them a guide/utility piece — the format that earned $59.79 RPM in August 2026.`,
        details: { published: p, utility: u, days: utility.length },
      })
    }
  }

  // --- Site health ---------------------------------------------------------
  const newLong = series.get(seriesKey('site', 'new_long_titles_7d', 'all'))?.[0]
  if (newLong && Number(newLong.value) > 0) {
    alerts.push({
      rule: 'new_long_titles',
      severity: 'info',
      message: `${newLong.value} article(s) published in the last 7 days have a headline over 60 characters and no Search title set — Google is cutting them. Set one in the editor.`,
      details: { count: Number(newLong.value), asOf: newLong.day },
    })
  }
  const unstamped = series.get(seriesKey('site', 'indexnow_unstamped', 'all'))?.[0]
  if (unstamped && Number(unstamped.value) > 20) {
    alerts.push({
      rule: 'indexnow_backlog',
      severity: 'warning',
      message: `${unstamped.value} published articles have never been submitted to IndexNow. The nightly sweep should hold this near zero — check /api/cron/indexnow-sweep.`,
      details: { count: Number(unstamped.value), asOf: unstamped.day },
    })
  }

  // --- The collector itself ------------------------------------------------
  // A credential that silently stops working is exactly how the jobs sync
  // died before CRON_SECRET existed. An error (as opposed to a skip) is news.
  if (collectorErrors.length) {
    alerts.push({
      rule: 'collector_error',
      severity: 'warning',
      message: `seo-vitals collector error(s): ${collectorErrors.join(' | ')}`,
      details: { errors: collectorErrors },
    })
  }

  return alerts
}
