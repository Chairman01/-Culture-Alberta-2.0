/**
 * Starts the Pinterest OAuth flow.
 *
 * Admin-only: this begins a handshake that ends with a token able to post as
 * Culture Alberta, so it must not be reachable by a passer-by. Visit it once
 * signed in as admin and it redirects to Pinterest's consent screen.
 *
 * GET /api/pinterest/connect
 */

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { requireAdmin } from '@/lib/admin-auth'
import { buildAuthorizeUrl } from '@/lib/social/pinterest-tokens'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const auth = requireAdmin(request)
  if (!auth.ok) return auth.response

  if (!process.env.PINTEREST_APP_ID || !process.env.PINTEREST_APP_SECRET) {
    return NextResponse.json(
      { error: 'PINTEREST_APP_ID and PINTEREST_APP_SECRET must be set first' },
      { status: 500 }
    )
  }

  // Round-tripped through Pinterest and checked on the way back, so a callback
  // we did not initiate is rejected rather than exchanged for a token.
  const state = crypto.randomBytes(16).toString('hex')

  const response = NextResponse.redirect(buildAuthorizeUrl(state))
  response.cookies.set('pinterest_oauth_state', state, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  })
  return response
}
