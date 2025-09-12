import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

// API endpoint to sync articles from Supabase to local file
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Webhook triggered: Syncing articles from Supabase...')
    
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
    console.log(`✅ Fetched ${articles.length} articles from Supabase`)
    
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
      // Trending flags
      trendingHome: article.trending_home || false,
      trendingEdmonton: article.trending_edmonton || false,
      trendingCalgary: article.trending_calgary || false,
      // Featured flags
      featuredHome: article.featured_home || false,
      featuredEdmonton: article.featured_edmonton || false,
      featuredCalgary: article.featured_calgary || false
    }))
    
    // Write to articles.json file
    const articlesPath = path.join(process.cwd(), 'lib', 'data', 'articles.json')
    await fs.writeFile(articlesPath, JSON.stringify(transformedArticles, null, 2))
    
    console.log(`💾 Updated articles.json with ${transformedArticles.length} articles`)
    
    return NextResponse.json({ 
      success: true, 
      message: `Synced ${transformedArticles.length} articles`,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('❌ Error syncing articles:', error)
    return NextResponse.json(
      { error: 'Failed to sync articles', details: error.message },
      { status: 500 }
    )
  }
}

// GET endpoint to manually trigger sync
export async function GET() {
  try {
    console.log('🔄 Manual sync triggered...')
    
    // Same logic as POST but triggered manually
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://itdmwpbsnviassgqfhxk.supabase.co'
    const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0ZG13cGJzbnZpYXNzZ3FmaHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0ODU5NjUsImV4cCI6MjA2OTA2MTk2NX0.pxAXREQJrXJFZEBB3s7iwfm3rV_C383EbWCwf6ayPQo'
    
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
    
    const articlesPath = path.join(process.cwd(), 'lib', 'data', 'articles.json')
    await fs.writeFile(articlesPath, JSON.stringify(transformedArticles, null, 2))
    
    return NextResponse.json({ 
      success: true, 
      message: `Synced ${transformedArticles.length} articles`,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('❌ Error syncing articles:', error)
    return NextResponse.json(
      { error: 'Failed to sync articles', details: error.message },
      { status: 500 }
    )
  }
}
