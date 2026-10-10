/**
 * TikTok setup status — read-only.
 *
 * Lists the accounts connected in PostFast (POSTFAST_TIKTOK_ACCOUNT_ID is the
 * TikTok one), the provider and music settings, the default sound, and the
 * last ten TikTok posts. Never posts anything.
 *
 * GET /api/admin/tiktok/status   (admin)
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { getServiceClient } from '@/lib/supabase-admin'
import { listPostFastAccounts, type PostFastAccount } from '@/lib/social/postfast'
import { tiktokEnabled, tiktokProvider } from '@/lib/social/tiktok'
import { getDefaultSound } from '@/lib/social/tiktok-sounds'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const auth = requireAdmin(request)
  if (!auth.ok) return auth.response

  const configured = {
    provider: tiktokProvider(),
    enabled: tiktokEnabled(),
    postfastApiKey: !!process.env.POSTFAST_API_KEY,
    postfastTikTokAccountId: process.env.POSTFAST_TIKTOK_ACCOUNT_ID ?? null,
    autoMusicFallback: process.env.TIKTOK_AUTO_MUSIC !== 'off',
    autopost: process.env.SOCIAL_AUTOPOST === 'true',
  }

  let accounts: PostFastAccount[] | null = null
  let accountsError: string | null = null
  if (configured.postfastApiKey) {
    try {
      accounts = await listPostFastAccounts()
    } catch (err) {
      accountsError = String(err).slice(0, 300)
    }
  }

  const { data: recent } = await getServiceClient()
    .from('social_posts')
    .select('article_id, status, external_url, error, attempts, created_at')
    .eq('platform', 'tiktok')
    .order('created_at', { ascending: false })
    .limit(10)

  return NextResponse.json({
    configured,
    defaultSound: await getDefaultSound().catch(() => null),
    accounts,
    accountsError,
    recentPosts: recent ?? [],
    next: !configured.postfastApiKey
      ? 'Create an API key in PostFast (Settings → API), add it to Vercel as POSTFAST_API_KEY, then redeploy'
      : !configured.postfastTikTokAccountId
        ? 'Copy the TikTok account id from `accounts` into Vercel as POSTFAST_TIKTOK_ACCOUNT_ID, then redeploy'
        : 'Ready — pick sounds in the article editor; new articles post to TikTok on publish',
  })
}
