import { getServiceClient } from '@/lib/supabase-admin'

// ---------------------------------------------------------------------------
// Threads token storage and renewal.
//
// A long-lived Threads token lasts 60 days and can be refreshed any time after
// its first 24 hours — but once it lapses it cannot be refreshed at all, only
// rebuilt by hand: re-invite the account as a tester, accept from inside
// Threads, generate again. Twice, once per account.
//
// So the token has to be renewed on a schedule, which means it has to live
// somewhere writable. Vercel env vars are not, hence the social_tokens table.
// The env var stays as the seed and the fallback: if the table is empty the
// code still works, it just cannot renew itself.
// ---------------------------------------------------------------------------

const API = 'https://graph.threads.net'

/** Renew this far ahead of expiry, so a failed run has weeks of retries left. */
const RENEW_WHEN_DAYS_LEFT = 20

export type ThreadsPlatform = 'threads_alberta' | 'threads_yyc'

const ENV_TOKEN: Record<ThreadsPlatform, string | undefined> = {
  get threads_alberta() {
    return process.env.THREADS_ALBERTA_ACCESS_TOKEN
  },
  get threads_yyc() {
    return process.env.THREADS_YYC_ACCESS_TOKEN
  },
}

/**
 * The token to post with: the stored one if there is one, otherwise the env var
 * it was seeded from. Reading falls back rather than failing, so a database
 * hiccup degrades to "cannot renew" instead of "cannot post".
 */
export async function getThreadsToken(platform: ThreadsPlatform): Promise<string | undefined> {
  try {
    const supabase = getServiceClient()
    const { data } = await supabase
      .from('social_tokens')
      .select('access_token')
      .eq('platform', platform)
      .maybeSingle()

    if (data?.access_token) return data.access_token
  } catch (err) {
    console.warn(`⚠️ Could not read stored ${platform} token, using env:`, err)
  }

  return ENV_TOKEN[platform]
}

export interface RefreshOutcome {
  platform: ThreadsPlatform
  action: 'refreshed' | 'still-fresh' | 'seeded' | 'failed' | 'missing'
  daysLeft?: number
  detail?: string
}

async function refreshOne(platform: ThreadsPlatform): Promise<RefreshOutcome> {
  const supabase = getServiceClient()

  const { data: stored } = await supabase
    .from('social_tokens')
    .select('access_token, expires_at')
    .eq('platform', platform)
    .maybeSingle()

  const token = stored?.access_token ?? ENV_TOKEN[platform]
  if (!token) return { platform, action: 'missing' }

  // Nothing to do yet — but seed the row on the first run so the value is
  // somewhere writable before it ever needs renewing.
  if (stored?.expires_at) {
    const daysLeft = (new Date(stored.expires_at).getTime() - Date.now()) / 86_400_000
    if (daysLeft > RENEW_WHEN_DAYS_LEFT) {
      return { platform, action: 'still-fresh', daysLeft: Math.round(daysLeft) }
    }
  }

  try {
    const res = await fetch(
      `${API}/refresh_access_token?grant_type=th_refresh_token&access_token=${encodeURIComponent(token)}`
    )
    const json = await res.json().catch(() => ({}))

    if (!res.ok || !json.access_token) {
      const detail = json?.error?.message ?? `HTTP ${res.status}`
      return { platform, action: 'failed', detail: String(detail).slice(0, 300) }
    }

    // expires_in is seconds; Threads returns a fresh 60 days.
    const expiresAt = new Date(Date.now() + (json.expires_in ?? 5_184_000) * 1000)

    const { error } = await supabase.from('social_tokens').upsert(
      {
        platform,
        access_token: json.access_token,
        expires_at: expiresAt.toISOString(),
        refreshed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'platform' }
    )
    if (error) return { platform, action: 'failed', detail: error.message }

    return {
      platform,
      action: stored ? 'refreshed' : 'seeded',
      daysLeft: Math.round((expiresAt.getTime() - Date.now()) / 86_400_000),
    }
  } catch (err) {
    return { platform, action: 'failed', detail: String(err).slice(0, 300) }
  }
}

export async function refreshThreadsTokens(): Promise<RefreshOutcome[]> {
  const platforms: ThreadsPlatform[] = ['threads_alberta', 'threads_yyc']
  const results: RefreshOutcome[] = []
  for (const platform of platforms) {
    results.push(await refreshOne(platform))
  }
  return results
}
