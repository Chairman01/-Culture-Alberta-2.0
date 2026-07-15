/**
 * Jobs Sync Cron Endpoint
 *
 * Called daily by Vercel Cron (13:00 UTC / 7am MDT) — see vercel.json.
 * Fetches Calgary + Edmonton listings from Adzuna, values-filters them,
 * upserts into the jobs table, and expires stale/past-due postings.
 *
 * Auth: Bearer {AUTOMATION_CRON_SECRET}
 *
 * Query params:
 *   ?city=calgary|edmonton   → single city (default: all)
 *   ?fixture=1               → use the checked-in sample data (non-production only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { syncJobsForCity, syncAllJobs } from '@/lib/automation/jobs-sync'
import { JOB_CITIES } from '@/lib/jobs'
import { JobCity } from '@/lib/types/job'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.AUTOMATION_CRON_SECRET
  if (!secret) {
    console.error('[sync-jobs cron] AUTOMATION_CRON_SECRET is not set')
    return false
  }
  return req.headers.get('authorization') === `Bearer ${secret}`
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = req.nextUrl
  const city = searchParams.get('city') || 'all'
  const useFixture =
    searchParams.get('fixture') === '1' && process.env.NODE_ENV !== 'production'

  console.log(`[sync-jobs cron] Starting — city: ${city}${useFixture ? ' (fixture)' : ''}`)

  try {
    if (city !== 'all') {
      if (!(JOB_CITIES as string[]).includes(city)) {
        return NextResponse.json(
          { error: `Invalid city. Valid options: ${JOB_CITIES.join(', ')}, all` },
          { status: 400 }
        )
      }
      const result = await syncJobsForCity(city as JobCity, useFixture)
      return NextResponse.json({
        success: result.errors.length === 0,
        timestamp: new Date().toISOString(),
        results: [result],
      })
    }

    const results = await syncAllJobs(useFixture)
    const failed = results.filter(r => r.errors.length > 0).length
    console.log(`[sync-jobs cron] Complete — ${results.length - failed} ok, ${failed} with errors`)

    return NextResponse.json({
      success: failed === 0,
      timestamp: new Date().toISOString(),
      results,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[sync-jobs cron] Unhandled error:', message)
    return NextResponse.json({ error: 'Internal error', details: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  return GET(req)
}
