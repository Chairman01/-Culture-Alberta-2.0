/**
 * Review queue — the drafts waiting for an editor's approval.
 * GET /api/admin/review          → the pending drafts
 * GET /api/admin/review?count=1  → just the count, for the sidebar badge
 *
 * Admin only. Contributors submit into this queue (their creates are forced to
 * 'draft' in ../articles/create) but must never be able to read it, since it
 * holds every contributor's unpublished work, not just their own.
 *
 * The queue is drafts that are still waiting, not every draft. A rejected piece
 * keeps status='draft' — which is what hides it from the public site — and
 * leaves the queue by way of review_status instead, so it stops reappearing
 * here every time the editor reloads.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { getServiceClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const auth = requireAdmin(request)
  if (!auth.ok) return auth.response

  const countOnly = new URL(request.url).searchParams.get('count') === '1'
  const supabase = getServiceClient()

  if (countOnly) {
    const { count, error } = await supabase
      .from('articles')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'draft')
      .eq('review_status', 'pending')

    if (error) {
      console.error('❌ Review queue count failed:', error.message)
      return NextResponse.json({ count: 0 })
    }
    return NextResponse.json({ count: count ?? 0 })
  }

  // `content` is deliberately excluded — the list only needs a preview, and
  // pulling full article bodies for the queue is what makes the main admin
  // list slow.
  const { data, error } = await supabase
    .from('articles')
    .select('id, title, excerpt, author, category, categories, location, image_url, slug, created_at, updated_at, tags')
    .eq('status', 'draft')
    .eq('review_status', 'pending')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('❌ Review queue load failed:', error.message)
    return NextResponse.json({ error: 'Failed to load review queue' }, { status: 500 })
  }

  const articles = (data || []).map((a) => ({
    id: a.id,
    title: a.title,
    excerpt: a.excerpt || '',
    author: a.author || 'Unknown',
    category: a.category || '',
    categories: a.categories || [],
    location: a.location || '',
    imageUrl: a.image_url || '',
    slug: a.slug || '',
    tags: a.tags || [],
    createdAt: a.created_at,
    updatedAt: a.updated_at || a.created_at,
  }))

  return NextResponse.json({ articles, count: articles.length })
}
