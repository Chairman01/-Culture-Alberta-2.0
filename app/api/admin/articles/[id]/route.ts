import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { updateOptimizedFallback } from '@/lib/optimized-fallback'
import { quickSyncArticle } from '@/lib/auto-sync'
import { revalidatePath } from 'next/cache'
import { notifySearchEngines } from '@/lib/indexing'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://itdmwpbsnviassgqfhxk.supabase.co'
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0ZG13cGJzbnZpYXNzZ3FmaHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0ODU5NjUsImV4cCI6MjA2OTA2MTk2NX0.pxAXREQJrXJFZEBB3s7iwfm3rV_C383EbWCwf6ayPQo'
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase environment variables are not configured')
  }
  
  return createClient(supabaseUrl, supabaseKey)
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const mapped = {
      ...data,
      imageUrl: data.image_url || data.image || '',
      date: data.created_at,
      trendingHome: data.trending_home || false,
      trendingEdmonton: data.trending_edmonton || false,
      trendingCalgary: data.trending_calgary || false,
      featuredHome: data.featured_home || false,
      featuredEdmonton: data.featured_edmonton || false,
      featuredCalgary: data.featured_calgary || false,
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
  try {
    const articleData = await request.json()
    const resolvedParams = await params
    const articleId = resolvedParams.id
    
    console.log('✏️ Updating article:', articleId, articleData.title)

    // Get Supabase client
    const supabase = getSupabaseClient()

    // Update the article in Supabase
    const { data, error } = await supabase
      .from('articles')
      .update({
        title: articleData.title,
        content: articleData.content,
        excerpt: articleData.excerpt,
        category: articleData.category,
        categories: articleData.categories,
        location: articleData.location,
        author: articleData.author,
        tags: articleData.tags,
        type: articleData.type || 'article',
        status: articleData.status || 'published',
        image_url: articleData.imageUrl,
        trending_home: articleData.trendingHome || false,
        trending_edmonton: articleData.trendingEdmonton || false,
        trending_calgary: articleData.trendingCalgary || false,
        featured_home: articleData.featuredHome || false,
        featured_edmonton: articleData.featuredEdmonton || false,
        featured_calgary: articleData.featuredCalgary || false,
      })
      .eq('id', articleId)
      .select()
      .single()

    if (error) {
      console.error('❌ Error updating article in Supabase:', error)
      throw error
    }

    console.log('✅ Article updated successfully in Supabase:', data.id)

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
            content: articleData.content,
            excerpt: articleData.excerpt,
            category: articleData.category,
            categories: articleData.categories,
            location: articleData.location,
            author: articleData.author,
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
          }
          await updateOptimizedFallback(allArticles)
          console.log('✅ Optimized fallback updated successfully (fallback)')
        } else {
          console.warn('⚠️ Article not found in optimized fallback, adding it')
          allArticles.push({
            id: articleId,
            title: articleData.title,
            content: articleData.content,
            excerpt: articleData.excerpt,
            description: articleData.excerpt,
            category: articleData.category,
            categories: articleData.categories,
            location: articleData.location,
            author: articleData.author,
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
            slug: articleId,
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
            content: articleData.content,
            excerpt: articleData.excerpt,
            category: articleData.category,
            categories: articleData.categories,
            location: articleData.location,
            author: articleData.author,
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
          }
          await updateOptimizedFallback(allArticles)
          console.log('✅ Optimized fallback updated successfully (fallback)')
        } else {
          console.warn('⚠️ Article not found in optimized fallback, adding it')
          allArticles.push({
            id: articleId,
            title: articleData.title,
            content: articleData.content,
            excerpt: articleData.excerpt,
            description: articleData.excerpt,
            category: articleData.category,
            categories: articleData.categories,
            location: articleData.location,
            author: articleData.author,
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
            slug: articleId,
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
      revalidatePath('/', 'layout')
      revalidatePath('/articles')
      console.log('✅ Pages revalidated')
    } catch (revalidateError) {
      console.error('❌ Revalidation failed:', revalidateError)
    }

    // Auto-notify search engines about the updated article (non-blocking)
    if (data.status === 'published') {
      notifySearchEngines(`/articles/${articleId}`).catch(err =>
        console.warn('⚠️ Search engine notification failed (non-fatal):', err)
      )
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

