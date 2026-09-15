/**
 * The newsletter send queue.
 *
 * GET    → what is queued, plus recent history
 * POST   → queue a send      { city, sendAt, customNote?, replace? }
 * DELETE → call one off      { id }
 *
 * None of these send anything. They only write rows that
 * /api/cron/newsletter-scheduled acts on later, which is what makes a queued
 * send cancellable right up until the cron claims it.
 *
 * Admin only, checked here rather than relied on from the path. Writers were
 * given access to /admin/newsletter to prepare editions, so anything reachable
 * from that page is reachable by a role that must never put mail in front of
 * the list — see the note in ../../../admin/newsletter/_actions.ts. RLS on
 * newsletter_schedules stops the anon key; it does not stop this file's
 * service-role client, so the guard below is the real gate.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createSchedule, cancelSchedule, listSchedules } from '@/lib/newsletter/schedule'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const auth = requireAdmin(request)
  if (!auth.ok) return auth.response

  try {
    const { pending, recent } = await listSchedules()
    return NextResponse.json({
      pending,
      recent,
      // The UI says plainly whether a queued send will actually go out, rather
      // than letting an editor trust a timer that cannot fire yet.
      armed: process.env.NEWSLETTER_SCHEDULED_SENDS === 'true',
    })
  } catch (error) {
    console.error('❌ Could not load the newsletter queue:', error)
    return NextResponse.json({ error: 'Could not load the send queue' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = requireAdmin(request)
  if (!auth.ok) return auth.response

  let body: { city?: string; sendAt?: string; customNote?: string; replace?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body' }, { status: 400 })
  }

  if (!body.city || !body.sendAt) {
    return NextResponse.json({ error: 'city and sendAt are both required' }, { status: 400 })
  }

  const outcome = await createSchedule({
    city: body.city,
    sendAt: body.sendAt,
    customNote: body.customNote,
    createdBy: auth.name || auth.username,
    replace: body.replace === true,
  })

  if (!outcome.ok) {
    return NextResponse.json({ error: outcome.error }, { status: 400 })
  }

  console.log(
    `📅 ${auth.username} queued the ${outcome.schedule.city} newsletter for ${outcome.schedule.sendAt}` +
    (outcome.replaced ? ' (replacing an earlier schedule)' : '')
  )

  return NextResponse.json({ ok: true, schedule: outcome.schedule, replaced: outcome.replaced })
}

export async function DELETE(request: NextRequest) {
  const auth = requireAdmin(request)
  if (!auth.ok) return auth.response

  let body: { id?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body' }, { status: 400 })
  }

  if (!body.id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  const outcome = await cancelSchedule(body.id, auth.name || auth.username)
  if (!outcome.ok) {
    return NextResponse.json({ error: outcome.error }, { status: 409 })
  }

  console.log(`⏹️ ${auth.username} cancelled the queued ${outcome.schedule.city} newsletter`)
  return NextResponse.json({ ok: true, schedule: outcome.schedule })
}
