/**
 * POST /api/admin/articles/:id/schedule  { action: 'publish-now' | 'cancel' }
 *
 * The two things an editor wants from a waiting article without reopening it:
 * push it out early, or call the timer off and leave it a draft.
 *
 * Admin only. Scheduling is publication state, and a contributor putting their
 * own work on the site — immediately or at 6am on Saturday — is the exact thing
 * the review queue exists to prevent.
 */

import { NextRequest, NextResponse, after } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { getServiceClient } from '@/lib/supabase-admin'
import { publishScheduledArticle, announcePublishedArticle } from '@/lib/publish-article'

// Same reason as the sibling PUT route: the social post polls Threads.
export const maxDuration = 60

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAdmin(request)
  if (!auth.ok) return auth.response

  const { id } = await params

  let action: string
  try {
    action = String((await request.json())?.action ?? '')
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body' }, { status: 400 })
  }

  if (action === 'cancel') {
    const supabase = getServiceClient()

    // Scoped to a scheduled draft. Without the guards a stale list open in
    // another tab could clear a column on a row it has no business touching.
    const { data, error } = await supabase
      .from('articles')
      .update({ publish_at: null })
      .eq('id', id)
      .eq('status', 'draft')
      .not('publish_at', 'is', null)
      .select('id, title')
      .maybeSingle()

    if (error) {
      console.error('❌ Cancel schedule failed:', error.message)
      return NextResponse.json({ error: 'Could not cancel that schedule' }, { status: 500 })
    }
    if (!data) {
      return NextResponse.json({ error: 'That article is not scheduled any more' }, { status: 404 })
    }

    console.log(`⏹️ ${auth.username} cancelled the schedule on "${data.title}" — it stays a draft`)
    return NextResponse.json({ ok: true, article: data, status: 'draft' })
  }

  if (action === 'publish-now') {
    // requireDue: false — the editor is deliberately overriding the clock.
    const result = await publishScheduledArticle(id, { requireDue: false })

    if (!result.ok) {
      const status = result.reason === 'Article not found' ? 404 : 409
      return NextResponse.json({ error: result.reason }, { status })
    }

    console.log(`⏩ ${auth.username} published "${result.title}" ahead of its schedule`)

    // IndexNow and the social post outlive the response.
    after(async () => {
      await announcePublishedArticle(result.id)
    })

    return NextResponse.json({ ok: true, article: result, status: 'published' })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
