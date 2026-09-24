/**
 * Nightly: fetch og:images for the organizer pages behind upcoming events.
 *
 * /events and the city hubs read `event_link_previews`; this keeps it warm so
 * a page render never has to wait on a dozen organizer sites. Each run fetches
 * whatever is missing or older than a fortnight, a batch at a time, inside the
 * function's time budget. A backlog just takes a few nights to clear.
 *
 * Auth: Bearer {CRON_SECRET} (or AUTOMATION_CRON_SECRET) — see lib/cron-auth.
 * `?dryRun=1` reports what would be fetched and writes nothing.
 */

import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { isCronAuthorized } from '@/lib/cron-auth'
import { getDirectoryPreviewUrls } from '@/lib/events-directory/directory'
import { getLinkPreviews, refreshLinkPreviews } from '@/lib/events-directory/link-previews'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const PER_RUN_LIMIT = 80
// Leave headroom under maxDuration for the final upserts.
const BUDGET_MS = 45_000

export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req, 'event-images cron')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const dryRun = req.nextUrl.searchParams.get('dryRun') === '1'
  const started = Date.now()

  try {
    const urls = await getDirectoryPreviewUrls()
    const known = await getLinkPreviews(urls)

    if (dryRun) {
      return NextResponse.json({
        dryRun: true,
        candidateUrls: urls.length,
        cached: known.size,
        withImage: [...known.values()].filter(p => p.imageUrl).length,
      })
    }

    const { fetched, ok } = await refreshLinkPreviews(urls, {
      limit: PER_RUN_LIMIT,
      budgetMs: BUDGET_MS,
      concurrency: 4,
      known,
    })

    // New images should show on the next request, not in half an hour.
    if (fetched > 0) revalidateTag('events-directory')

    return NextResponse.json({
      candidateUrls: urls.length,
      alreadyCached: known.size,
      fetched,
      ok,
      failed: fetched - ok,
      ms: Date.now() - started,
    })
  } catch (error) {
    console.error('[event-images] run failed:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'failed' }, { status: 500 })
  }
}
