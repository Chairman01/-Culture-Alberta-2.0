/**
 * Jobs-email settings reached from a link in the email itself.
 *
 * The token in that link names one subscription row, so it stands in for a
 * sign-in: whoever holds it received the email. It can change only that row.
 *
 *   GET  ?token=…                              → { email, subscribed, frequency }
 *   POST { token, action: 'daily' | 'weekly' | 'stop' }
 *
 * The email links to a page that POSTs here rather than to a URL that changes
 * the setting itself, because mail scanners follow links: a GET that switched
 * someone to daily would do it without them ever clicking.
 */

import { NextRequest, NextResponse } from 'next/server'
import { decodeUnsubscribeToken } from '@/lib/newsletter/send-newsletter'
import {
  getJobsSubscriptionById, setJobsFrequency, stopJobsEmail, startJobsEmail, isJobsFrequency,
} from '@/lib/jobs-email/subscription'

export const dynamic = 'force-dynamic'

/** j***@example.com — enough to recognise, not enough to harvest. */
function maskEmail(email: string): string {
  const [name, domain] = email.split('@')
  if (!domain) return email
  return `${name.slice(0, 1)}${'*'.repeat(Math.max(1, Math.min(6, name.length - 1)))}@${domain}`
}

export async function GET(req: NextRequest) {
  const payload = decodeUnsubscribeToken(req.nextUrl.searchParams.get('token') ?? '')
  if (!payload) return NextResponse.json({ error: 'Invalid link' }, { status: 400 })

  const sub = await getJobsSubscriptionById(payload.id, payload.email)
  if (!sub) return NextResponse.json({ error: 'Invalid link' }, { status: 404 })
  return NextResponse.json({ email: maskEmail(sub.email), subscribed: sub.subscribed, frequency: sub.frequency })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const payload = decodeUnsubscribeToken(typeof body.token === 'string' ? body.token : '')
  if (!payload) return NextResponse.json({ error: 'Invalid link' }, { status: 400 })

  const sub = await getJobsSubscriptionById(payload.id, payload.email)
  if (!sub) return NextResponse.json({ error: 'Invalid link' }, { status: 404 })

  try {
    if (body.action === 'stop') {
      if (sub.subscribed) await stopJobsEmail(sub.id)
      return NextResponse.json({ email: maskEmail(sub.email), subscribed: false, frequency: sub.frequency })
    }
    if (isJobsFrequency(body.action)) {
      if (sub.subscribed) {
        await setJobsFrequency(sub.id, body.action)
      } else {
        // They stopped earlier and are turning it back on from the same page.
        await startJobsEmail({ email: sub.email, frequency: body.action, city: 'other-alberta' })
      }
      return NextResponse.json({ email: maskEmail(sub.email), subscribed: true, frequency: body.action })
    }
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err) {
    console.error('[jobs-email/settings]', err)
    return NextResponse.json({ error: 'Could not save' }, { status: 500 })
  }
}
