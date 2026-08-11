/**
 * Change which city edition an existing subscriber receives.
 *
 * Only moves people who are ALREADY subscribed — it never creates a
 * subscription. Adding someone to a mailing list is a consent decision that
 * belongs to the reader, not to an admin dropdown.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { getServiceClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

const VALID_CITIES = [
  'edmonton', 'calgary', 'lethbridge', 'red-deer',
  'grande-prairie', 'fort-mcmurray', 'medicine-hat',
]

export async function POST(req: NextRequest) {
  const auth = requireAdmin(req)
  if (!auth.ok) return auth.response

  let body: { email?: string; city?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const email = body.email?.trim().toLowerCase()
  const city = body.city?.trim()

  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })
  if (!city || !VALID_CITIES.includes(city)) {
    return NextResponse.json(
      { error: `City must be one of: ${VALID_CITIES.join(', ')}` },
      { status: 400 }
    )
  }

  try {
    const supabase = getServiceClient()

    const { data: existing, error: findErr } = await supabase
      .from('newsletter_subscriptions')
      .select('id, status, city')
      .eq('email', email)
      .maybeSingle()

    if (findErr) return NextResponse.json({ error: findErr.message }, { status: 500 })
    if (!existing) {
      return NextResponse.json(
        { error: 'Not subscribed. Readers have to opt in themselves.' },
        { status: 404 }
      )
    }

    const { error } = await supabase
      .from('newsletter_subscriptions')
      .update({ city, updated_at: new Date().toISOString() })
      .eq('id', existing.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true, email, from: existing.city, to: city })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed' },
      { status: 500 }
    )
  }
}
