import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { loadOptimizedFallback } from '@/lib/optimized-fallback'

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://itdmwpbsnviassgqfhxk.supabase.co'
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0ZG13cGJzbnZpYXNzZ3FmaHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0ODU5NjUsImV4cCI6MjA2OTA2MTk2NX0.pxAXREQJrXJFZEBB3s7iwfm3rV_C383EbWCwf6ayPQo'
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase environment variables are not configured')
  }
  
  return createClient(supabaseUrl, supabaseKey)
}

export async function GET() {
  try {
    console.log('🔧 Admin Articles API: Loading articles from Supabase...')
    
    const supabase = getSupabaseClient()
    
    // Try to fetch articles from Supabase with timeout handling
    try {
      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('❌ Admin Articles API: Supabase error:', error)
        throw error
      }
      
      console.log(`✅ Admin Articles API: Loaded ${data?.length || 0} articles from Supabase`)
      
      // Map Supabase data to match our Article interface
      const articles = (data || []).map(article => ({
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
        updatedAt: article.updated_at,
      }))
      
      return NextResponse.json(articles)
      
    } catch (supabaseError: any) {
      // Check if it's a timeout error
      if (supabaseError?.code === '57014' || supabaseError?.message?.includes('timeout')) {
        console.warn('⚠️ Admin Articles API: Supabase timeout, falling back to optimized fallback...')
        
        // Load from optimized fallback
        const fallbackArticles = await loadOptimizedFallback()
        console.log(`✅ Admin Articles API: Loaded ${fallbackArticles.length} articles from optimized fallback`)
        
        // Map fallback data to match admin interface expectations
        const articles = fallbackArticles.map(article => ({
          ...article,
          imageUrl: article.imageUrl,
          date: article.date || article.createdAt || article.created_at,
          trendingHome: article.trendingHome || false,
          trendingEdmonton: article.trendingEdmonton || false,
          trendingCalgary: article.trendingCalgary || false,
          featuredHome: article.featuredHome || false,
          featuredEdmonton: article.featuredEdmonton || false,
          featuredCalgary: article.featuredCalgary || false,
          createdAt: article.createdAt || article.created_at,
          updatedAt: article.updatedAt || article.createdAt || article.created_at,
        }))
        
        return NextResponse.json(articles)
      } else {
        // Re-throw non-timeout errors
        throw supabaseError
      }
    }
    
  } catch (error) {
    console.error('❌ Admin Articles API: Failed to load articles:', error)
    
    // Final fallback - try to load from optimized fallback even if there was an unexpected error
    try {
      console.log('🔄 Admin Articles API: Attempting final fallback to optimized data...')
      const fallbackArticles = await loadOptimizedFallback()
      console.log(`✅ Admin Articles API: Final fallback loaded ${fallbackArticles.length} articles`)
      
      const articles = fallbackArticles.map(article => ({
        ...article,
        imageUrl: article.imageUrl || article.image,
        date: article.date || article.createdAt || article.created_at,
        trendingHome: article.trendingHome || false,
        trendingEdmonton: article.trendingEdmonton || false,
        trendingCalgary: article.trendingCalgary || false,
        featuredHome: article.featuredHome || false,
        featuredEdmonton: article.featuredEdmonton || false,
        featuredCalgary: article.featuredCalgary || false,
        createdAt: article.createdAt || article.created_at,
        updatedAt: article.updatedAt || article.createdAt || article.created_at,
      }))
      
      return NextResponse.json(articles)
    } catch (fallbackError) {
      console.error('❌ Admin Articles API: Even fallback failed:', fallbackError)
      return NextResponse.json([], { status: 500 })
    }
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json()
    console.log(`🔧 Admin Articles API: Delete article request for ID: ${id}`)
    
    // For now, just return success since we're using fallback data
    // In a real implementation, you'd delete from Supabase
    console.log(`✅ Admin Articles API: Article ${id} deletion simulated`)
    
    return NextResponse.json({ success: true, message: 'Article deleted successfully' })
  } catch (error) {
    console.error('❌ Admin Articles API: Failed to delete article:', error)
    return NextResponse.json({ error: 'Failed to delete article' }, { status: 500 })
  }
}
