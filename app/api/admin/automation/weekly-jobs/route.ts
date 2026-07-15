/**
 * Admin-protected weekly-jobs-article trigger.
 * Called from the admin dashboard — JWT cookie auth (not the cron secret).
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import {
  generateWeeklyJobsArticleForCity,
  generateWeeklyJobsArticlesForAllCities,
} from '@/lib/automation/weekly-jobs'
import { JOB_CITIES } from '@/lib/jobs'
import { JobCity } from '@/lib/types/job'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function POST(req: NextRequest) {
  const auth = requireAdmin(req)
  if (!auth.ok) return auth.response

  let body: { city?: string; status?: string } = {}
  try {
    body = await req.json()
  } catch {
    // no body — use defaults
  }

  const city = body.city || 'all'
  const publishStatus = body.status === 'published' ? 'published' : 'draft'

  if (city !== 'all' && !(JOB_CITIES as string[]).includes(city)) {
    return NextResponse.json(
      { error: `Invalid city. Valid: ${JOB_CITIES.join(', ')}, all` },
      { status: 400 }
    )
  }

  console.log(`[admin/weekly-jobs] Triggered by admin — city: ${city}, status: ${publishStatus}`)

  try {
    const results =
      city === 'all'
        ? await generateWeeklyJobsArticlesForAllCities(publishStatus)
        : [await generateWeeklyJobsArticleForCity(city as JobCity, publishStatus)]

    const succeeded = results.filter(r => r.success).length
    return NextResponse.json({
      success: results.every(r => r.success),
      timestamp: new Date().toISOString(),
      publishStatus,
      results,
      summary: { attempted: results.length, succeeded, failed: results.length - succeeded },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[admin/weekly-jobs] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
