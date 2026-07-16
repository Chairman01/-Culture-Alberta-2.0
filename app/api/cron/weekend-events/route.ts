/**
 * Weekend Events Cron Endpoint
 *
 * Called automatically by Vercel Cron every Thursday at 8pm UTC (2pm MST).
 * Can also be triggered manually from the admin dashboard.
 *
 * Auth: Bearer {AUTOMATION_CRON_SECRET}
 *
 * Query params:
 *   ?city=calgary          → single city
 *   ?city=all              → all 7 cities (default)
 *   ?status=published      → publish immediately (default: draft)
 *
 * Examples:
 *   GET /api/cron/weekend-events               → all cities, draft
 *   GET /api/cron/weekend-events?city=calgary  → Calgary only, draft
 *   GET /api/cron/weekend-events?status=published → all cities, auto-publish
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  generateWeekendArticleForCity,
  generateWeekendArticlesForAllCities,
} from '@/lib/automation/weekend-events'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes — Vercel Pro supports up to 5min

const VALID_CITIES = [
  'calgary',
  'edmonton',
  'lethbridge',
  'medicine-hat',
  'grande-prairie',
  'fort-mcmurray',
  'red-deer',
]

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.AUTOMATION_CRON_SECRET
  if (!secret) {
    console.error('[weekend-events cron] AUTOMATION_CRON_SECRET is not set')
    return false
  }
  const authHeader = req.headers.get('authorization')
  return authHeader === `Bearer ${secret}`
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = req.nextUrl
  const city = searchParams.get('city') || 'all'
  const statusParam = searchParams.get('status')
  const publishStatus = statusParam === 'published' ? 'published' : 'draft'

  console.log(`[weekend-events cron] Starting — city: ${city}, status: ${publishStatus}`)

  try {
    if (city !== 'all') {
      if (!VALID_CITIES.includes(city)) {
        return NextResponse.json(
          { error: `Invalid city. Valid options: ${VALID_CITIES.join(', ')}, all` },
          { status: 400 }
        )
      }

      const result = await generateWeekendArticleForCity(city, publishStatus)

      return NextResponse.json({
        success: result.success,
        timestamp: new Date().toISOString(),
        publishStatus,
        results: [result],
        summary: {
          attempted: 1,
          succeeded: result.success ? 1 : 0,
          failed: result.success ? 0 : 1,
        },
      })
    }

    // All cities
    const results = await generateWeekendArticlesForAllCities(publishStatus)

    const succeeded = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length

    console.log(`[weekend-events cron] Complete — ${succeeded} succeeded, ${failed} failed`)

    return NextResponse.json({
      success: failed === 0,
      timestamp: new Date().toISOString(),
      publishStatus,
      results,
      summary: {
        attempted: results.length,
        succeeded,
        failed,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[weekend-events cron] Unhandled error:', message)
    return NextResponse.json(
      { error: 'Internal error', details: message },
      { status: 500 }
    )
  }
}

// Also accept POST for manual admin triggers
export async function POST(req: NextRequest) {
  return GET(req)
}
