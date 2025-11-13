import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { quickSyncArticle } from '@/lib/auto-sync'
import { loadOptimizedFallback, updateOptimizedFallback } from '@/lib/optimized-fallback'
import { revalidatePath } from 'next/cache'

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

export async function POST(request: NextRequest) {
  try {
    const articleData = await request.json()
    
    console.log('📝 Creating new article:', articleData.title)

    // Get Supabase client
    const supabase = getSupabaseClient()

    // Generate a unique ID for the article
    const articleId = `article-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    // Insert the article into Supabase
    const { data, error } = await supabase
      .from('articles')
      .insert([{
        id: articleId,
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

    // Try to sync the new article to fallback file
    try {
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
        author: data.author || 'Admin',
        imageUrl: data.image_url,
        date: data.created_at,
        trendingHome: data.trending_home || false,
        trendingEdmonton: data.trending_edmonton || false,
        trendingCalgary: data.trending_calgary || false,
        featuredHome: data.featured_home || false,
        featuredEdmonton: data.featured_edmonton || false,
        featuredCalgary: data.featured_calgary || false,
        createdAt: data.created_at,
        created_at: data.created_at,
        updatedAt: data.updated_at,
        type: data.type || 'article',
        status: data.status || 'published',
        location: data.location || 'Alberta',
        tags: data.tags || [],
        slug: data.id,
      }
      allArticles.unshift(mappedArticle)
      await updateOptimizedFallback(allArticles)
      console.log('✅ Article added to fallback')
      
      // Clear fast cache so the new article appears immediately
      const { clearArticlesCache } = await import('@/lib/fast-articles')
      clearArticlesCache()
      console.log('✅ Fast cache cleared')
    } catch (syncError) {
      console.error('❌ Sync failed:', syncError)
      // Don't fail the entire request if sync fails
    }

    // Revalidate pages to ensure new article appears immediately
    try {
      revalidatePath('/', 'layout')
      revalidatePath('/articles')
      console.log('✅ Pages revalidated')
    } catch (revalidateError) {
      console.error('❌ Revalidation failed:', revalidateError)
      // Don't fail the entire request if revalidation fails
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

