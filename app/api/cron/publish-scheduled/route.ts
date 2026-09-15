/**
 * Scheduled article publishing.
 *
 * Called by Vercel Cron every five minutes (see vercel.json). Publishes every
 * draft whose `publish_at` has passed, then clears the column so the row is
 * never considered again.
 *
 * Auth: Bearer {CRON_SECRET} (or AUTOMATION_CRON_SECRET)
 *
 * This endpoint touches the public site but sends no email. It is unrelated to
 * /api/newsletter/send, which stays manual — see the note there.
 *
 * Nothing happens on an empty schedule, which is the normal case: the query is
 * a partial-index lookup and the response is `{ published: 0 }`.
 */

import { NextRequest, NextResponse, after } from 'next/server'
import { isCronAuthorized } from '@/lib/cron-auth'
import {
  findDueScheduledArticles,
  publishScheduledArticle,
  announcePublishedArticle,
} from '@/lib/publish-article'

// The social posting in after() polls Threads until its container is ready, so
// this needs materially more than the default budget — same reason as the admin
// PUT route.
export const maxDuration = 60

export const dynamic = 'force-dynamic'

// A cap, not a page: if a backlog somehow built up, publishing ten at a time and
// letting the next tick take the rest beats timing out halfway through.
const MAX_PER_RUN = 10

export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req, 'publish-scheduled cron')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Without the service key the anon fallback cannot see drafts at all, so the
  // schedule would read as permanently empty and articles would silently never
  // go live. Fail loudly instead.
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[publish-scheduled cron] SUPABASE_SERVICE_ROLE_KEY is not set')
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY is not configured' }, { status: 500 })
  }

  const { articles: due, error } = await findDueScheduledArticles(MAX_PER_RUN)

  if (error) {
    return NextResponse.json({ error }, { status: 500 })
  }

  if (due.length === 0) {
    return NextResponse.json({ success: true, published: 0, timestamp: new Date().toISOString() })
  }

  const published: { id: string; title?: string; slug?: string }[] = []
  const skipped: { id: string; reason?: string }[] = []

  // Sequential, not Promise.all: each publish revalidates the same set of pages
  // and writes the same fallback file, so running them at once just contends.
  for (const article of due) {
    const result = await publishScheduledArticle(article.id)
    if (result.ok) {
      published.push({ id: result.id, title: result.title, slug: result.slug })
    } else {
      skipped.push({ id: result.id, reason: result.reason })
    }
  }

  // IndexNow and the social post outlive the response. after() keeps the
  // invocation alive; a floating promise here could be frozen on return.
  if (published.length > 0) {
    after(async () => {
      for (const article of published) {
        await announcePublishedArticle(article.id)
      }
    })
  }

  return NextResponse.json({
    success: true,
    published: published.length,
    articles: published,
    ...(skipped.length > 0 ? { skipped } : {}),
    timestamp: new Date().toISOString(),
  })
}
