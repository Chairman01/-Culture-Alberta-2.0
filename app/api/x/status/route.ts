/**
 * X-via-Buffer status — read-only.
 *
 * Shows whether Buffer is configured, lists the Buffer channels with their ids
 * (BUFFER_X_CHANNEL_ID is the X one), and the last ten X posts the pipeline
 * made. It never posts anything.
 *
 * GET /api/x/status   (admin)
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { getServiceClient } from '@/lib/supabase-admin'
import { listBufferChannels, type BufferChannel } from '@/lib/social/buffer'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const auth = requireAdmin(request)
  if (!auth.ok) return auth.response

  const configured = {
    bufferApiKey: !!process.env.BUFFER_API_KEY,
    xChannelId: process.env.BUFFER_X_CHANNEL_ID ?? null,
    autopost: process.env.SOCIAL_AUTOPOST === 'true',
    claudeBullets: !!process.env.ANTHROPIC_API_KEY,
    linkMode: process.env.X_LINK_MODE ?? 'ab (half link in post, half link in reply)',
    directXApiKeysPresent: !!process.env.X_API_KEY,
  }

  let channels: BufferChannel[] | null = null
  let channelsError: string | null = null
  if (configured.bufferApiKey) {
    try {
      channels = await listBufferChannels()
    } catch (err) {
      channelsError = String(err).slice(0, 300)
    }
  }

  const { data: recent } = await getServiceClient()
    .from('social_posts')
    .select('article_id, status, external_url, error, attempts, created_at')
    .eq('platform', 'x_buffer')
    .order('created_at', { ascending: false })
    .limit(10)

  const xChannels = channels?.filter((c) => c.service === 'twitter') ?? null

  return NextResponse.json({
    configured,
    xChannels,
    allChannels: channels,
    channelsError,
    recentPosts: recent ?? [],
    next: !configured.bufferApiKey
      ? 'Create an API key in Buffer (Settings → API) and add it to Vercel as BUFFER_API_KEY, then redeploy'
      : !configured.xChannelId
        ? 'Copy the X channel id from xChannels into Vercel as BUFFER_X_CHANNEL_ID, then redeploy'
        : 'Ready — new articles will post to X through Buffer',
  })
}
