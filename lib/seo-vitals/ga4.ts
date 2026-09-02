/**
 * GA4 Data API — one day's sessions, split two ways.
 *
 * `channels` is sessionDefaultChannelGroup (Organic Search, Organic Social…).
 * `sources` is sessionSource (google, reddit, facebook…) — the level at which
 * August 2026 actually broke: Facebook went 18,463 → 425 sessions inside a
 * channel group that grew.
 *
 * Totals come from a third, dimension-less report rather than by summing the
 * splits: a user who arrives from two sources is counted once there and twice
 * in the sum.
 */

import { BetaAnalyticsDataClient } from '@google-analytics/data'
import { loadServiceAccount } from './google-credentials'

export interface Ga4Slice {
  segment: string
  sessions: number
  users: number
  engagedSessions: number
  pageviews: number
}

export interface Ga4Day {
  total: Ga4Slice
  channels: Ga4Slice[]
  sources: Ga4Slice[]
}

const METRICS = [
  { name: 'sessions' },
  { name: 'activeUsers' },
  { name: 'engagedSessions' },
  { name: 'screenPageViews' },
]

function ga4Property(): string {
  const id = process.env.GA4_PROPERTY_ID
  if (!id) throw new Error('GA4_PROPERTY_ID not set')
  return /^\d+$/.test(id) ? `properties/${id}` : id
}

function toSlice(segment: string, values: Array<{ value?: string | null }> | null | undefined): Ga4Slice {
  const n = (i: number) => parseInt(values?.[i]?.value ?? '0', 10) || 0
  return { segment, sessions: n(0), users: n(1), engagedSessions: n(2), pageviews: n(3) }
}

export async function queryGa4Day(day: string): Promise<Ga4Day> {
  const key = loadServiceAccount()
  if (!key) throw new Error('GOOGLE_ANALYTICS_CREDENTIALS not set')

  const property = ga4Property()
  const client = new BetaAnalyticsDataClient({ credentials: key })
  const dateRanges = [{ startDate: day, endDate: day }]

  const run = async (dimension?: string, limit = 50) => {
    const [res] = await client.runReport({
      property,
      dateRanges,
      metrics: METRICS,
      dimensions: dimension ? [{ name: dimension }] : [],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit,
    })
    return res.rows || []
  }

  const [totalRows, channelRows, sourceRows] = await Promise.all([
    run(undefined, 1),
    run('sessionDefaultChannelGroup'),
    run('sessionSource', 25),
  ])

  return {
    total: toSlice('all', totalRows[0]?.metricValues),
    channels: channelRows.map((r) => toSlice(r.dimensionValues?.[0]?.value || '(not set)', r.metricValues)),
    sources: sourceRows.map((r) => toSlice(r.dimensionValues?.[0]?.value || '(not set)', r.metricValues)),
  }
}
