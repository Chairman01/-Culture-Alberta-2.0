/**
 * Scheduled newsletter sends.
 *
 * Called by Vercel Cron every five minutes (see vercel.json). Sends any edition
 * an editor queued in /admin/newsletter whose time has come.
 *
 * Auth: Bearer {CRON_SECRET} (or NEWSLETTER_CRON_SECRET)
 *
 * ── READ THIS BEFORE TOUCHING IT ─────────────────────────────────────────────
 *
 * This is the only automated path to the mailing list — roughly 1,200 real
 * people across the editions. It exists because the owner asked for a timed
 * send on 2026-09-15.
 *
 * It is NOT a revival of the old daily auto-send. That cron was removed on
 * 2026-08-04 and is not coming back. This route mails nobody unless a human
 * explicitly queued a row, for a time they chose. An empty queue is the normal
 * state and `{ ran: 0 }` is the normal response.
 *
 * SHIPS INERT. Queuing, cancelling and the whole admin UI work as soon as this
 * deploys, but nothing is actually mailed until NEWSLETTER_SCHEDULED_SENDS is
 * set to 'true' in Vercel — the same arming pattern as SOCIAL_AUTOPOST. Until
 * then a due schedule is left pending and the response says so, so the feature
 * can be deployed, inspected and trusted before it is allowed to send. Arming
 * it is a deliberate act by the owner, in the Vercel dashboard, not a side
 * effect of a deploy.
 *
 * Every send goes through sendCityNewsletter WITHOUT `force`, so the 20-hour
 * minimum-interval guard applies to a scheduled send exactly as it does to a
 * manual one.
 */

import { NextRequest, NextResponse } from 'next/server'
import { isCronAuthorized } from '@/lib/cron-auth'
import { countDueSchedules, runDueSchedules } from '@/lib/newsletter/schedule'

// Sending batches 50 recipients per Resend call with a pause between batches,
// and several editions can come due together. runDueSchedules keeps its own
// budget well inside this.
export const maxDuration = 300

export const dynamic = 'force-dynamic'

/** Set to 'true' in Vercel to let this route actually mail people. */
function sendingIsArmed(): boolean {
  return process.env.NEWSLETTER_SCHEDULED_SENDS === 'true'
}

/**
 * HEAD /api/cron/newsletter-scheduled — always 405. Never sends.
 *
 * Next.js answers HEAD by running GET and discarding the body. On 2026-08-03 a
 * `curl -X HEAD` against the send endpoint, intended purely as an auth check,
 * mailed the full newsletter to 1,032 subscribers. Declaring HEAD explicitly
 * stops that fall-through, so the cheapest and most tempting way to "just check
 * if it's up" is inert. There is no such thing as a harmless probe of a send
 * path.
 */
export async function HEAD() {
  return new NextResponse(null, { status: 405, headers: { allow: 'GET' } })
}

export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req, 'newsletter-scheduled cron', [process.env.NEWSLETTER_CRON_SECRET])) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Without the service key the queue is invisible — the table has RLS on and
  // no policies — so every run would report an empty queue and a scheduled
  // edition would silently never go out. Fail loudly instead.
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[newsletter-scheduled cron] SUPABASE_SERVICE_ROLE_KEY is not set')
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY is not configured' }, { status: 500 })
  }

  if (!sendingIsArmed()) {
    // Deliberately does not claim or cancel anything: the schedules stay
    // pending, so arming the flag later sends them rather than losing them.
    const due = await countDueSchedules()
    if (due > 0) {
      console.warn(
        `[newsletter-scheduled cron] ${due} schedule(s) are due but sending is not armed — ` +
        `set NEWSLETTER_SCHEDULED_SENDS=true in Vercel to enable scheduled sends`
      )
    }
    return NextResponse.json({
      success: true,
      armed: false,
      due,
      ran: 0,
      note: 'Scheduled sending is not armed. Set NEWSLETTER_SCHEDULED_SENDS=true to enable it.',
      timestamp: new Date().toISOString(),
    })
  }

  try {
    const outcomes = await runDueSchedules()

    if (outcomes.length === 0) {
      return NextResponse.json({ success: true, armed: true, ran: 0, timestamp: new Date().toISOString() })
    }

    for (const outcome of outcomes) {
      console.log(
        `[newsletter-scheduled cron] ${outcome.city}: ${outcome.status}, ` +
        `sent ${outcome.sent}, failed ${outcome.failed}, skipped ${outcome.skipped}` +
        (outcome.errors.length ? ` — ${outcome.errors.join('; ')}` : '')
      )
    }

    return NextResponse.json({
      success: true,
      armed: true,
      ran: outcomes.length,
      outcomes,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[newsletter-scheduled cron] run failed:', error)
    return NextResponse.json(
      { error: 'Scheduled send run failed', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    )
  }
}
