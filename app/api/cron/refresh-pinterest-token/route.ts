/**
 * Pinterest token renewal.
 *
 * Called weekly by Vercel Cron — see vercel.json.
 *
 * A Pinterest access token lasts about 30 days and the refresh token about a
 * year. Renewal kicks in once the access token is inside 10 days of expiry,
 * so a weekly run leaves at least one spare attempt before posting breaks.
 * When the refresh token itself lapses, the only way back is to redo the
 * consent flow at /api/pinterest/connect.
 *
 * Until the app is configured (no PINTEREST_APP_ID) this reports 'missing'
 * as a success so an unused integration does not page anyone every week.
 *
 * Auth: Bearer {CRON_SECRET} (or AUTOMATION_CRON_SECRET)
 */

import { NextRequest, NextResponse } from 'next/server'
import { isCronAuthorized } from '@/lib/cron-auth'
import { refreshPinterestToken } from '@/lib/social/pinterest-tokens'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req, 'refresh-pinterest-token cron')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const configured = !!(process.env.PINTEREST_APP_ID && process.env.PINTEREST_APP_SECRET)

  try {
    const result = await refreshPinterestToken()

    const line = `[refresh-pinterest-token] ${result.action}${
      result.daysLeft !== undefined ? ` (${result.daysLeft}d left)` : ''
    }${result.detail ? ` — ${result.detail}` : ''}`

    // 'missing' only matters once someone has set the app up and expects
    // Pins to go out; before that it is the normal state.
    const broken = result.action === 'failed' || (result.action === 'missing' && configured)
    if (broken) console.error(line)
    else console.log(line)

    return NextResponse.json({ success: !broken, configured, result }, { status: broken ? 500 : 200 })
  } catch (error) {
    console.error('[refresh-pinterest-token] failed:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
