/**
 * Daily Poll Rotation Cron Endpoint
 *
 * Called by Vercel Cron every morning (see vercel.json). Closes the current
 * active poll and activates the next approved question from the bank.
 *
 * Auth: Bearer {AUTOMATION_CRON_SECRET}
 *
 * Safety: if the approved queue is empty, the current poll STAYS active
 * (a stale question beats an empty card) and the response flags needsRefill.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.AUTOMATION_CRON_SECRET
  if (!secret) {
    console.error('[rotate-poll cron] AUTOMATION_CRON_SECRET is not set')
    return false
  }
  const authHeader = req.headers.get('authorization')
  return authHeader === `Bearer ${secret}`
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Without the service key the anon fallback can't see the approved queue and
  // rotation would silently report "empty" — fail loudly instead.
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[rotate-poll cron] SUPABASE_SERVICE_ROLE_KEY is not set')
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY is not configured' }, { status: 500 })
  }

  try {
    const supabase = getServiceClient()

    const [{ data: active }, { data: next }, { count: queueCount }] = await Promise.all([
      supabase.from('polls').select('id, question, activated_at').eq('status', 'active').maybeSingle(),
      supabase
        .from('polls')
        .select('id, question')
        .eq('status', 'approved')
        .order('sort_order')
        .order('created_at')
        .limit(1)
        .maybeSingle(),
      supabase.from('polls').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
    ])

    if (!next) {
      console.warn('[rotate-poll cron] approved queue is empty — keeping current poll active')
      return NextResponse.json({
        rotated: false,
        needsRefill: true,
        activeQuestion: active?.question ?? null,
        queueRemaining: 0,
      })
    }

    if (active) {
      const { error } = await supabase
        .from('polls')
        .update({ status: 'done', closed_at: new Date().toISOString() })
        .eq('id', active.id)
      if (error) {
        console.error('[rotate-poll cron] close error:', error)
        return NextResponse.json({ error: 'Failed to close current poll' }, { status: 500 })
      }
    }

    const { error: activateErr } = await supabase
      .from('polls')
      .update({ status: 'active', activated_at: new Date().toISOString() })
      .eq('id', next.id)
    if (activateErr) {
      console.error('[rotate-poll cron] activate error:', activateErr)
      return NextResponse.json({ error: 'Failed to activate next poll' }, { status: 500 })
    }

    const remaining = (queueCount || 1) - 1
    console.log(`[rotate-poll cron] activated: "${next.question}" — ${remaining} left in queue`)

    return NextResponse.json({
      rotated: true,
      closedQuestion: active?.question ?? null,
      activeQuestion: next.question,
      queueRemaining: remaining,
      needsRefill: remaining < 7,
    })
  } catch (error) {
    console.error('[rotate-poll cron] unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
