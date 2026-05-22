/**
 * Admin-protected automation trigger.
 * Called by the admin dashboard UI — uses JWT cookie auth (not the cron secret).
 * Internally runs the same weekend events generation logic as the cron.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import {
  generateWeekendArticleForCity,
  generateWeekendArticlesForAllCities,
} from '@/lib/automation/weekend-events'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const VALID_CITIES = [
  'calgary',
  'edmonton',
  'lethbridge',
  'medicine-hat',
  'grande-prairie',
  'fort-mcmurray',
  'all',
]

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

  if (!VALID_CITIES.includes(city)) {
    return NextResponse.json(
      { error: `Invalid city. Valid: ${VALID_CITIES.join(', ')}` },
      { status: 400 }
    )
  }

  console.log(`[admin/automation] Triggered by admin — city: ${city}, status: ${publishStatus}`)

  try {
    if (city !== 'all') {
      const result = await generateWeekendArticleForCity(city, publishStatus as 'draft' | 'published')
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

    const results = await generateWeekendArticlesForAllCities(publishStatus as 'draft' | 'published')
    const succeeded = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length

    return NextResponse.json({
      success: failed === 0,
      timestamp: new Date().toISOString(),
      publishStatus,
      results,
      summary: { attempted: results.length, succeeded, failed },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[admin/automation] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
