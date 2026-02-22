/**
 * Google Analytics 4 Data API integration for trending articles.
 * Fetches page views by path from GA4; falls back to Supabase when unavailable.
 *
 * Setup:
 * 1. Create a GA4 property and note the numeric property ID (Admin > Property Settings)
 * 2. Enable Analytics Data API in Google Cloud Console
 * 3. Create a service account with access to the GA4 property
 * 4. Add these env vars:
 *    - GA4_PROPERTY_ID: Numeric ID (e.g. "123456789")
 *    - GOOGLE_APPLICATION_CREDENTIALS: Path to service account JSON, OR
 *    - GOOGLE_ANALYTICS_CREDENTIALS: Base64-encoded service account JSON (for Vercel/serverless)
 */

import { BetaAnalyticsDataClient } from '@google-analytics/data'

export interface PageViewCount {
  path: string
  count: number
}

let client: BetaAnalyticsDataClient | null = null

function getClient(): BetaAnalyticsDataClient | null {
  if (client) return client

  const credentials = process.env.GOOGLE_ANALYTICS_CREDENTIALS
  if (credentials) {
    try {
      const key = JSON.parse(Buffer.from(credentials, 'base64').toString('utf-8'))
      client = new BetaAnalyticsDataClient({ credentials: key })
      return client
    } catch (e) {
      console.warn('GA4: Invalid GOOGLE_ANALYTICS_CREDENTIALS', e)
      return null
    }
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    client = new BetaAnalyticsDataClient()
    return client
  }

  return null
}

/**
 * Fetch most viewed article paths from GA4 in the last N days.
 * Only returns paths matching /articles/*.
 */
export async function getMostViewedArticlePathsFromGA4(
  days: number = 7,
  limit: number = 20
): Promise<PageViewCount[]> {
  const propertyId = process.env.GA4_PROPERTY_ID
  if (!propertyId) {
    return []
  }

  const analyticsClient = getClient()
  if (!analyticsClient) {
    return []
  }

  const property = propertyId.match(/^\d+$/) ? `properties/${propertyId}` : propertyId
  if (!property.startsWith('properties/')) {
    return []
  }

  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - days)

  const GA4_TIMEOUT_MS = 2500 // Fail fast if GA4 is slow; caller falls back to Supabase

  try {
    const runReportPromise = analyticsClient.runReport({
      property,
      dimensions: [{ name: 'pagePath' }],
      metrics: [{ name: 'screenPageViews' }],
      dateRanges: [
        {
          startDate: start.toISOString().split('T')[0].replace(/-/g, ''),
          endDate: end.toISOString().split('T')[0].replace(/-/g, ''),
        },
      ],
      dimensionFilter: {
        filter: {
          fieldName: 'pagePath',
          stringFilter: { matchType: 'BEGINS_WITH', value: '/articles/' },
        },
      },
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
      limit: limit || 20,
    })

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('GA4 timeout')), GA4_TIMEOUT_MS)
    )
    const [response] = await Promise.race([runReportPromise, timeoutPromise])

    if (!response.rows || response.rows.length === 0) {
      return []
    }

    return response.rows.map((row) => {
      const path = (row.dimensionValues?.[0]?.value ?? '').trim().replace(/\/$/, '')
      const count = parseInt(row.metricValues?.[0]?.value ?? '0', 10)
      return { path: path.toLowerCase(), count }
    }).filter((p) => p.path)
  } catch (error) {
    console.warn('GA4 runReport error:', error)
    return []
  }
}
