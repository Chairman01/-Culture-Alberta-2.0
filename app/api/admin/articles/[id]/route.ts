import { NextRequest, NextResponse, after } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { updateOptimizedFallback } from '@/lib/optimized-fallback'
import { quickSyncArticle } from '@/lib/auto-sync'
import { revalidatePath } from 'next/cache'
import { notifySearchEngines } from '@/lib/indexing'
import { postArticleToSocial } from '@/lib/social'
import { warmSocialPreview } from '@/lib/social-image-url'
import { saveManualPollForArticle, deletePollForArticle } from '@/lib/poll-generator'
import { requireAdmin, requireAdminOrContributor } from '@/lib/admin-auth'
import { createSlug, generateUniqueSlug } from '@/lib/utils/slug'
import { sanitizeAdminHtml } from '@/lib/sanitize-html'
import { getServiceClient } from '@/lib/supabase-admin'

// The social posting in after() polls Threads until its container is ready,
// so this needs materially more than the default budget.
export const maxDuration = 60

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// Service role, not the public anon key — see the note in ../route.ts.
const getSupabaseClient = getServiceClient

async function generateArticleSlug(
  supabase: ReturnType<typeof getSupabaseClient>,
  title: string,
  currentArticleId: string
) {
  const baseSlug = createSlug(title)
  const { data, error } = await supabase
    .from('articles')
    .select('id, slug')
    .not('slug', 'is', null)

  if (error) {
    console.warn('⚠️ Could not fetch existing slugs; using base slug:', error.message)
    return baseSlug
  }

  const existingSlugs = (data || [])
    .filter(article => article.id !== currentArticleId)
    .map(article => article.slug)
    .filter(Boolean)

  return generateUniqueSlug(baseSlug, existingSlugs)
}

function hasMeaningfulContent(content: unknown) {
  if (typeof content !== 'string') return false
  const text = content
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return text.length >= 50 || content.includes('<img')
}

/**
 * A writer may only touch their own work.
 *
 * Ownership is the account id where there is one. The byline fallback is for
 * articles written before per-writer accounts existed, under the single shared
 * contributor login -- those rows have no author_user_id to match on.
 */
