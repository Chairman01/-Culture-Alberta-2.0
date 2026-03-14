import { NextRequest, NextResponse } from 'next/server'
import { sendCityNewsletter, sendAllNewsletters } from '@/lib/newsletter/send-newsletter'
import type { NewsletterCity } from '@/lib/newsletter/template'

const VALID_CITIES: NewsletterCity[] = ['edmonton', 'calgary', 'lethbridge']

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.NEWSLETTER_CRON_SECRET
  if (!secret) return false
  const authHeader = req.headers.get('authorization')
  return authHeader === `Bearer ${secret}`
}

/**
 * GET /api/newsletter/send
 * Triggered by Vercel Cron (daily at 7 AM MST = 14:00 UTC)
 * Authorization: Bearer {NEWSLETTER_CRON_SECRET}
 */
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const cityParam = req.nextUrl.searchParams.get('city') as NewsletterCity | null

  try {
    if (cityParam) {
      if (!VALID_CITIES.includes(cityParam)) {
        return NextResponse.json({ error: `Invalid city. Valid: ${VALID_CITIES.join(', ')}` }, { status: 400 })
      }
      const result = await sendCityNewsletter(cityParam)
      return NextResponse.json({ success: true, result, timestamp: new Date().toISOString() })
    }

    // Send to all cities
    const results = await sendAllNewsletters()
    const totalSent = results.reduce((sum, r) => sum + r.sent, 0)
    const totalFailed = results.reduce((sum, r) => sum + r.failed, 0)

    return NextResponse.json({
      success: true,
      summary: { totalSent, totalFailed },
      results,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[newsletter/send] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/newsletter/send
 * Admin manual trigger — same Bearer auth
 * Body: { city?: 'edmonton' | 'calgary' | 'lethbridge' }
 */
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { city?: string } = {}
  try {
    body = await req.json()
  } catch {
    // no body — send all
  }

  const city = body.city as NewsletterCity | undefined

  if (city && !VALID_CITIES.includes(city)) {
    return NextResponse.json({ error: `Invalid city. Valid: ${VALID_CITIES.join(', ')}` }, { status: 400 })
  }

  try {
    if (city) {
      const result = await sendCityNewsletter(city)
      return NextResponse.json({ success: true, result, timestamp: new Date().toISOString() })
    }

    const results = await sendAllNewsletters()
    const totalSent = results.reduce((sum, r) => sum + r.sent, 0)
    const totalFailed = results.reduce((sum, r) => sum + r.failed, 0)

    return NextResponse.json({
      success: true,
      summary: { totalSent, totalFailed },
      results,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[newsletter/send] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}
