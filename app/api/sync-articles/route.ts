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
    
    // Check if we're in production (Vercel) or development
    const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1'
    
    if (isProduction) {
      // In production, we can't write to the file system
      // Instead, we'll trigger a revalidation of the static pages
      console.log('🚀 Production environment detected - triggering revalidation instead of file write')
      
      // Trigger revalidation of the homepage and other static pages
      try {
        await fetch(`${process.env.VERCEL_URL || 'https://culturealberta.com'}/api/revalidate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            paths: ['/', '/edmonton', '/calgary', '/food-drink', '/events']
          })
        })
        console.log('✅ Triggered revalidation for static pages')
      } catch (revalidateError) {
        console.log('⚠️ Revalidation failed, but sync was successful:', revalidateError)
      }
      
      return NextResponse.json({ 
        success: true, 
        message: `Synced ${transformedArticles.length} articles and triggered page revalidation`,
        timestamp: new Date().toISOString(),
        environment: 'production'
      })
    } else {
      // In development, write to the local file
      const articlesPath = path.join(process.cwd(), 'lib', 'data', 'articles.json')
      await fs.writeFile(articlesPath, JSON.stringify(transformedArticles, null, 2))
      
      console.log(`💾 Updated articles.json with ${transformedArticles.length} articles`)
      
      return NextResponse.json({ 
        success: true, 
        message: `Synced ${transformedArticles.length} articles to local file`,
        timestamp: new Date().toISOString(),
        environment: 'development'
      })
    }
    
  } catch (error) {
    console.error('❌ Error syncing articles:', error)
    return NextResponse.json(
      { error: 'Failed to sync articles', details: error instanceof Error ? error.message : 'Unknown error' },
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
    
    // Check if we're in production (Vercel) or development
    const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1'
    
    if (isProduction) {
      // In production, we can't write to the file system
      // Instead, we'll trigger a revalidation of the static pages
      console.log('🚀 Production environment detected - triggering revalidation instead of file write')
      
      // Trigger revalidation of the homepage and other static pages
      try {
        await fetch(`${process.env.VERCEL_URL || 'https://culturealberta.com'}/api/revalidate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            paths: ['/', '/edmonton', '/calgary', '/food-drink', '/events']
          })
        })
        console.log('✅ Triggered revalidation for static pages')
      } catch (revalidateError) {
        console.log('⚠️ Revalidation failed, but sync was successful:', revalidateError)
      }
      
      return NextResponse.json({ 
        success: true, 
        message: `Synced ${transformedArticles.length} articles and triggered page revalidation`,
        timestamp: new Date().toISOString(),
        environment: 'production'
      })
    } else {
      // In development, write to the local file
      const articlesPath = path.join(process.cwd(), 'lib', 'data', 'articles.json')
      await fs.writeFile(articlesPath, JSON.stringify(transformedArticles, null, 2))
      
      console.log(`💾 Updated articles.json with ${transformedArticles.length} articles`)
      
      return NextResponse.json({ 
        success: true, 
        message: `Synced ${transformedArticles.length} articles to local file`,
        timestamp: new Date().toISOString(),
        environment: 'development'
      })
    }
    
  } catch (error) {
    console.error('❌ Error syncing articles:', error)
    return NextResponse.json(
      { error: 'Failed to sync articles', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
