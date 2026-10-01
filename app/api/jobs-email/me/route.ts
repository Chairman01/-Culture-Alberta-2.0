/**
 * The signed-in member's own jobs-email setting.
 *
 *   GET    → { subscribed, frequency }
 *   POST   { frequency: 'daily' | 'weekly' }   turn it on, or change how often
 *   DELETE                                       stop it
 *
 * Bearer token required, and the address always comes from that session — a
 * caller can only ever change the subscription for their own email.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { toNewsletterCity } from '@/lib/newsletter-cities'
import {
  getJobsSubscriptionByEmail, startJobsEmail, stopJobsEmail, isJobsFrequency,
} from '@/lib/jobs-email/subscription'

export const dynamic = 'force-dynamic'

async function sessionUser(req: NextRequest) {
  const header = req.headers.get('authorization') || ''
  const token = header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : ''
  if (!token) return null
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data?.user?.email) return null
  return data.user
}

export async function GET(req: NextRequest) {
  const user = await sessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sub = await getJobsSubscriptionByEmail(user.email!)
  return NextResponse.json({
    subscribed: sub?.subscribed ?? false,
    frequency: sub?.frequency ?? 'daily',
  })
}

export async function POST(req: NextRequest) {
  const user = await sessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  if (!isJobsFrequency(body.frequency)) {
    return NextResponse.json({ error: 'frequency must be daily or weekly' }, { status: 400 })
  }

  try {
    const city = toNewsletterCity(String((user.user_metadata as { city?: string } | null)?.city ?? ''))
    const sub = await startJobsEmail({
      email: user.email!,
      frequency: body.frequency,
      city,
      signupSource: 'jobs-board',
      signupPath: typeof body.path === 'string' ? body.path.slice(0, 200) : '/jobs',
    })
    // A bounced address is not re-added; the response looks the same so the
    // form behaves normally either way.
    return NextResponse.json({ subscribed: true, frequency: sub?.frequency ?? body.frequency })
  } catch (err) {
    console.error('[jobs-email/me] start failed:', err)
    return NextResponse.json({ error: 'Could not save' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const user = await sessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const sub = await getJobsSubscriptionByEmail(user.email!)
    if (sub?.subscribed) await stopJobsEmail(sub.id)
    return NextResponse.json({ subscribed: false })
  } catch (err) {
    console.error('[jobs-email/me] stop failed:', err)
    return NextResponse.json({ error: 'Could not save' }, { status: 500 })
  }
}
