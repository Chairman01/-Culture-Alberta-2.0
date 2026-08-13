import { NextRequest, NextResponse } from 'next/server'
import { isCronAuthorized } from '@/lib/cron-auth'
import { sendCityNewsletter, sendAllNewsletters } from '@/lib/newsletter/send-newsletter'
import type { NewsletterCity } from '@/lib/newsletter/template'

// 'alberta' is sendable by name (?city=alberta, or its card in the admin
// panel) but is deliberately excluded from sendAllNewsletters, so the "send
// every edition" path skips it. See the note there.
const VALID_CITIES: NewsletterCity[] = ['edmonton', 'calgary', 'lethbridge', 'medicine-hat', 'red-deer', 'grande-prairie', 'fort-mcmurray', 'alberta']

function isAuthorized(req: NextRequest): boolean {
  return isCronAuthorized(req, 'newsletter send', [process.env.NEWSLETTER_CRON_SECRET])
}

/**
 * HEAD /api/newsletter/send — always 405. Never sends.
 *
 * Next.js answers a HEAD request by running the GET handler and discarding the
 * body. On 2026-08-03 a `curl -X HEAD` against this route, intended purely as
 * an auth check, sent the full daily newsletter to 1,032 subscribers across all
 * seven cities. There is no such thing as a harmless probe of a send endpoint.
 *
 * Declaring HEAD explicitly stops Next.js falling through to GET, so the
 * cheapest and most tempting way to "just check if it's up" is now inert.
 */
export async function HEAD() {
  return new NextResponse(null, { status: 405, headers: { allow: 'GET, POST' } })
}

/**
 * GET /api/newsletter/send
 *
 * NOT ON A SCHEDULE. The daily cron entry was removed from vercel.json on
 * 2026-08-04 at the owner's request: the newsletter goes out only when a human
 * sends it from /admin/newsletter. Do not re-add a cron entry for this path
 * without asking — nothing else on this site emails real people.
 *
 * This handler remains for a deliberate manual trigger.
 * Authorization: Bearer {CRON_SECRET} (or NEWSLETTER_CRON_SECRET)
 *
 * Sending is still skipped for any city mailed inside the minimum interval —
 * see sendCityNewsletter — which the admin UI can override explicitly.
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
