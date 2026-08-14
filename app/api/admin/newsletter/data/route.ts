/**
 * Newsletter admin data — subscriptions, stats, and email events.
 *
 * The admin newsletter page used to call lib/newsletter directly from the
 * browser, which meant the subscriber list was read with the public anon key.
 * That is what forced `newsletter_subscriptions` to stay readable by `anon`,
 * exposing every subscriber's email address to anyone who looked. The reads
 * now happen here, behind requireAdmin and the service role.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import {
  getAllNewsletterSubscriptions,
  getNewsletterStats,
  getEmailEvents,
  checkEmailEventsTable,
} from '@/lib/newsletter'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = requireAdmin(req)
  if (!auth.ok) return auth.response

  // `stats` alone is enough for the counter refresh after a status toggle, so
  // the page can skip re-pulling the whole subscriber list for that.
  const only = new URL(req.url).searchParams.get('only')

  try {
    if (only === 'stats') {
      return NextResponse.json({ stats: await getNewsletterStats() })
    }

    const [subscriptions, stats, events, hasEventsTable] = await Promise.all([
      getAllNewsletterSubscriptions(),
      getNewsletterStats(),
      getEmailEvents(),
      checkEmailEventsTable(),
    ])

    return NextResponse.json({ subscriptions, stats, events, hasEventsTable })
  } catch (err) {
    console.error('[admin/newsletter/data]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load newsletter data' },
      { status: 500 }
    )
  }
}
