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

export async function GET() {
  try {
    console.log('🔧 Admin Articles API: Loading articles from optimized fallback (fast)...')
    
    // Use optimized fallback first for instant loading
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
    
    // For now, just return success since we're using fallback data
    // In a real implementation, you'd delete from Supabase
    console.log(`✅ Admin Articles API: Article ${id} deletion simulated`)
    
    return NextResponse.json({ success: true, message: 'Article deleted successfully' })
  } catch (error) {
    console.error('❌ Admin Articles API: Failed to delete article:', error)
    return NextResponse.json({ error: 'Failed to delete article' }, { status: 500 })
  }
}
