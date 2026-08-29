/**
 * Quick-publish endpoint — flips a draft article to published in one call.
 * PATCH /api/admin/articles/[id]/publish
 * Requires admin auth (JWT cookie).
 */

import { NextRequest, NextResponse, after } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin-auth'
import { notifySearchEngines } from '@/lib/indexing'
import { postArticleToSocial } from '@/lib/social'
import { warmSocialPreview } from '@/lib/social-image-url'

// The social posting in after() polls Threads until its container is ready,
// so this needs materially more than the default budget.
export const maxDuration = 60

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
    .select('id, slug, status, title, excerpt, image_url, category, tags')
    .eq('id', id)
    .single()

  if (fetchError || !article) {
    return NextResponse.json({ error: 'Article not found' }, { status: 404 })
  }

  // Update status to published
  const { error: updateError } = await supabase
    .from('articles')
    .update({
      status: 'published',
      // Closes the review trail: approving clears any earlier rejection note so
      // the writer is not left looking at a complaint about a piece that went
      // on to be published.
      review_status: 'approved',
      review_note: null,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
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

  // after() keeps the invocation alive once the response has been sent — a
  // floating promise can be frozen the moment we return, silently skipping both.
  if (article.slug) {
    after(async () => {
      try {
        await notifySearchEngines(`/articles/${article.slug}`)
      } catch {
        /* non-fatal */
      }

      try {
        // Warm the CDN first, then auto-post (deduped per article+platform).
        // Order matters: posting is what sends crawlers at us, and they only render
        // the large image card if og:image fetches quickly — cache must be hot first.
        await warmSocialPreview(article.image_url, article.slug)
        await postArticleToSocial({
          id: article.id,
          title: article.title,
          slug: article.slug,
          excerpt: article.excerpt,
          imageUrl: article.image_url,
          category: article.category,
          tags: article.tags,
        })
      } catch (err) {
        console.warn('⚠️ Social posting failed (non-fatal):', err)
      }
    })
  }

  return NextResponse.json({ success: true, slug: article.slug })
}
