/**
 * Edit one newsletter subscriber — address and/or edition.
 *
 * Both changes used to need a hand-written SQL statement against the live
 * database. The common case is mundane: someone signs up from a town the form
 * files under 'other-alberta', which is a holding bucket that sends nothing
 * (see lib/newsletter-cities.ts), and needs moving onto the edition they
 * actually belong to. The other is a typo in the address.
 *
 * Admin only, service role, same as the rest of /api/admin/newsletter — the
 * subscriber table is never touched with the browser's anon key.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { getServiceClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

const supabase = getServiceClient()

/** Every value the admin list can display, including the holding buckets. */
const ALLOWED_CITIES = new Set([
  'edmonton', 'calgary', 'lethbridge', 'red-deer',
  'grande-prairie', 'fort-mcmurray', 'medicine-hat',
  'other-alberta', 'outside-alberta', 'other', 'unknown',
])

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function PATCH(req: NextRequest) {
  const auth = requireAdmin(req)
  if (!auth.ok) return auth.response

  try {
    const { id, email, city } = await req.json()

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Missing subscriber id' }, { status: 400 })
    }

    const update: Record<string, string> = {}

    if (email !== undefined) {
      // Addresses are stored lowercase; a capitalised retype is not a new
      // subscriber and must not collide with the existing row.
      const next = String(email).trim().toLowerCase()
      if (!EMAIL_RE.test(next)) {
        return NextResponse.json({ error: 'That is not a valid email address' }, { status: 400 })
      }

      const { data: clash } = await supabase
        .from('newsletter_subscriptions')
        .select('id')
        .eq('email', next)
        .neq('id', id)
        .maybeSingle()

      if (clash) {
        return NextResponse.json(
          { error: 'Another subscriber already uses that address' },
          { status: 409 }
        )
      }

      // A hard bounce is a permanent verdict on an address. Mailing it again
      // costs sender reputation for every other subscriber, so the same rule
      // that blocks re-subscribing a bounced address blocks moving one in.
      const { data: bounced } = await supabase
        .from('newsletter_email_events')
        .select('id')
        .eq('email', next)
        .eq('event_type', 'bounced')
        .limit(1)
        .maybeSingle()

      if (bounced) {
        return NextResponse.json(
          { error: 'That address has hard-bounced before and cannot be mailed' },
          { status: 409 }
        )
      }

      update.email = next
    }

    if (city !== undefined) {
      const next = String(city).trim().toLowerCase()
      if (!ALLOWED_CITIES.has(next)) {
        return NextResponse.json({ error: `Unknown edition: ${next}` }, { status: 400 })
      }
      update.city = next
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'Nothing to change' }, { status: 400 })
    }

    update.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('newsletter_subscriptions')
      .update(update)
      .eq('id', id)
      .select('id, email, city, status')
      .maybeSingle()

    if (error) {
      console.error('[admin/newsletter/subscriber]', error)
      return NextResponse.json({ error: 'Failed to update subscriber' }, { status: 500 })
    }
    if (!data) {
      return NextResponse.json({ error: 'Subscriber not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, subscriber: data })
  } catch (err) {
    console.error('[admin/newsletter/subscriber]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
