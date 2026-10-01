/**
 * The jobs email, on a schedule.
 *
 * Called by Vercel Cron once a day, half an hour after the morning jobs sync
 * (see vercel.json), so what goes out is that morning's new postings.
 *
 * Auth: Bearer {CRON_SECRET}
 *
 * ── READ THIS BEFORE TOUCHING IT ─────────────────────────────────────────────
 *
 * SHIPS INERT. Nothing is mailed until JOBS_EMAIL_SENDS is 'true' in Vercel and
 * CRM_MAILING_ADDRESS holds the postal address CASL requires in every email.
 * Until then a run reports who WOULD be mailed and sends nothing. Arming it is
 * the owner's act, in the Vercel dashboard — the same pattern as the scheduled
 * newsletter and the social autopost.
 *
 * It only ever reaches subscribers whose topics include 'jobs'. See
 * lib/jobs-email/send.ts for the guards.
 *
 * Do not call this to "check it works". Once armed, a call is a send. Review
 * /api/admin/jobs-email/preview instead — it builds the same emails and has no
 * way to send them.
 */

import { NextRequest, NextResponse } from 'next/server'
import { isCronAuthorized } from '@/lib/cron-auth'
import { runJobsEmail } from '@/lib/jobs-email/send'

export const maxDuration = 120
export const dynamic = 'force-dynamic'

/**
 * HEAD — always 405. Next.js answers HEAD by running GET and discarding the
 * body, which is how a "harmless" probe once mailed 1,032 subscribers.
 */
export async function HEAD() {
  return new NextResponse(null, { status: 405, headers: { allow: 'GET' } })
}

export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req, 'jobs-email cron')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await runJobsEmail()
    console.log(
      `[jobs-email cron] armed=${result.armed} due=${result.due} wouldSend=${result.wouldSend} ` +
      `sent=${result.sent} failed=${result.failed}${result.reason ? ` (${result.reason})` : ''}`
    )
    return NextResponse.json({ timestamp: new Date().toISOString(), ...result })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[jobs-email cron] Unhandled error:', message)
    return NextResponse.json({ error: 'Internal error', details: message }, { status: 500 })
  }
}
