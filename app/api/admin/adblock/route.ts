/**
 * Ad-block measurement readout for the admin dashboard.
 * Aggregates only — the underlying table holds nothing identifying.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { getServiceClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

interface DayRow {
  day: string
  sessions: number
  blocked: number
  blocked_pct: number | null
  mobile_sessions: number
  mobile_blocked: number
  desktop_sessions: number
  desktop_blocked: number
}

export async function GET(req: NextRequest) {
  const auth = requireAdmin(req)
  if (!auth.ok) return auth.response

  try {
    const supabase = getServiceClient()
    const { data, error } = await supabase
      .from('adblock_summary')
      .select('*')
      .order('day', { ascending: false })
      .limit(60)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const days = (data ?? []) as DayRow[]
    const sessions = days.reduce((n, d) => n + (d.sessions || 0), 0)
    const blocked = days.reduce((n, d) => n + (d.blocked || 0), 0)
    const mobileSessions = days.reduce((n, d) => n + (d.mobile_sessions || 0), 0)
    const mobileBlocked = days.reduce((n, d) => n + (d.mobile_blocked || 0), 0)
    const desktopSessions = days.reduce((n, d) => n + (d.desktop_sessions || 0), 0)
    const desktopBlocked = days.reduce((n, d) => n + (d.desktop_blocked || 0), 0)

    const pct = (part: number, whole: number) =>
      whole > 0 ? Math.round((1000 * part) / whole) / 10 : null

    return NextResponse.json({
      totals: {
        sessions,
        blocked,
        blockedPct: pct(blocked, sessions),
        mobile: { sessions: mobileSessions, blocked: mobileBlocked, pct: pct(mobileBlocked, mobileSessions) },
        desktop: { sessions: desktopSessions, blocked: desktopBlocked, pct: pct(desktopBlocked, desktopSessions) },
      },
      days,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load' },
      { status: 500 }
    )
  }
}
