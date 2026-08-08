/**
 * Admin-protected jobs-sync trigger.
 * Called from the admin dashboard — JWT cookie auth (not the cron secret).
 * Runs the same sync logic as /api/cron/sync-jobs.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { syncAllJobs } from '@/lib/automation/jobs-sync'

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
  console.log('[admin/sync-jobs] Triggered by admin')

  try {
    // Employer boards aren't city-scoped, so this always syncs every board and
    // sorts the results into cities afterwards.
    const result = await syncAllJobs()

    return NextResponse.json({
      success: result.errors.length === 0,
      timestamp: new Date().toISOString(),
      result,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[admin/sync-jobs] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
