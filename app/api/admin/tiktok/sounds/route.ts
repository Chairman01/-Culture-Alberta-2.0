/**
 * TikTok sounds for the editor's picker — read-only.
 *
 * GET /api/admin/tiktok/sounds?genre=ALL&dateRange=7DAY&country=CA
 *   → { sounds: [...], defaultSound, configured }
 *
 * Sounds are TikTok's trending Commercial Music Library tracks, via PostFast.
 * Admin-only: the list is harmless, but it spends PostFast's hourly quota.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { listTikTokSounds, type SoundQuery } from '@/lib/social/postfast'
import { getDefaultSound } from '@/lib/social/tiktok-sounds'

export const dynamic = 'force-dynamic'

const RANGES = new Set(['1DAY', '7DAY', '30DAY', '90DAY'])

export async function GET(request: NextRequest) {
  const auth = requireAdmin(request)
  if (!auth.ok) return auth.response

  const defaultSound = await getDefaultSound().catch(() => null)
  const accountId = process.env.POSTFAST_TIKTOK_ACCOUNT_ID
  if (!process.env.POSTFAST_API_KEY || !accountId) {
    return NextResponse.json({
      configured: false,
      sounds: [],
      defaultSound,
      error: 'PostFast is not set up yet (POSTFAST_API_KEY and POSTFAST_TIKTOK_ACCOUNT_ID).',
    })
  }

  const q = request.nextUrl.searchParams
  const range = q.get('dateRange') ?? '7DAY'
  const query: SoundQuery = {
    genre: (q.get('genre') ?? 'ALL').toUpperCase().slice(0, 40),
    countryCode: (q.get('country') ?? 'CA').toUpperCase().slice(0, 2),
    dateRange: (RANGES.has(range) ? range : '7DAY') as SoundQuery['dateRange'],
  }

  try {
    const sounds = await listTikTokSounds(accountId, query)
    return NextResponse.json({ configured: true, sounds, defaultSound, query })
  } catch (err) {
    return NextResponse.json(
      { configured: true, sounds: [], defaultSound, error: String(err).slice(0, 300) },
      { status: 502 }
    )
  }
}
