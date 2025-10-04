import { NextRequest, NextResponse } from 'next/server'

// Download endpoint to get articles as a downloadable JSON file
export async function GET() {
  try {
    console.log('📥 Download request for articles...')
    
    // Supabase configuration
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://itdmwpbsnviassgqfhxk.supabase.co'
    const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0ZG13cGJzbnZpYXNzZ3FmaHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0ODU5NjUsImV4cCI6MjA2OTA2MTk2NX0.pxAXREQJrXJFZEBB3s7iwfm3rV_C383EbWCwf6ayPQo'
    
    // Fetch articles from Supabase
    const response = await fetch(`${SUPABASE_URL}/rest/v1/articles?select=*`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      throw new Error(`Supabase request failed: ${response.status} ${response.statusText}`)
    }
    
    const articles = await response.json()
    console.log(`✅ Fetched ${articles.length} articles for download`)
    
    // Transform articles to match our interface
    const transformedArticles = articles.map((article: any) => ({
      id: article.id,
      title: article.title,
      content: article.content,
      excerpt: article.excerpt,
      category: article.category,
      categories: article.categories || [article.category],
      location: article.location,
      author: article.author,
      tags: article.tags || [],
      type: article.type || 'article',
      status: article.status || 'published',
      imageUrl: article.image_url,
      date: article.created_at,
      createdAt: article.created_at,
      updatedAt: article.updated_at,
      trendingHome: article.trending_home || false,
      trendingEdmonton: article.trending_edmonton || false,
      trendingCalgary: article.trending_calgary || false,
      featuredHome: article.featured_home || false,
      featuredEdmonton: article.featured_edmonton || false,
      featuredCalgary: article.featured_calgary || false
    }))
    
    // Create filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0] // YYYY-MM-DD format
    const filename = `articles-${timestamp}.json`
    
    // Return as downloadable JSON file
    return new Response(JSON.stringify(transformedArticles, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache'
      }
    })
    
  } catch (error) {
    console.error('❌ Error downloading articles:', error)
    return NextResponse.json(
      { error: 'Failed to download articles', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
