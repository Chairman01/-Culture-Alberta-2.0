import { getServiceClient } from '@/lib/supabase-admin'

// ---------------------------------------------------------------------------
// Pinterest OAuth and token storage.
//
// Pinterest access tokens last ~30 days and refresh tokens ~1 year, so this is
// the same problem as Threads: a token that has to be rewritten on a schedule
// cannot live in a Vercel env var. Both go in social_tokens (service-role only)
// under the platform keys 'pinterest' and 'pinterest_refresh'.
//
// The quick "Generate token" button in Pinterest's dashboard is deliberately
// not used: it only grants read scopes, so it cannot create a Pin.
// ---------------------------------------------------------------------------

const AUTH_URL = 'https://www.pinterest.com/oauth/'
const TOKEN_URL = 'https://api.pinterest.com/v5/oauth/token'

export const PINTEREST_REDIRECT_URI = 'https://www.culturealberta.com/api/pinterest/callback'

/**
 * Only what posting actually needs. boards:read to find the board to pin to,
 * pins:write to create the Pin. Asking for more invites a harder review.
 */
export const PINTEREST_SCOPES = ['boards:read', 'pins:read', 'pins:write'].join(',')

const TOKEN_KEY = 'pinterest'
const REFRESH_KEY = 'pinterest_refresh'

interface TokenResponse {
  access_token?: string
  refresh_token?: string
  expires_in?: number
  refresh_token_expires_in?: number
  error?: string
  message?: string
}

function basicAuth(): string {
  const id = process.env.PINTEREST_APP_ID
  const secret = process.env.PINTEREST_APP_SECRET
  return Buffer.from(`${id}:${secret}`).toString('base64')
}

/** Where to send the user to authorise the app. State guards against CSRF. */
export function buildAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.PINTEREST_APP_ID ?? '',
    redirect_uri: PINTEREST_REDIRECT_URI,
    response_type: 'code',
    scope: PINTEREST_SCOPES,
    state,
  })
  return `${AUTH_URL}?${params.toString()}`
}

async function callTokenEndpoint(body: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth()}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(body),
  })

  const json = (await res.json().catch(() => ({}))) as TokenResponse
  if (!res.ok || !json.access_token) {
    throw new Error(
      `Pinterest token request failed: ${res.status} ${json.message ?? json.error ?? JSON.stringify(json).slice(0, 200)}`
    )
  }
  return json
}

async function store(platform: string, token: string, expiresInSeconds?: number): Promise<void> {
  const supabase = getServiceClient()
  await supabase.from('social_tokens').upsert(
    {
      platform,
      access_token: token,
      expires_at: expiresInSeconds
        ? new Date(Date.now() + expiresInSeconds * 1000).toISOString()
        : null,
      refreshed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'platform' }
  )
}

/** Exchange the one-time code from the callback for a usable token pair. */
export async function exchangeCodeForTokens(code: string): Promise<void> {
  const json = await callTokenEndpoint({
    grant_type: 'authorization_code',
    code,
    redirect_uri: PINTEREST_REDIRECT_URI,
  })

  await store(TOKEN_KEY, json.access_token!, json.expires_in)
  if (json.refresh_token) {
    await store(REFRESH_KEY, json.refresh_token, json.refresh_token_expires_in)
  }
}

export async function getPinterestToken(): Promise<string | undefined> {
  try {
    const supabase = getServiceClient()
    const { data } = await supabase
      .from('social_tokens')
      .select('access_token')
      .eq('platform', TOKEN_KEY)
      .maybeSingle()
    return data?.access_token ?? undefined
  } catch (err) {
    console.warn('⚠️ Could not read the Pinterest token:', err)
    return undefined
  }
}

export interface PinterestRefreshOutcome {
  action: 'refreshed' | 'still-fresh' | 'failed' | 'missing'
  daysLeft?: number
  detail?: string
}

/** Renew well before the ~30 day expiry, so a bad week is survivable. */
const RENEW_WHEN_DAYS_LEFT = 10

export async function refreshPinterestToken(): Promise<PinterestRefreshOutcome> {
  const supabase = getServiceClient()

  const { data: current } = await supabase
    .from('social_tokens')
    .select('expires_at')
    .eq('platform', TOKEN_KEY)
    .maybeSingle()

  const { data: refresh } = await supabase
    .from('social_tokens')
    .select('access_token')
    .eq('platform', REFRESH_KEY)
    .maybeSingle()

  if (!refresh?.access_token) return { action: 'missing' }

  if (current?.expires_at) {
    const daysLeft = (new Date(current.expires_at).getTime() - Date.now()) / 86_400_000
    if (daysLeft > RENEW_WHEN_DAYS_LEFT) {
      return { action: 'still-fresh', daysLeft: Math.round(daysLeft) }
    }
  }

  try {
    const json = await callTokenEndpoint({
      grant_type: 'refresh_token',
      refresh_token: refresh.access_token,
    })

    await store(TOKEN_KEY, json.access_token!, json.expires_in)
    // Pinterest may hand back a rotated refresh token; keeping the old one
    // would strand the integration at the next renewal.
    if (json.refresh_token) {
      await store(REFRESH_KEY, json.refresh_token, json.refresh_token_expires_in)
    }

    return {
      action: 'refreshed',
      daysLeft: Math.round((json.expires_in ?? 0) / 86_400),
    }
  } catch (err) {
    return { action: 'failed', detail: String(err).slice(0, 300) }
  }
}
