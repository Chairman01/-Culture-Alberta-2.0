/**
 * TikTok setup status — read-only.
 *
 * Shows which service posts to TikTok (Buffer, Zernio or PostFast), whether
 * posts are finished by hand in the TikTok app, the account ids each
 * configured service reports (the value for its *_TIKTOK_* env var), the
 * default sound, and the last ten TikTok posts. Never posts anything.
 *
 * GET /api/admin/tiktok/status   (admin)
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { getServiceClient } from '@/lib/supabase-admin'
import { listBufferChannels } from '@/lib/social/buffer'
import { listPostFastAccounts } from '@/lib/social/postfast'
import { tiktokEnabled, tiktokHandFinished, tiktokProvider } from '@/lib/social/tiktok'
import { getDefaultSound } from '@/lib/social/tiktok-sounds'
import { listZernioAccounts } from '@/lib/social/zernio'

export const dynamic = 'force-dynamic'

async function attempt<T>(fn: () => Promise<T>): Promise<{ data?: T; error?: string }> {
  try {
    return { data: await fn() }
  } catch (err) {
    return { error: String(err).slice(0, 300) }
  }
}

export async function GET(request: NextRequest) {
  const auth = requireAdmin(request)
  if (!auth.ok) return auth.response

  const provider = tiktokProvider()
  const configured = {
    provider,
    enabled: tiktokEnabled(),
    finishedInTikTokApp: tiktokHandFinished(provider),
    buffer: { apiKey: !!process.env.BUFFER_API_KEY, tiktokChannelId: process.env.BUFFER_TIKTOK_CHANNEL_ID ?? null },
    zernio: { apiKey: !!process.env.ZERNIO_API_KEY, tiktokAccountId: process.env.ZERNIO_TIKTOK_ACCOUNT_ID ?? null },
    postfast: { apiKey: !!process.env.POSTFAST_API_KEY, tiktokAccountId: process.env.POSTFAST_TIKTOK_ACCOUNT_ID ?? null },
    autopost: process.env.SOCIAL_AUTOPOST === 'true',
  }

  const [buffer, zernio, postfast] = await Promise.all([
    configured.buffer.apiKey ? attempt(async () => (await listBufferChannels()).filter((c) => c.service === 'tiktok')) : null,
    configured.zernio.apiKey ? attempt(async () => (await listZernioAccounts()).filter((a) => a.platform === 'tiktok')) : null,
    configured.postfast.apiKey ? attempt(listPostFastAccounts) : null,
  ])

  const { data: recent } = await getServiceClient()
    .from('social_posts')
    .select('article_id, status, external_url, error, attempts, created_at')
    .eq('platform', 'tiktok')
    .order('created_at', { ascending: false })
    .limit(10)

  const envFor = { buffer: 'BUFFER_TIKTOK_CHANNEL_ID', zernio: 'ZERNIO_TIKTOK_ACCOUNT_ID', postfast: 'POSTFAST_TIKTOK_ACCOUNT_ID' }[provider]

  return NextResponse.json({
    configured,
    tiktokAccounts: { buffer, zernio, postfast },
    defaultSound: await getDefaultSound().catch(() => null),
    recentPosts: recent ?? [],
    next: configured.enabled
      ? configured.finishedInTikTokApp
        ? 'Ready — each new article arrives on your phone to review, add a sound and post'
        : 'Ready — new articles post to TikTok on publish'
      : `Set the ${provider} API key and ${envFor} in Vercel (ids are listed under tiktokAccounts), then redeploy`,
  })
}
