/**
 * Pinterest connection status — read-only.
 *
 * Shows whether the account is connected, when the tokens expire, the boards
 * on the account with their ids (the value PINTEREST_BOARD_ID needs), and the
 * most recent Pins the pipeline created. It never creates anything.
 *
 * Admin-only: the board list is harmless but the token expiry is not
 * something to advertise.
 *
 * GET /api/pinterest/status
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { getServiceClient } from '@/lib/supabase-admin'
import { getPinterestToken } from '@/lib/social/pinterest-tokens'
import { listBoards } from '@/lib/social/pinterest'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const auth = requireAdmin(request)
  if (!auth.ok) return auth.response

  const supabase = getServiceClient()

  const { data: tokens } = await supabase
    .from('social_tokens')
    .select('platform, expires_at, refreshed_at')
    .in('platform', ['pinterest', 'pinterest_refresh'])

  const access = tokens?.find((t) => t.platform === 'pinterest')
  const refresh = tokens?.find((t) => t.platform === 'pinterest_refresh')

  const { data: recent } = await supabase
    .from('social_posts')
    .select('article_id, status, external_url, error, attempts, created_at')
    .eq('platform', 'pinterest')
    .order('created_at', { ascending: false })
    .limit(10)

  const configured = {
    appId: !!process.env.PINTEREST_APP_ID,
    appSecret: !!process.env.PINTEREST_APP_SECRET,
    boardId: process.env.PINTEREST_BOARD_ID ?? null,
    autopost: process.env.SOCIAL_AUTOPOST === 'true',
  }

  let boards: Awaited<ReturnType<typeof listBoards>> | null = null
  let boardsError: string | null = null
  const token = await getPinterestToken()
  if (token) {
    try {
      boards = await listBoards(token, { fresh: true })
    } catch (err) {
      boardsError = String(err).slice(0, 300)
    }
  }

  return NextResponse.json({
    connected: !!token,
    configured,
    accessTokenExpiresAt: access?.expires_at ?? null,
    refreshTokenExpiresAt: refresh?.expires_at ?? null,
    lastRefreshedAt: access?.refreshed_at ?? null,
    boards,
    boardsError,
    recentPins: recent ?? [],
    next: !configured.appId
      ? 'Set PINTEREST_APP_ID and PINTEREST_APP_SECRET in Vercel (see docs/pinterest-setup.md)'
      : !token
        ? 'Visit /api/pinterest/connect while signed in as admin'
        : !configured.boardId
          ? 'Pick a board id from `boards` and set PINTEREST_BOARD_ID in Vercel'
          : 'Ready — new articles will be pinned on publish',
  })
}