function contributorCanAccessArticle(
  auth: { role: 'admin' | 'contributor'; username: string; name: string; userId: string | null },
  article: { author?: string | null; author_user_id?: string | null } | null | undefined
) {
  if (auth.role === 'admin') return true
  if (!article) return false
  if (article.author_user_id) return !!auth.userId && article.author_user_id === auth.userId
  return !!article.author && (article.author === auth.name || article.author === auth.username)
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authCheck = requireAdminOrContributor(request)
  if (!authCheck.ok) return authCheck.response

  try {
    const resolved = await params
    const articleId = resolved.id
    console.log('🔎 Admin GET article by ID:', articleId)

    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .eq('id', articleId)
      .single()

    if (error) {
      console.error('❌ Error fetching article from Supabase:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 })
    }

    if (!contributorCanAccessArticle(authCheck, data)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const mapped = {
      ...data,
      imageUrl: data.image_url || data.image || '',
      imageSource: data.image_source || '',
      date: data.created_at,
      trendingHome: data.trending_home || false,
      trendingEdmonton: data.trending_edmonton || false,
      trendingCalgary: data.trending_calgary || false,
      trendingAlberta: data.trending_alberta || false,
      featuredHome: data.featured_home || false,
      featuredEdmonton: data.featured_edmonton || false,
      featuredCalgary: data.featured_calgary || false,
      featuredAlberta: data.featured_alberta || false,
    }

    return NextResponse.json(mapped)
  } catch (e) {
    console.error('❌ Admin GET article failed:', e)
    return NextResponse.json({ error: 'Failed to load article' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authCheck = requireAdminOrContributor(request)
  if (!authCheck.ok) return authCheck.response

  try {
    const articleData = await request.json()
    const resolvedParams = await params
    const articleId = resolvedParams.id
    
    console.log('✏️ Updating article:', articleId, articleData.title)

    if (!hasMeaningfulContent(articleData.content)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Article content is required',
          details: 'Add the full article body before saving.',
        },
        { status: 400 }
      )
    }

    // Get Supabase client
    const supabase = getSupabaseClient()

    // Fetch current title before update so we can detect slug changes, plus the
    // trending/featured flags so a caller that omits them doesn't wipe them.
    const { data: existingArticle } = await supabase
      .from('articles')
      .select('title, seo_title, slug, author, author_user_id, status, review_status, trending_home, trending_edmonton, trending_calgary, featured_home, featured_edmonton, featured_calgary')
      .eq('id', articleId)
      .single()

    if (!contributorCanAccessArticle(authCheck, existingArticle)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const nextSlug = articleData.slug || await generateArticleSlug(supabase, articleData.title, articleId)
    const articleAuthor = authCheck.role === 'contributor'
      ? authCheck.name
      : articleData.author

    // A contributor's save never changes publication state — only an admin
    // approving from /admin/review can do that. Their own drafts stay drafts;
    // an article an admin already approved stays live when they fix a typo.
    const articleStatus = authCheck.role === 'contributor'
      ? (existingArticle?.status || 'draft')
      : (articleData.status || 'published')

    // Same reasoning as the create route: contributor HTML is scrubbed before
    // it can reach the public renderer, admin HTML is left as authored.
    const articleContent = authCheck.role === 'contributor'
      ? sanitizeAdminHtml(articleData.content || '')
      : articleData.content

    // A writer who reworks a rejected draft puts it back in the queue, and the
    // note they were fixing goes with it. An admin's save leaves the review
    // trail untouched, so an empty object here means "change nothing".
    const reviewFields =
      authCheck.role === 'contributor' && existingArticle?.review_status === 'rejected'
        ? { review_status: 'pending', review_note: null, reviewed_at: null, reviewed_by: null }
        : {}

    // Update the article in Supabase
    const { data, error } = await supabase
      .from('articles')
      .update({
        ...reviewFields,
        title: articleData.title,
        // Same `??`-style rule as the flags below: a caller that omits seoTitle
        // keeps what is set; an explicit empty string or null clears it.
        seo_title: articleData.seoTitle === undefined
          ? (existingArticle?.seo_title ?? null)
          : (typeof articleData.seoTitle === 'string' && articleData.seoTitle.trim() ? articleData.seoTitle.trim() : null),
        content: articleContent,
        excerpt: articleData.excerpt,
        category: articleData.category,
        categories: articleData.categories,
        location: articleData.location,
        author: articleAuthor,
        tags: articleData.tags,
        type: articleData.type || 'article',
        status: articleStatus,
        image_url: articleData.imageUrl,
        slug: nextSlug,
        image_source: articleData.imageSource || null,
        // `??`, not `||`: a caller that omits these keys keeps whatever is already
        // set. `|| false` silently unpinned the homepage hero every time an editor
        // saved through a form that doesn't render the flag checkboxes
        // (/admin/edit-post is one). An explicit `false` still unpins.
        trending_home: articleData.trendingHome ?? existingArticle?.trending_home ?? false,
        trending_edmonton: articleData.trendingEdmonton ?? existingArticle?.trending_edmonton ?? false,
        trending_calgary: articleData.trendingCalgary ?? existingArticle?.trending_calgary ?? false,
        featured_home: articleData.featuredHome ?? existingArticle?.featured_home ?? false,
        featured_edmonton: articleData.featuredEdmonton ?? existingArticle?.featured_edmonton ?? false,
        featured_calgary: articleData.featuredCalgary ?? existingArticle?.featured_calgary ?? false,
      })
      .eq('id', articleId)
      .select()
      .single()

    if (error) {
      console.error('❌ Error updating article in Supabase:', error)
      throw error
    }

    console.log('✅ Article updated successfully in Supabase:', data.id)

    // The homepage hero is a single slot: pinning this article unpins every other
    // one, so the checkbox means "this is THE featured article" rather than
    // "add to a pile of pins where the newest silently wins".
    if (articleData.featuredHome) {
      const { error: unpinError } = await supabase
        .from('articles')
        .update({ featured_home: false })
        .eq('featured_home', true)
        .neq('id', articleId)

      if (unpinError) {
        console.warn('⚠️ Failed to unpin previous homepage hero (non-fatal):', unpinError)
      } else {
        console.log('📌 Homepage hero pinned exclusively to:', articleId)
      }
    }

    // Auto-save slug redirect if title changed
    if (existingArticle && existingArticle.title !== articleData.title) {
      try {
        const oldSlug = existingArticle.slug || createSlug(existingArticle.title)
        const newSlug = nextSlug
        if (oldSlug !== newSlug) {
          await supabase
            .from('slug_redirects')
            .upsert({ old_slug: oldSlug, new_slug: newSlug }, { onConflict: 'old_slug' })
          console.log(`✅ Slug redirect saved: ${oldSlug} → ${newSlug}`)
        }
      } catch (redirectError) {
        console.warn('⚠️ Failed to save slug redirect (non-fatal):', redirectError)
      }
    }

    // Auto-sync the updated article
    try {
      console.log('🔄 Auto-syncing updated article...')
      const syncResult = await quickSyncArticle(articleId)
      if (syncResult.success) {
        console.log('✅ Article auto-synced successfully')
      } else {
        console.warn('⚠️ Auto-sync failed, falling back to manual update:', syncResult.error)
        
        // Fallback: Manual update of optimized fallback
        const { loadOptimizedFallback } = await import('@/lib/optimized-fallback')
        const allArticles = await loadOptimizedFallback()
        
        // Find and update the article in the fallback
        const articleIndex = allArticles.findIndex(article => article.id === articleId)
        if (articleIndex !== -1) {
          const originalArticle = allArticles[articleIndex]
          allArticles[articleIndex] = {
            ...allArticles[articleIndex],
            title: articleData.title,
            content: articleContent,
            excerpt: articleData.excerpt,
            category: articleData.category,
            categories: articleData.categories,
            location: articleData.location,
            author: articleAuthor,
            tags: articleData.tags,
            type: articleData.type || 'article',
            imageUrl: articleData.imageUrl,
            trendingHome: articleData.trendingHome || false,
            trendingEdmonton: articleData.trendingEdmonton || false,
            trendingCalgary: articleData.trendingCalgary || false,
            featuredHome: articleData.featuredHome || false,
            featuredEdmonton: articleData.featuredEdmonton || false,
            featuredCalgary: articleData.featuredCalgary || false,
            date: originalArticle.createdAt || originalArticle.date || new Date().toISOString(),
            slug: nextSlug,
          }
          await updateOptimizedFallback(allArticles)
          console.log('✅ Optimized fallback updated successfully (fallback)')
        } else {
          console.warn('⚠️ Article not found in optimized fallback, adding it')
          allArticles.push({
            id: articleId,
            title: articleData.title,
            content: articleContent,
            excerpt: articleData.excerpt,
            description: articleData.excerpt,
            category: articleData.category,
            categories: articleData.categories,
            location: articleData.location,
            author: articleAuthor,
            tags: articleData.tags,
            type: articleData.type || 'article',
            status: 'published',
            imageUrl: articleData.imageUrl,
            trendingHome: articleData.trendingHome || false,
            trendingEdmonton: articleData.trendingEdmonton || false,
            trendingCalgary: articleData.trendingCalgary || false,
            featuredHome: articleData.featuredHome || false,
            featuredEdmonton: articleData.featuredEdmonton || false,
            featuredCalgary: articleData.featuredCalgary || false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            date: new Date().toISOString(),
            slug: nextSlug,
          })
          await updateOptimizedFallback(allArticles)
        }
      }
    } catch (syncError) {
      console.error('❌ Auto-sync failed, using manual fallback:', syncError)
      
      // Fallback: Manual update of optimized fallback
      try {
        const { loadOptimizedFallback } = await import('@/lib/optimized-fallback')
        const allArticles = await loadOptimizedFallback()
        
        // Find and update the article in the fallback
        const articleIndex = allArticles.findIndex(article => article.id === articleId)
        if (articleIndex !== -1) {
          const originalArticle = allArticles[articleIndex]
          allArticles[articleIndex] = {
            ...allArticles[articleIndex],
            title: articleData.title,
            content: articleContent,
            excerpt: articleData.excerpt,
            category: articleData.category,
            categories: articleData.categories,
            location: articleData.location,
            author: articleAuthor,
            tags: articleData.tags,
            type: articleData.type || 'article',
            imageUrl: articleData.imageUrl,
            trendingHome: articleData.trendingHome || false,
            trendingEdmonton: articleData.trendingEdmonton || false,
            trendingCalgary: articleData.trendingCalgary || false,
            featuredHome: articleData.featuredHome || false,
            featuredEdmonton: articleData.featuredEdmonton || false,
            featuredCalgary: articleData.featuredCalgary || false,
            date: originalArticle.createdAt || originalArticle.date || new Date().toISOString(),
            slug: nextSlug,
          }
          await updateOptimizedFallback(allArticles)
          console.log('✅ Optimized fallback updated successfully (fallback)')
        } else {
          console.warn('⚠️ Article not found in optimized fallback, adding it')
          allArticles.push({
            id: articleId,
            title: articleData.title,
            content: articleContent,
            excerpt: articleData.excerpt,
            description: articleData.excerpt,
            category: articleData.category,
            categories: articleData.categories,
            location: articleData.location,
            author: articleAuthor,
            tags: articleData.tags,
            type: articleData.type || 'article',
            status: 'published',
            imageUrl: articleData.imageUrl,
            trendingHome: articleData.trendingHome || false,
            trendingEdmonton: articleData.trendingEdmonton || false,
            trendingCalgary: articleData.trendingCalgary || false,
            featuredHome: articleData.featuredHome || false,
            featuredEdmonton: articleData.featuredEdmonton || false,
            featuredCalgary: articleData.featuredCalgary || false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            date: new Date().toISOString(),
            slug: nextSlug,
          })
          await updateOptimizedFallback(allArticles)
        }
      } catch (fallbackError) {
        console.error('❌ Failed to update optimized fallback:', fallbackError)
        // Don't fail the entire request if fallback update fails
      }
    }
    
    // Clear fast cache so the updated article appears immediately
    try {
      const { clearArticlesCache } = await import('@/lib/fast-articles')
      clearArticlesCache()
      console.log('✅ Fast cache cleared')
    } catch (cacheError) {
      console.warn('⚠️ Failed to clear fast cache:', cacheError)
    }

    // Revalidate pages to ensure updated article appears immediately
    try {
      // Page-scoped, not site-wide: revalidatePath('/', 'layout') invalidated EVERY
      // cached page on every edit, causing a flood of ISR writes. Refresh only the
      // pages that actually change.
      revalidatePath('/')
      revalidatePath('/articles')
      revalidatePath('/alberta')
      revalidatePath('/red-deer')
      revalidatePath('/lethbridge')
      revalidatePath('/edmonton')
      revalidatePath('/calgary')
      revalidatePath(`/articles/${data.slug || nextSlug}`)
      if (existingArticle?.slug && existingArticle.slug !== nextSlug) {
        revalidatePath(`/articles/${existingArticle.slug}`)
      }
      console.log('✅ Pages revalidated (including Alberta/city pages)')
    } catch (revalidateError) {
      console.error('❌ Revalidation failed:', revalidateError)
    }

    // Polls are editor-controlled: a poll object saves/replaces the article's
    // poll; an explicit null means the editor unticked the box (delete it);
    // absent means no change.
    const manualPoll = articleData.poll as { question?: string; options?: string[] } | null | undefined
    const hasManualPoll = !!(manualPoll?.question?.trim() && Array.isArray(manualPoll?.options) &&
      manualPoll.options.filter((o) => typeof o === 'string' && o.trim()).length >= 2)
    if (hasManualPoll) {
      saveManualPollForArticle(data.id, manualPoll!.question!, manualPoll!.options!)
        .catch(err => console.warn('⚠️ Manual poll save failed (non-fatal):', err))
    } else if (manualPoll === null) {
      deletePollForArticle(data.id)
        .catch(err => console.warn('⚠️ Poll removal failed (non-fatal):', err))
    }

    // Auto-notify search engines about the updated article (non-blocking)
    // Use the slug derived from the title (same as public URL), not the raw DB id
    if (data.status === 'published') {
      // after() keeps the invocation alive once the response has been sent. A
      // bare floating promise here looked fine but could be frozen mid-flight
      // the moment we returned, so the posting silently never happened.
      after(async () => {
        try {
          await notifySearchEngines(`/articles/${data.slug || nextSlug}`)
        } catch (err) {
          console.warn('⚠️ Search engine notification failed (non-fatal):', err)
        }

        try {
          // Warm the CDN first so a crawler gets a fast og:image and renders the
          // large image card, then auto-post (the social_posts unique constraint
          // means re-saving an already-shared article never reposts)
          await warmSocialPreview(data.image_url, data.slug || nextSlug)
          await postArticleToSocial({
            id: data.id,
            title: data.title,
            slug: data.slug || nextSlug,
            excerpt: data.excerpt,
            imageUrl: data.image_url,
            category: data.category,
            tags: data.tags,
          })
        } catch (err) {
          console.warn('⚠️ Social posting failed (non-fatal):', err)
        }
      })
      // Polls are editor-controlled: no automatic generation on publish
    }

    return NextResponse.json({
      success: true,
      article: data,
      message: 'Article updated successfully!'
    })

  } catch (error) {
    console.error('❌ Error in update article API:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update article', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authCheck = requireAdmin(request)
  if (!authCheck.ok) return authCheck.response

  try {
    const resolvedParams = await params
    const articleId = resolvedParams.id

    console.log('🗑️ Deleting article:', articleId)

    // Get Supabase client
    const supabase = getSupabaseClient()

    // Delete the article from Supabase
    const { error } = await supabase
      .from('articles')
      .delete()
      .eq('id', articleId)

    if (error) {
      console.error('❌ Error deleting article from Supabase:', error)
      throw error
    }

    console.log('✅ Article deleted successfully from Supabase:', articleId)

    // Also remove from the optimized fallback
    try {
      const { loadOptimizedFallback } = await import('@/lib/optimized-fallback')
      const allArticles = await loadOptimizedFallback()
      
      // Find and remove the article from the fallback
      const articleIndex = allArticles.findIndex(article => article.id === articleId)
      if (articleIndex !== -1) {
        allArticles.splice(articleIndex, 1)
        await updateOptimizedFallback(allArticles)
        console.log('✅ Article removed from optimized fallback successfully')
      } else {
        console.warn('⚠️ Article not found in optimized fallback')
      }
    } catch (fallbackError) {
      console.error('❌ Failed to update optimized fallback:', fallbackError)
      // Don't fail the entire request if fallback update fails
    }

    return NextResponse.json({ 
      success: true,
      message: 'Article deleted successfully from both Supabase and local cache!'
    })

  } catch (error) {
    console.error('❌ Error in delete article API:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete article', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

