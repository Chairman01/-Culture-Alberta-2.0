import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { loadOptimizedFallback } from '@/lib/optimized-fallback'
import { quickSyncArticle } from '@/lib/auto-sync'

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://itdmwpbsnviassgqfhxk.supabase.co'
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0ZG13cGJzbnZpYXNzZ3FmaHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0ODU5NjUsImV4cCI6MjA2OTA2MTk2NX0.pxAXREQJrXJFZEBB3s7iwfm3rV_C383EbWCwf6ayPQo'
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase environment variables are not configured')
  }
  
  return createClient(supabaseUrl, supabaseKey)
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const forceRefresh = searchParams.get('refresh') === 'true'
    
    console.log('🔧 Admin Articles API: Loading articles with live data...', forceRefresh ? '(force refresh)' : '')
    
    // Try to get live data from Supabase first (recent articles only)
    try {
      const supabase = getSupabaseClient()
      
      // Fetch recent articles with essential fields only
      const { data: liveArticles, error } = await supabase
        .from('articles')
        .select('id,title,excerpt,content,category,categories,location,author,tags,type,status,created_at,updated_at,trending_home,trending_edmonton,trending_calgary,featured_home,featured_edmonton,featured_calgary,image_url')
        .order('created_at', { ascending: false })
        .limit(100)
      
      if (!error && liveArticles && liveArticles.length > 0) {
        console.log(`✅ Admin Articles API: Loaded ${liveArticles.length} live articles from Supabase`)
        console.log(`🔍 Admin Articles API: First article title: ${liveArticles[0]?.title}`)
        console.log(`🔍 Admin Articles API: Most recent article created: ${liveArticles[0]?.created_at}`)
        
        // Map live data to match admin interface expectations
        const articles = liveArticles.map(article => ({
          ...article,
          imageUrl: article.image_url,
          date: article.created_at,
          trendingHome: article.trending_home || false,
          trendingEdmonton: article.trending_edmonton || false,
          trendingCalgary: article.trending_calgary || false,
          featuredHome: article.featured_home || false,
          featuredEdmonton: article.featured_edmonton || false,
          featuredCalgary: article.featured_calgary || false,
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
    const fallbackArticles = await loadOptimizedFallback()
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

export async function DELETE(request: Request) {
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
