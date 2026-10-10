/**
 * The default TikTok sound, used for any article without its own pick.
 *
 * PUT /api/admin/tiktok/default-sound   body: { sound: {musicSoundId, name, artist} | null }
 *
 * Admin-only. Same-origin only, so another site can't change it with the
 * admin's cookie.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { isSoundChoice, setDefaultSound } from '@/lib/social/tiktok-sounds'

export const dynamic = 'force-dynamic'

export async function PUT(request: NextRequest) {
  const auth = requireAdmin(request)
  if (!auth.ok) return auth.response

  const origin = request.headers.get('origin')
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: 'Cross-site request refused' }, { status: 403 })
  }

  const body = (await request.json().catch(() => ({}))) as { sound?: unknown }
  if (body.sound !== null && !isSoundChoice(body.sound)) {
    return NextResponse.json({ error: 'sound must be {musicSoundId, name, artist} or null' }, { status: 400 })
  }

  try {
    await setDefaultSound(body.sound === null ? null : (body.sound as Parameters<typeof setDefaultSound>[0]))
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err).slice(0, 300) }, { status: 500 })
  }
}
