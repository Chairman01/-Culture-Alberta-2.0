/**
 * Google Search Console — Search Analytics API, one day at a time.
 *
 * Search Console data is provisional for about two days and final after
 * roughly three, so the cron asks for `today - 3` and gets stable numbers.
 *
 * Surfaces: 'web' (Search), 'discover' (Google Discover), 'googleNews'
 * (news.google.com). Discover and Google News do not accept the `device`
 * dimension, so only Search is split by device — desktop position is the
 * series that showed the August 2026 collapse (7.54 → 13.44).
 */

import { JWT } from 'google-auth-library'
import { loadServiceAccount } from './google-credentials'

export type GscSurface = 'web' | 'discover' | 'googleNews'

export interface GscRow {
  keys: string[]
  clicks: number
  impressions: number
  ctr: number
  position: number
}

const SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly'

export function gscSiteUrl(): string {
  return process.env.GSC_SITE_URL || 'sc-domain:culturealberta.com'
}

export interface GscQueryOptions {
  /** Default 100. Raised for page/query pulls, where the tail is the point. */
  rowLimit?: number
  /** Restrict to one page URL — used to pull the queries for a tracked article. */
  page?: string
}

export async function queryGsc(
  day: string,
  surface: GscSurface,
  dimensions: string[] = [],
  opts: GscQueryOptions = {},
): Promise<GscRow[]> {
  const key = loadServiceAccount()
  if (!key) throw new Error('GOOGLE_ANALYTICS_CREDENTIALS not set')

  const jwt = new JWT({ email: key.client_email, key: key.private_key, scopes: [SCOPE] })
  const { token } = await jwt.getAccessToken()
  if (!token) throw new Error('GSC: could not obtain an access token')

  const url = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(gscSiteUrl())}/searchAnalytics/query`
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      startDate: day,
      endDate: day,
      dimensions,
      type: surface,
      rowLimit: opts.rowLimit ?? 100,
      ...(opts.page
        ? { dimensionFilterGroups: [{ filters: [{ dimension: 'page', operator: 'equals', expression: opts.page }] }] }
        : {}),
    }),
  })
  if (!res.ok) {
    throw new Error(`GSC ${surface} ${res.status}: ${(await res.text()).slice(0, 300)}`)
  }

  const json = await res.json()
  return ((json.rows || []) as any[]).map((r) => ({
    keys: Array.isArray(r.keys) ? r.keys.map(String) : [],
    clicks: Number(r.clicks) || 0,
    impressions: Number(r.impressions) || 0,
    ctr: Number(r.ctr) || 0,
    position: Number(r.position) || 0,
  }))
}

// ---------------------------------------------------------------------------
// The per-URL and per-query pulls the refresh loop measures against. The
// site-level series in seo_daily can say traffic fell; only these can say
// which page or which query moved, which is the whole question a refresh asks.
// ---------------------------------------------------------------------------

/** The site's top pages for one day. */
export function queryGscPages(day: string, rowLimit = 250): Promise<GscRow[]> {
  return queryGsc(day, 'web', ['page'], { rowLimit })
}

/** The site's top queries for one day. */
export function queryGscQueries(day: string, rowLimit = 250): Promise<GscRow[]> {
  return queryGsc(day, 'web', ['query'], { rowLimit })
}

/** The queries that led to one page, for one day. */
export function queryGscPageQueries(day: string, page: string, rowLimit = 50): Promise<GscRow[]> {
  return queryGsc(day, 'web', ['query'], { rowLimit, page })
}
