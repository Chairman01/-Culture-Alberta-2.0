/**
 * One-shot endpoint to submit static tool pages via IndexNow.
 * POST /api/admin/submit-indexnow
 * Requires admin auth (JWT cookie).
 *
 * Call this once after setting INDEXNOW_KEY in Vercel, or any time
 * a tool page is added or significantly updated.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'

const BASE_URL = 'https://www.culturealberta.com'

const STATIC_TOOL_URLS = [
  `${BASE_URL}/tools`,
  `${BASE_URL}/tools/stat-holiday-calculator`,
  `${BASE_URL}/tools/alberta-rental-increase-calculator`,
  `${BASE_URL}/tools/aish-calculator`,
  `${BASE_URL}/tools/adap-calculator`,
  `${BASE_URL}/tools/calgary-vs-edmonton-cost-of-living`,
  `${BASE_URL}/tools/alberta-major-projects`,
]

export async function POST(request: NextRequest) {
  const auth = requireAdmin(request)
  if (!auth.ok) return auth.response

  const key = process.env.INDEXNOW_KEY
  if (!key) {
    return NextResponse.json(
      { error: 'INDEXNOW_KEY environment variable is not set. Add it to Vercel with value: culturealberta-indexnow-a4f8c2e9' },
      { status: 500 }
    )
  }

  try {
    const body = {
      host: 'www.culturealberta.com',
      key,
      keyLocation: `${BASE_URL}/${key}.txt`,
      urlList: STATIC_TOOL_URLS,
    }

    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const status = res.status
    const responseText = await res.text().catch(() => '')

    if (res.ok || status === 202) {
      return NextResponse.json({
        success: true,
        submitted: STATIC_TOOL_URLS,
        indexnowStatus: status,
      })
    }

    return NextResponse.json(
      { error: `IndexNow returned ${status}`, detail: responseText },
      { status: 502 }
    )
  } catch (err) {
    return NextResponse.json(
      { error: 'IndexNow request failed', detail: String(err) },
      { status: 500 }
    )
  }
}
