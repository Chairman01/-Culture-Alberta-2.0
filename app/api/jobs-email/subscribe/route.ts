/**
 * Email-only sign-up for the jobs email: no account needed.
 *
 *   POST { email, city, frequency: 'daily' | 'weekly', path? }
 *
 * This does not subscribe anyone. It records the request and emails that
 * address one confirmation link; the subscription starts only when the owner
 * of the address confirms. Typing someone else's address into the form gets
 * them a single "did you ask for this?" email and nothing after it.
 *
 * Guards, because this is a public form that causes an email to be sent:
 *  - It is off until the jobs email itself is armed (JOBS_EMAIL_SENDS), so
 *    nobody is asked to confirm a list that isn't sending yet.
 *  - One confirmation email per address per 24 hours.
 *  - Addresses that have hard-bounced are never mailed again.
 *  - The response is the same whatever happened, so the form can't be used to
 *    find out who is already subscribed.
 */

import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { getServiceClient } from '@/lib/supabase-admin'
import { toNewsletterCity } from '@/lib/newsletter-cities'
import { jobsEmailArmed, jobsEmailMailingAddress } from '@/lib/jobs-email/armed'
import { getJobsSubscriptionByEmail, isJobsFrequency } from '@/lib/jobs-email/subscription'

export const dynamic = 'force-dynamic'

const SITE_URL = 'https://www.culturealberta.com'
const FROM = 'Culture Alberta Jobs <news@culturemedia.ca>'
const OK = { ok: true, message: 'Check your email to confirm.' }

function esc(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export async function POST(req: NextRequest) {
  if (!jobsEmailArmed().armed) {
    return NextResponse.json({ error: 'Job emails are not available yet.' }, { status: 503 })
  }

  const body = await req.json().catch(() => ({}))
  const email = typeof body.email === 'string' ? body.email.trim() : ''
  if (!/^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(email) || email.length > 254) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })
  }
  if (!isJobsFrequency(body.frequency)) {
    return NextResponse.json({ error: 'Choose daily or weekly.' }, { status: 400 })
  }
  const city = toNewsletterCity(typeof body.city === 'string' ? body.city : '')
  const supabase = getServiceClient()

  try {
    const { data: bounced } = await supabase
      .from('newsletter_email_events')
      .select('id')
      .eq('email', email)
      .eq('event_type', 'bounced')
      .limit(1)
      .maybeSingle()
    if (bounced) return NextResponse.json(OK)

    const existing = await getJobsSubscriptionByEmail(email)
    if (existing?.subscribed) return NextResponse.json(OK)

    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: recent } = await supabase
      .from('jobs_email_confirmations')
      .select('token')
      .ilike('email', email)
      .gte('created_at', dayAgo)
      .limit(1)
      .maybeSingle()
    if (recent) return NextResponse.json(OK)

    const { data: row, error } = await supabase
      .from('jobs_email_confirmations')
      .insert({
        email,
        city,
        frequency: body.frequency,
        signup_path: typeof body.path === 'string' ? body.path.slice(0, 200) : null,
      })
      .select('token')
      .single()
    if (error || !row) throw new Error(error?.message ?? 'insert failed')

    const confirmUrl = `${SITE_URL}/jobs/email/confirm?token=${row.token}`
    const cadence = body.frequency === 'daily' ? 'at most one email a day' : 'one email a week'
    await new Resend(process.env.RESEND_API_KEY).emails.send({
      from: FROM,
      to: email,
      subject: 'Confirm your Culture Alberta jobs email',
      html: `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f4f4;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;">
  <tr><td align="center" style="padding:24px 12px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#ffffff;border-radius:8px;">
      <tr><td style="padding:28px;">
        <p style="margin:0;font-size:14px;font-weight:900;color:#0a0a0a;">Culture Alberta Jobs</p>
        <h1 style="margin:14px 0 8px 0;font-size:22px;color:#0a0a0a;">Confirm your jobs email</h1>
        <p style="margin:0;font-size:15px;line-height:1.6;color:#333;">
          Someone, hopefully you, asked us to email new Alberta jobs to this address: ${cadence}, and only when there is something new.
        </p>
        <p style="margin:22px 0;">
          <a href="${esc(confirmUrl)}" style="display:inline-block;background:#0b57d0;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:12px 22px;border-radius:6px;">Yes, email me new jobs</a>
        </p>
        <p style="margin:0;font-size:13px;line-height:1.6;color:#666;">
          If this wasn't you, ignore this email. You won't hear from us again and nothing has been subscribed.
        </p>
      </td></tr>
      <tr><td style="background:#f9f9f9;padding:18px 28px;border-top:1px solid #e8e8e8;border-radius:0 0 8px 8px;">
        <p style="margin:0;font-size:11px;color:#999;line-height:1.6;">
          Sent by Culture Alberta, a Culture Media publication &middot; ${esc(jobsEmailMailingAddress() ?? '')} &middot; hello@culturemedia.ca
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>`,
    })

    return NextResponse.json(OK)
  } catch (err) {
    console.error('[jobs-email/subscribe]', err)
    return NextResponse.json({ error: 'That did not work. Try again in a moment.' }, { status: 500 })
  }
}
