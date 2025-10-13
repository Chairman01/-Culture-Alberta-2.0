import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { updateOptimizedFallback } from '@/lib/optimized-fallback'

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

    // Also update the optimized fallback
    try {
      const { loadOptimizedFallback } = await import('@/lib/optimized-fallback')
      const allArticles = await loadOptimizedFallback()
      
      // Find and update the article in the fallback
      const articleIndex = allArticles.findIndex(article => article.id === articleId)
      if (articleIndex !== -1) {
        const originalArticle = allArticles[articleIndex]
        allArticles[articleIndex] = {
          ...allArticles[articleIndex],
          ...data,
          imageUrl: articleData.imageUrl, // Ensure imageUrl is preserved
          date: originalArticle.createdAt || originalArticle.date || new Date().toISOString(), // Preserve the date
        }
        await updateOptimizedFallback(allArticles)
        console.log('✅ Optimized fallback updated successfully')
      } else {
        console.warn('⚠️ Article not found in optimized fallback, adding it')
        allArticles.push({
          ...data,
          imageUrl: articleData.imageUrl,
        })
        await updateOptimizedFallback(allArticles)
      }
    } catch (fallbackError) {
      console.error('❌ Failed to update optimized fallback:', fallbackError)
      // Don't fail the entire request if fallback update fails
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

    console.log('✅ Article deleted successfully:', articleId)

    return NextResponse.json({ 
      success: true,
      message: 'Article deleted successfully. Remember to click "Sync Now" in /admin/sync-articles to update your website!'
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

