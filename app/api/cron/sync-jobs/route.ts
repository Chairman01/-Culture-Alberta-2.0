/**
 * Jobs Sync Cron Endpoint
 *
 * Called daily by Vercel Cron (13:00 UTC / 7am MDT) — see vercel.json.
 * Reads every configured employer ATS board (lib/automation/ats/boards.ts),
 * keeps the Alberta postings, values-filters them, upserts into the jobs table,
 * and expires anything that has left its board.
 *
 * Not city-scoped: employer boards span cities, so the sync always runs every
 * board and sorts the results into cities afterwards.
 *
 * Auth: Bearer {CRON_SECRET} (or AUTOMATION_CRON_SECRET)
 */

import { NextRequest, NextResponse } from 'next/server'
import { isCronAuthorized } from '@/lib/cron-auth'
import { syncAllJobs } from '@/lib/automation/jobs-sync'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req, 'sync-jobs cron')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = req.nextUrl
  console.log('[sync-jobs cron] Starting')

  try {
    const result = await syncAllJobs()
    console.log(
      `[sync-jobs cron] Complete — ${result.inserted} new, ${result.updated} updated, ` +
      `${result.expired} expired, ${result.blocked} blocked, ${result.errors.length} errors`
    )

    return NextResponse.json({
      success: result.errors.length === 0,
      timestamp: new Date().toISOString(),
      result,
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
