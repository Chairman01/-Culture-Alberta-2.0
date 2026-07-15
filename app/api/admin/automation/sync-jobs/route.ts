/**
 * Admin-protected jobs-sync trigger.
 * Called from the admin dashboard — JWT cookie auth (not the cron secret).
 * Runs the same sync logic as /api/cron/sync-jobs.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { syncJobsForCity, syncAllJobs } from '@/lib/automation/jobs-sync'
import { JOB_CITIES } from '@/lib/jobs'
import { JobCity } from '@/lib/types/job'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function POST(req: NextRequest) {
  const auth = requireAdmin(req)
  if (!auth.ok) return auth.response

  let body: { city?: string; fixture?: boolean } = {}
  try {
    body = await req.json()
  } catch {
    // no body — use defaults
  }

  const city = body.city || 'all'
  const useFixture = body.fixture === true && process.env.NODE_ENV !== 'production'

  if (city !== 'all' && !(JOB_CITIES as string[]).includes(city)) {
    return NextResponse.json(
      { error: `Invalid city. Valid: ${JOB_CITIES.join(', ')}, all` },
      { status: 400 }
    )
  }

  console.log(`[admin/sync-jobs] Triggered by admin — city: ${city}`)

  try {
    const results =
      city === 'all'
        ? await syncAllJobs(useFixture)
        : [await syncJobsForCity(city as JobCity, useFixture)]

    const failed = results.filter(r => r.errors.length > 0).length
    return NextResponse.json({
      success: failed === 0,
      timestamp: new Date().toISOString(),
      results,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[admin/sync-jobs] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
