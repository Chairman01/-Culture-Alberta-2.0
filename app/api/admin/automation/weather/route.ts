/**
 * Admin-protected weekend-weather-article trigger.
 * Called from the admin dashboard — JWT cookie auth (not the cron secret).
 * Generates ONE province-wide article covering all seven cities.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { generateWeekendWeatherArticle } from '@/lib/automation/weekend-weather'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function POST(req: NextRequest) {
  const auth = requireAdmin(req)
  if (!auth.ok) return auth.response

  let body: { status?: string } = {}
  try {
    body = await req.json()
  } catch {
    // no body — use defaults
  }

  const publishStatus = body.status === 'published' ? 'published' : 'draft'

  console.log(`[admin/weather] Triggered by admin — status: ${publishStatus}`)

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
    console.error('[admin/weather] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
