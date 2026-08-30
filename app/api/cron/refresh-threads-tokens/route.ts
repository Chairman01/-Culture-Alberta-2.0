/**
 * Threads token renewal.
 *
 * Called weekly by Vercel Cron — see vercel.json.
 *
 * A Threads long-lived token lasts 60 days. Refreshing it resets the clock, but
 * once it lapses it cannot be refreshed at all — the only way back is to
 * re-invite each account as a tester, accept from inside Threads, and generate
 * a new token by hand, twice. So this runs weekly and renews once a token is
 * inside 20 days of expiry, which leaves roughly three weeks of failed runs
 * before anything actually breaks.
 *
 * Auth: Bearer {CRON_SECRET} (or AUTOMATION_CRON_SECRET)
 */

import { NextRequest, NextResponse } from 'next/server'
import { isCronAuthorized } from '@/lib/cron-auth'
import { refreshThreadsTokens } from '@/lib/social/threads-tokens'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req, 'refresh-threads-tokens cron')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const results = await refreshThreadsTokens()

    for (const r of results) {
      const line = `[refresh-threads-tokens] ${r.platform}: ${r.action}${
        r.daysLeft !== undefined ? ` (${r.daysLeft}d left)` : ''
      }${r.detail ? ` — ${r.detail}` : ''}`
      if (r.action === 'failed' || r.action === 'missing') console.error(line)
      else console.log(line)
    }

    // A failure here is not urgent on the day it happens — there are weeks of
    // margin — but it must not look like success to whatever is watching.
    const broken = results.some((r) => r.action === 'failed' || r.action === 'missing')
    return NextResponse.json({ success: !broken, results }, { status: broken ? 500 : 200 })
  } catch (error) {
    console.error('[refresh-threads-tokens] failed:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
