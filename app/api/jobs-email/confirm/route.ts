/**
 * Confirms an email-only jobs sign-up.
 *
 *   POST { token }
 *
 * The token came from the confirmation email, so holding it shows the request
 * reached that inbox. POST rather than GET: mail scanners follow links, and a
 * link that subscribed on its own would confirm people who never clicked.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase-admin'
import { startJobsEmail, isJobsFrequency } from '@/lib/jobs-email/subscription'

export const dynamic = 'force-dynamic'

const VALID_FOR_MS = 7 * 24 * 60 * 60 * 1000
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const token = typeof body.token === 'string' ? body.token : ''
  if (!UUID.test(token)) return NextResponse.json({ error: 'Invalid link' }, { status: 400 })

  const supabase = getServiceClient()
  const { data: row } = await supabase
    .from('jobs_email_confirmations')
    .select('token, email, city, frequency, signup_path, created_at, confirmed_at')
    .eq('token', token)
    .maybeSingle()

  if (!row) return NextResponse.json({ error: 'Invalid link' }, { status: 404 })
  if (Date.now() - new Date(row.created_at).getTime() > VALID_FOR_MS) {
    return NextResponse.json({ error: 'This link has expired. Sign up again from the job board.' }, { status: 410 })
  }

  const frequency = isJobsFrequency(row.frequency) ? row.frequency : 'weekly'
  try {
    // Confirming twice is harmless: the second call finds them subscribed.
    await startJobsEmail({
      email: row.email,
      frequency,
      city: row.city,
      signupSource: 'jobs-alert',
      signupPath: row.signup_path ?? undefined,
    })
    if (!row.confirmed_at) {
      await supabase
        .from('jobs_email_confirmations')
        .update({ confirmed_at: new Date().toISOString() })
        .eq('token', token)
    }
    return NextResponse.json({ ok: true, frequency })
  } catch (err) {
    console.error('[jobs-email/confirm]', err)
    return NextResponse.json({ error: 'Could not confirm. Try again in a moment.' }, { status: 500 })
  }
}
