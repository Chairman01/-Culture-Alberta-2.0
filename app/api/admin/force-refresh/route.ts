import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://itdmwpbsnviassgqfhxk.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0ZG13cGJzbnZpYXNzZ3FmaHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0ODU5NjUsImV4cCI6MjA2OTA2MTk2NX0.pxAXREQJrXJFZEBB3s7iwfm3rV_C383EbWCwf6ayPQo'

const supabase = createClient(supabaseUrl, supabaseKey)

export async function POST() {
  try {
    console.log('🔄 Force refresh: Syncing articles from Supabase...')
    
    // Fetch recent articles from Supabase
    const { data: articles, error } = await supabase
      .from('articles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    
    if (error) {
      console.error('❌ Force refresh Supabase error:', error)
      return NextResponse.json({ 
        success: false, 
        error: error.message,
        message: 'Failed to fetch from Supabase'
      }, { status: 500 })
    }
    
    console.log(`✅ Force refresh: Fetched ${articles?.length || 0} articles from Supabase`)
    
    if (!articles || articles.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'No articles found' 
      }, { status: 404 })
    }
    
    // Map articles to match the expected format
    const mappedArticles = articles.map(article => ({
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
    
    // Write to fallback file
    const fallbackPath = path.join(process.cwd(), 'optimized-fallback.json')
    fs.writeFileSync(fallbackPath, JSON.stringify(mappedArticles, null, 2))
    
    console.log(`✅ Force refresh: Updated fallback file with ${mappedArticles.length} articles`)
    
    // Show recent articles
    const recentArticles = mappedArticles.slice(0, 5).map((article, index) => ({
      index: index + 1,
      title: article.title,
      type: article.type,
      createdAt: article.createdAt
    }))
    
    return NextResponse.json({ 
      success: true, 
      message: `Updated fallback file with ${mappedArticles.length} articles`,
      articleCount: mappedArticles.length,
      recentArticles
    })
    
  } catch (error) {
    console.error('❌ Force refresh failed:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Force refresh failed'
    }, { status: 500 })
  }
}