/**
 * Weekend Weather Cron Endpoint
 *
 * Called by Vercel Cron every Thursday (see vercel.json), just before the
 * weekend-events run, so both drafts land together for review.
 *
 * Auth: Bearer {AUTOMATION_CRON_SECRET}
 *
 * Query params:
 *   ?status=published → publish immediately (default: draft)
 */

import { NextRequest, NextResponse } from 'next/server'
import { generateWeekendWeatherArticle } from '@/lib/automation/weekend-weather'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.AUTOMATION_CRON_SECRET
  if (!secret) {
    console.error('[weekend-weather cron] AUTOMATION_CRON_SECRET is not set')
    return false
  }
  const authHeader = req.headers.get('authorization')
  return authHeader === `Bearer ${secret}`
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const statusParam = req.nextUrl.searchParams.get('status')
  const publishStatus = statusParam === 'published' ? 'published' : 'draft'

  console.log(`[weekend-weather cron] Starting — status: ${publishStatus}`)

  try {
    const result = await generateWeekendWeatherArticle(publishStatus)
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
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[weekend-weather cron] Unhandled error:', message)
    return NextResponse.json({ error: 'Internal error', details: message }, { status: 500 })
  }
}

// Also accept POST for manual triggers
export async function POST(req: NextRequest) {
  return GET(req)
}
