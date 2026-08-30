/**
 * Social retry sweeper.
 *
 * Called hourly by Vercel Cron — see vercel.json. Finds social_posts rows left
 * in 'failed' and tries them again.
 *
 * Threads is the reason this exists: it rejects a container now and then with
 * no stated reason and accepts the identical post minutes later. Without this,
 * recovery depended on somebody noticing a missing post and re-saving the
 * article, which is not a plan.
 *
 * Rows carry an attempt counter, so a post that genuinely cannot be published
 * gives up instead of being retried forever.
 *
 * Auth: Bearer {CRON_SECRET} (or AUTOMATION_CRON_SECRET)
 */

import { NextRequest, NextResponse } from 'next/server'
import { isCronAuthorized } from '@/lib/cron-auth'
import { retryFailedSocialPosts } from '@/lib/social'

export const dynamic = 'force-dynamic'
// Each retry can wait on a Threads container, so give it room for a full batch.
export const maxDuration = 300

export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req, 'retry-social cron')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await retryFailedSocialPosts()

    if (result.retried > 0) {
      console.log(
        `[retry-social cron] retried ${result.retried}, recovered ${result.recovered}, still failing ${result.stillFailing}`
      )
    }

    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error('[retry-social cron] failed:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
