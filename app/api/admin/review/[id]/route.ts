/**
 * POST /api/admin/review/:id  { action: 'reject', reason: string }
 *
 * Sends a draft back to its writer with a one-line reason.
 *
 * Rejecting does NOT delete. Deleting threw away the work and told the writer
 * nothing — they would just find the piece gone. The row keeps status='draft',
 * so it stays invisible to the public site exactly as before, and moves out of
 * the queue on review_status instead. The writer sees the reason on their own
 * articles list, and saving a fix puts it back in the queue.
 *
 * Admin only: the whole point of the queue is that a writer cannot clear it.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { getServiceClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

const MAX_REASON = 500

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = requireAdmin(request)
  if (!auth.ok) return auth.response

  const { id } = await params

  try {
    const body = await request.json()
    if (body.action !== 'reject') {
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }

    const reason = String(body.reason ?? '').trim()
    if (!reason) {
      // The handbook promises the writer a reason every time. An empty one
      // would leave them exactly as informed as the old silent delete did.
      return NextResponse.json({ error: 'A reason is required — the writer sees it' }, { status: 400 })
    }
    if (reason.length > MAX_REASON) {
      return NextResponse.json({ error: `Keep the reason under ${MAX_REASON} characters` }, { status: 400 })
    }

    const supabase = getServiceClient()

    // Scoped to drafts. Without this an id typo, or a stale queue open in
    // another tab, could stamp a rejection onto a published article.
    const { data, error } = await supabase
      .from('articles')
      .update({
        review_status: 'rejected',
        review_note: reason,
        reviewed_at: new Date().toISOString(),
        reviewed_by: auth.name || auth.username,
      })
      .eq('id', id)
      .eq('status', 'draft')
      .select('id, title, author')
      .maybeSingle()

    if (error) {
      console.error('❌ Reject failed:', error.message)
      return NextResponse.json({ error: 'Could not send that back' }, { status: 500 })
    }
    if (!data) {
      return NextResponse.json({ error: 'That draft is no longer in the queue' }, { status: 404 })
    }

    console.log(`↩️ ${auth.username} sent "${data.title}" back to ${data.author}: ${reason}`)
    return NextResponse.json({ ok: true, article: data })
  } catch (error) {
    console.error('❌ Reject error:', error instanceof Error ? error.message : 'Unknown')
    return NextResponse.json({ error: 'Could not send that back' }, { status: 500 })
  }
}
