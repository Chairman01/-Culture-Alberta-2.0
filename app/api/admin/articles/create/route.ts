import { NextRequest, NextResponse, after } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { quickSyncArticle } from '@/lib/auto-sync'
import { loadOptimizedFallback, updateOptimizedFallback } from '@/lib/optimized-fallback'
import { revalidatePath } from 'next/cache'
import { notifySearchEngines } from '@/lib/indexing'
import { postArticleToSocial } from '@/lib/social'
import { warmSocialPreview } from '@/lib/social-image-url'
import { saveManualPollForArticle } from '@/lib/poll-generator'
import { requireAdminOrContributor } from '@/lib/admin-auth'
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

async function generateArticleSlug(supabase: ReturnType<typeof getSupabaseClient>, title: string) {
  const baseSlug = createSlug(title)
  const { data, error } = await supabase
    .from('articles')
    .select('slug')
    .not('slug', 'is', null)

  if (error) {
    console.warn('⚠️ Could not fetch existing slugs; using base slug:', error.message)
    return baseSlug
  }

  const existingSlugs = (data || []).map(article => article.slug).filter(Boolean)
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

export async function POST(request: NextRequest) {
  const auth = requireAdminOrContributor(request)
  if (!auth.ok) return auth.response
  // A writer's byline is their display name ("Tiffany"), never the username
  // they type at the login form, and never whatever the request body claims.
  const articleOwner = auth.role === 'contributor'
    ? auth.name
    : undefined

  try {
    const articleData = await request.json()
    const articleAuthor = articleOwner || articleData.author || 'Admin'

    // Contributors submit for review — they never publish. Forcing the status
    // here rather than trusting the request body is the whole approval gate:
    // the editor UI hides the option, but the API is what an outside caller
    // hits. A published status is also what fires IndexNow and the social
    // autopost below, so this must be decided server-side from the JWT role.
    const articleStatus = auth.role === 'contributor'
      ? 'draft'
      : (articleData.status || 'published')

    // Article bodies are rendered with dangerouslySetInnerHTML on the public
    // article page and processArticleContent does not sanitize, so a stored
    // <script> would execute for every visitor once approved. Contributor HTML
    // is scrubbed on the way in. Admin content is left untouched — it may carry
    // hand-placed embeds that the scrubber would strip.
    const articleContent = auth.role === 'contributor'
      ? sanitizeAdminHtml(articleData.content || '')
      : articleData.content

    console.log('📝 Creating new article:', articleData.title)

    if (!hasMeaningfulContent(articleData.content)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Article content is required',
          details: 'Add the full article body before publishing.',
        },
        { status: 400 }
      )
    }

    // Get Supabase client
    const supabase = getSupabaseClient()

    // Generate a unique ID for the article
    const articleId = `article-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const articleSlug = articleData.slug || await generateArticleSlug(supabase, articleData.title)
    
    // Insert the article into Supabase
    const { data, error } = await supabase
      .from('articles')
      .insert([{
        id: articleId,
        title: articleData.title,
        content: articleContent,
        excerpt: articleData.excerpt,
        category: articleData.category,
        categories: articleData.categories,
        location: articleData.location,
        author: articleAuthor,
        // Ownership by account id, not by byline. Scoping a writer to their own
        // drafts on a name match breaks the moment two writers share a first
        // name or somebody's display name is edited.
        author_user_id: auth.userId,
        tags: articleData.tags,
        type: articleData.type || 'article',
        status: articleStatus,
        // Where it sits in the review queue. An admin's own work is approved by
        // definition; a writer's starts out waiting.
        review_status: auth.role === 'contributor' ? 'pending' : 'approved',
        image_url: articleData.imageUrl,
        slug: articleSlug,
        image_source: articleData.imageSource || null,
        trending_home: articleData.trendingHome || false,
        trending_edmonton: articleData.trendingEdmonton || false,
        trending_calgary: articleData.trendingCalgary || false,
        featured_home: articleData.featuredHome || false,
        featured_edmonton: articleData.featuredEdmonton || false,
        featured_calgary: articleData.featuredCalgary || false,
        // `date` is the display/publish date and MUST be set: recommendation and
        // listing queries sort by it, and rows with NULL date sort last — articles
        // created May–July 2026 without it never appeared in recommendations.
        date: articleData.date || new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }])
      .select()
      .single()

    if (error) {
      console.error('❌ Error creating article in Supabase:', error)
      throw error
    }

    console.log('✅ Article created successfully:', data.id)

    // The homepage hero is a single slot — see the same block in the [id] update
    // route. Pinning this article unpins whatever was pinned before.
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

    // Try to sync the new article to fallback file. Drafts stay out of it —
    // optimized-fallback.json is what the public site reads when Supabase is
    // slow, so an unapproved contributor draft has no business being in it.
    // (The article page filters drafts too; this keeps them out a layer earlier.)
    try {
      if (articleStatus !== 'published') {
        console.log('📝 Draft — skipping public fallback sync')
      } else {
      console.log('🔄 Auto-syncing new article to fallback...')

      // Fallback: Manual update of optimized fallback (more reliable)
      const allArticles = await loadOptimizedFallback()
      const mappedArticle = {
        id: data.id,
        title: data.title,
        excerpt: data.excerpt || '',
        description: data.excerpt || '',
        content: data.content || '',
        category: data.category || 'General',
        categories: data.categories || [],
        author: data.author || articleAuthor,
        imageUrl: data.image_url,
        date: data.created_at,
        trendingHome: data.trending_home || false,
        trendingEdmonton: data.trending_edmonton || false,
        trendingCalgary: data.trending_calgary || false,
        trendingAlberta: data.trending_alberta || false,
        featuredHome: data.featured_home || false,
        featuredEdmonton: data.featured_edmonton || false,
        featuredCalgary: data.featured_calgary || false,
        featuredAlberta: data.featured_alberta || false,
        createdAt: data.created_at,
        created_at: data.created_at,
        updatedAt: data.updated_at,
        type: data.type || 'article',
        status: data.status || 'published',
        location: data.location || 'Alberta',
        tags: data.tags || [],
        slug: data.slug || createSlug(data.title),
      }
      allArticles.unshift(mappedArticle)
      await updateOptimizedFallback(allArticles)
      console.log('✅ Article added to fallback')
      
      // Clear fast cache so the new article appears immediately
      const { clearArticlesCache } = await import('@/lib/fast-articles')
      clearArticlesCache()
      console.log('✅ Fast cache cleared')
      }
    } catch (syncError) {
      console.error('❌ Sync failed:', syncError)
      // Don't fail the entire request if sync fails
    }

    // Revalidate pages to ensure new article appears immediately
    try {
      // Page-scoped, not site-wide ('/', 'layout') — avoids flooding ISR writes.
      // Refresh the homepage + the city hubs where a new article surfaces.
      revalidatePath('/')
      revalidatePath('/articles')
      revalidatePath('/edmonton')
      revalidatePath('/calgary')
      revalidatePath('/alberta')
      revalidatePath(`/articles/${data.slug || articleSlug}`)
      revalidatePath('/sitemap.xml')
      console.log('✅ Pages revalidated')
    } catch (revalidateError) {
      console.error('❌ Revalidation failed:', revalidateError)
      // Don't fail the entire request if revalidation fails
    }

    // A poll written in the editor always wins over AI generation, and saves
    // even on drafts so it goes live together with the article
    const manualPoll = articleData.poll as { question?: string; options?: string[] } | undefined
    const hasManualPoll = !!(manualPoll?.question?.trim() && Array.isArray(manualPoll?.options) &&
      manualPoll.options.filter((o) => typeof o === 'string' && o.trim()).length >= 2)
    if (hasManualPoll) {
      saveManualPollForArticle(data.id, manualPoll!.question!, manualPoll!.options!)
        .catch(err => console.warn('⚠️ Manual poll save failed (non-fatal):', err))
    }

    // Auto-notify search engines about the new article (non-blocking)
    if (data.status === 'published') {
      // after() keeps the invocation alive once the response has been sent — a
      // floating promise can be frozen the moment we return, silently skipping
      // both the ping and the post.
      after(async () => {
        try {
          await notifySearchEngines(`/articles/${data.slug || articleSlug}`)
        } catch (err) {
          console.warn('⚠️ Search engine notification failed (non-fatal):', err)
        }

        try {
          // Warm the CDN first so a crawler gets a fast og:image and renders the
          // large image card, then auto-post (deduped per article+platform)
          await warmSocialPreview(data.image_url, data.slug || articleSlug)
          await postArticleToSocial({
            id: data.id,
            title: data.title,
            slug: data.slug || articleSlug,
            excerpt: data.excerpt,
            imageUrl: data.image_url,
            category: data.category,
            tags: data.tags,
          })
        } catch (err) {
          console.warn('⚠️ Social posting failed (non-fatal):', err)
        }
      })
      // Polls are editor-controlled: no automatic generation on publish. The
      // article has a poll only if the editor ticked the box and wrote one.
    }

    return NextResponse.json({
      success: true,
      article: data,
      message: 'Article created successfully!'
    })

  } catch (error) {
    console.error('❌ Error in create article API:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create article', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

