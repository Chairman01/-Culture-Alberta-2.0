import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { loadOptimizedFallback } from '@/lib/optimized-fallback'
import { quickSyncArticle } from '@/lib/auto-sync'
import { requireAdmin, requireAdminOrContributor } from '@/lib/admin-auth'
import { getServiceClient } from '@/lib/supabase-admin'

// Admin reads and writes go through the service role, not the anon key. The
// anon key is public (it ships in the browser bundle), so every table it can
// write is a table the internet can write — which is why the articles RLS
// policy had to be `USING (true)` for this route to work at all.
const getSupabaseClient = getServiceClient

export async function GET(request: NextRequest) {
  const auth = requireAdminOrContributor(request)
  if (!auth.ok) return auth.response
  // A writer sees only their own work. Scope by account id where the article
  // has one; fall back to the byline for articles written under the old shared
  // contributor login, which predate per-writer accounts.
  const isContributor = auth.role === 'contributor'
  const contributorUserId = isContributor ? auth.userId : null
  const contributorAuthor = isContributor ? (auth.name || auth.username) : null

  try {
    const { searchParams } = new URL(request.url)
    const forceRefresh = searchParams.get('refresh') === 'true'

    console.log('🔧 Admin Articles API: Loading articles with live data...', forceRefresh ? '(force refresh)' : '')

    // Try to get live data from Supabase first (recent articles only)
    try {
      const supabase = getSupabaseClient()

      // Fetch all articles with essential fields only (EXCLUDE image data for performance)
      let query = supabase
        .from('articles')
        .select('id,title,excerpt,content,category,categories,location,author,author_user_id,tags,type,status,review_status,review_note,reviewed_at,reviewed_by,created_at,updated_at,trending_home,trending_edmonton,trending_calgary,featured_home,featured_edmonton,featured_calgary')
        .order('created_at', { ascending: false })

      if (contributorUserId) {
        query = query.eq('author_user_id', contributorUserId)
      } else if (contributorAuthor) {
        query = query.eq('author', contributorAuthor)
      }

      const { data: liveArticles, error } = await query

      if (!error && liveArticles && liveArticles.length > 0) {
        console.log(`✅ Admin Articles API: Loaded ${liveArticles.length} live articles from Supabase`)
        console.log(`🔍 Admin Articles API: First article title: ${liveArticles[0]?.title}`)
        console.log(`🔍 Admin Articles API: Most recent article created: ${liveArticles[0]?.created_at}`)

        // Map live data to match admin interface expectations
        const articles = liveArticles.map(article => ({
          ...article,
          imageUrl: '', // Image data excluded for performance - loads when editing individual articles
          date: article.created_at,
          trendingHome: article.trending_home || false,
          trendingEdmonton: article.trending_edmonton || false,
          trendingCalgary: article.trending_calgary || false,
          featuredHome: article.featured_home || false,
          featuredEdmonton: article.featured_edmonton || false,
          featuredCalgary: article.featured_calgary || false,
          // The review trail, so a writer can see the one-line reason a draft
          // came back instead of having to ask what happened to it.
          reviewStatus: article.review_status || 'pending',
          reviewNote: article.review_note || '',
          reviewedAt: article.reviewed_at || null,
          reviewedBy: article.reviewed_by || '',
          createdAt: article.created_at,
          updatedAt: article.updated_at || article.created_at,
        }))

        return NextResponse.json(articles)
      } else {
        console.log(`⚠️ Admin Articles API: No live articles found or error occurred. Error: ${error?.message}`)
      }
    } catch (supabaseError) {
      console.warn('⚠️ Admin Articles API: Supabase failed, falling back to optimized fallback:', supabaseError)
    }

    // Fallback to optimized fallback if Supabase fails
    console.log('🔧 Admin Articles API: Falling back to optimized fallback...')
    const fallbackArticles = (await loadOptimizedFallback())
      .filter(article => !contributorAuthor || article.author === contributorAuthor)
    console.log(`✅ Admin Articles API: Loaded ${fallbackArticles.length} articles from optimized fallback`)

    // Map fallback data to match admin interface expectations
    const articles = fallbackArticles.map(article => ({
      ...article,
      imageUrl: article.imageUrl,
      date: article.date || article.createdAt,
      trendingHome: article.trendingHome || false,
      trendingEdmonton: article.trendingEdmonton || false,
      trendingCalgary: article.trendingCalgary || false,
      featuredHome: article.featuredHome || false,
      featuredEdmonton: article.featuredEdmonton || false,
      featuredCalgary: article.featuredCalgary || false,
      createdAt: article.createdAt,
      updatedAt: article.updatedAt || article.createdAt,
    }))

    return NextResponse.json(articles)

  } catch (error) {
    console.error('❌ Admin Articles API: Failed to load articles:', error)
    return NextResponse.json([], { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const auth = requireAdmin(request)
  if (!auth.ok) return auth.response

  try {
    const { id } = await request.json()
    console.log(`🔧 Admin Articles API: Delete article request for ID: ${id}`)

    // Load the current fallback data
    const { loadOptimizedFallback } = await import('@/lib/optimized-fallback')
    const allArticles = await loadOptimizedFallback()

    // Find and remove the article
    const articleIndex = allArticles.findIndex(article => article.id === id)
    if (articleIndex === -1) {
      console.log(`⚠️ Admin Articles API: Article ${id} not found in fallback`)
      return NextResponse.json({ error: 'Article not found' }, { status: 404 })
    }

    // Remove the article from the array
    allArticles.splice(articleIndex, 1)

    // Save the updated fallback data
    const fs = await import('fs')
    const path = await import('path')
    const fallbackPath = path.join(process.cwd(), 'optimized-fallback.json')
    fs.writeFileSync(fallbackPath, JSON.stringify(allArticles, null, 2), 'utf-8')

    console.log(`✅ Admin Articles API: Article ${id} deleted from fallback`)

    return NextResponse.json({ success: true, message: 'Article deleted successfully' })
  } catch (error) {
    console.error('❌ Admin Articles API: Failed to delete article:', error)
    return NextResponse.json({ error: 'Failed to delete article' }, { status: 500 })
  }
}
