/**
 * Ad-block measurement endpoint.
 *
 * Records one counter increment per session so the admin dashboard can answer
 * a single question: what share of readers run an ad blocker. That number
 * decides whether anything further (recovery, a notice, a wall) is worth
 * doing — guessing it from what other publishers do is how you end up building
 * a content-blocking modal to solve a 4% problem.
 *
 * Nothing identifying is stored: no IP, no user agent, no path, no user id.
 * Just a day, a device class, and two counts.
 *
 * Called once per session via sendBeacon, so it costs one invocation per
 * visitor rather than one per pageview — this site is actively managing its
 * Vercel usage.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const maxDuration = 10

export async function POST(req: NextRequest) {
  let body: { blocked?: unknown; device?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  const blocked = body.blocked === true
  const device = body.device === 'mobile' ? 'mobile' : 'desktop'

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    // Measurement is optional — never surface an error to a reader's browser.
    return NextResponse.json({ ok: false }, { status: 204 })
  }

  try {
    const supabase = createClient(url, key)
    const { error } = await supabase.rpc('record_adblock_session', {
      p_device: device,
      p_blocked: blocked,
    })
    if (error) console.error('[adblock] record failed:', error.message)
  } catch (err) {
    console.error('[adblock] error:', err instanceof Error ? err.message : err)
  }

  // Always 204: the beacon result is ignored by the browser anyway, and a
  // failed measurement must never look like a broken page.
  return new NextResponse(null, { status: 204 })
}
