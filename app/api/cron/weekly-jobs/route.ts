/**
 * Weekly Jobs Article Cron Endpoint
 *
 * Called by Vercel Cron Mondays 14:00 UTC (8am MDT) — see vercel.json.
 * Generates the "Who's Hiring in {City} This Week" article for each city
 * from the past week's jobs table rows.
 *
 * Auth: Bearer {AUTOMATION_CRON_SECRET}
 *
 * Query params:
 *   ?city=calgary|edmonton   → single city (default: all)
 *   ?status=published        → publish immediately (default: draft)
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  generateWeeklyJobsArticleForCity,
  generateWeeklyJobsArticlesForAllCities,
} from '@/lib/automation/weekly-jobs'
import { JOB_CITIES } from '@/lib/jobs'
import { JobCity } from '@/lib/types/job'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.AUTOMATION_CRON_SECRET
  if (!secret) {
    console.error('[weekly-jobs cron] AUTOMATION_CRON_SECRET is not set')
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
  const publishStatus = searchParams.get('status') === 'published' ? 'published' : 'draft'

  console.log(`[weekly-jobs cron] Starting — city: ${city}, status: ${publishStatus}`)

  try {
    const results =
      city === 'all'
        ? await generateWeeklyJobsArticlesForAllCities(publishStatus)
        : (JOB_CITIES as string[]).includes(city)
          ? [await generateWeeklyJobsArticleForCity(city as JobCity, publishStatus)]
          : null

    if (!results) {
      return NextResponse.json(
        { error: `Invalid city. Valid options: ${JOB_CITIES.join(', ')}, all` },
        { status: 400 }
      )
    }

    const succeeded = results.filter(r => r.success).length
    console.log(`[weekly-jobs cron] Complete — ${succeeded}/${results.length} succeeded`)

    return NextResponse.json({
      success: results.every(r => r.success),
      timestamp: new Date().toISOString(),
      publishStatus,
      results,
      summary: {
        attempted: results.length,
        succeeded,
        failed: results.length - succeeded,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[weekly-jobs cron] Unhandled error:', message)
    return NextResponse.json({ error: 'Internal error', details: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  return GET(req)
}
