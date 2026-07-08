/**
 * Quick-publish endpoint — flips a draft article to published in one call.
 * PATCH /api/admin/articles/[id]/publish
 * Requires admin auth (JWT cookie).
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin-auth'
import { notifySearchEngines } from '@/lib/indexing'
import { postArticleToSocial } from '@/lib/social'

export const dynamic = 'force-dynamic'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient(url, key)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAdmin(request)
  if (!auth.ok) return auth.response

  const { id } = await params

  const supabase = getSupabase()

  // Fetch current article to get the slug and confirm it exists
  const { data: article, error: fetchError } = await supabase
    .from('articles')
    .select('id, slug, status, title, excerpt, image_url')
    .eq('id', id)
    .single()

  if (fetchError || !article) {
    return NextResponse.json({ error: 'Article not found' }, { status: 404 })
  }

  // Update status to published
  const { error: updateError } = await supabase
    .from('articles')
    .update({ status: 'published', updated_at: new Date().toISOString() })
    .eq('id', id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Revalidate pages
  try {
    revalidatePath('/') // page-scoped, not site-wide ('/', 'layout') — avoids ISR write floods
    revalidatePath('/articles')
    if (article.slug) revalidatePath(`/articles/${article.slug}`)
    revalidatePath('/calgary')
    revalidatePath('/edmonton')
    revalidatePath('/alberta')
    revalidatePath('/sitemap.xml')
  } catch { /* non-fatal */ }

  // Clear fast cache
  try {
    const { clearArticlesCache } = await import('@/lib/fast-articles')
    clearArticlesCache()
  } catch { /* non-fatal */ }

  // Notify search engines
  if (article.slug) {
    notifySearchEngines(`/articles/${article.slug}`).catch(() => {})
  }

  // Auto-post to social platforms (non-blocking; deduped per article+platform)
  if (article.slug) {
    postArticleToSocial({
      id: article.id,
      title: article.title,
      slug: article.slug,
      excerpt: article.excerpt,
      imageUrl: article.image_url,
    }).catch((err) => console.warn('⚠️ Social posting failed (non-fatal):', err))
  }

  return NextResponse.json({ success: true, slug: article.slug })
}
