/**
 * Pinterest OAuth callback.
 *
 * Pinterest sends the user back here with a one-time code, which is exchanged
 * for an access token and a refresh token and stored in social_tokens.
 *
 * This is the redirect URI registered on the app, and the screen the demo video
 * for Standard access needs to show.
 *
 * GET /api/pinterest/callback?code=...&state=...
 */

import { NextRequest, NextResponse } from 'next/server'
import { exchangeCodeForTokens } from '@/lib/social/pinterest-tokens'

export const dynamic = 'force-dynamic'

function page(title: string, detail: string, ok: boolean): NextResponse {
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>${title}</title>
<meta name="robots" content="noindex">
<style>
  body{font:16px/1.6 system-ui,sans-serif;max-width:34rem;margin:4rem auto;padding:0 1.5rem;color:#111}
  .badge{display:inline-block;padding:.25rem .6rem;border-radius:999px;font-size:.8rem;font-weight:600;
         background:${ok ? '#dcfce7' : '#fee2e2'};color:${ok ? '#166534' : '#991b1b'}}
  code{background:#f4f4f5;padding:.15rem .35rem;border-radius:.25rem}
</style></head>
<body><p class="badge">${ok ? 'Connected' : 'Failed'}</p><h1>${title}</h1><p>${detail}</p></body></html>`
  return new NextResponse(html, {
    status: ok ? 200 : 400,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl

  const error = searchParams.get('error')
  if (error) {
    return page('Pinterest declined the request', `Pinterest returned: <code>${error}</code>`, false)
  }

  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const expectedState = request.cookies.get('pinterest_oauth_state')?.value

  // Without this check anyone could hand us a code and have it exchanged.
  if (!state || !expectedState || state !== expectedState) {
    return page(
      'That authorisation did not come from here',
      'The state value did not match. Start again from <code>/api/pinterest/connect</code>.',
      false
    )
  }

  if (!code) return page('No code returned', 'Pinterest did not include an authorisation code.', false)

  try {
    await exchangeCodeForTokens(code)
    const response = page(
      'Pinterest is connected',
      'The access and refresh tokens are stored. You can close this tab.',
      true
    )
    response.cookies.delete('pinterest_oauth_state')
    return response
  } catch (err) {
    console.error('[pinterest callback] token exchange failed:', err)
    return page('Could not exchange the code', String(err).slice(0, 300), false)
  }
}
