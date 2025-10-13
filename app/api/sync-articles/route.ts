import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { clearArticlesCache } from '@/lib/fast-articles'
import { revalidatePath } from 'next/cache'

// Force dynamic rendering - no caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

// API endpoint to sync articles from Supabase to local file
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Webhook triggered: Syncing articles and events from Supabase...')
    
    // Supabase configuration
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://itdmwpbsnviassgqfhxk.supabase.co'
    const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0ZG13cGJzbnZpYXNzZ3FmaHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0ODU5NjUsImV4cCI6MjA2OTA2MTk2NX0.pxAXREQJrXJFZEBB3s7iwfm3rV_C383EbWCwf6ayPQo'
    
    // Fetch articles from Supabase (ordered by created_at descending for newest first)
    const articlesResponse = await fetch(`${SUPABASE_URL}/rest/v1/articles?select=*&order=created_at.desc`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!articlesResponse.ok) {
      throw new Error(`Supabase articles request failed: ${articlesResponse.status} ${articlesResponse.statusText}`)
    }
    
    const articles = await articlesResponse.json()
    console.log(`✅ Fetched ${articles.length} articles from Supabase`)

    // Fetch events from Supabase
    const eventsResponse = await fetch(`${SUPABASE_URL}/rest/v1/events?select=*&order=created_at.desc`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!eventsResponse.ok) {
      throw new Error(`Supabase events request failed: ${eventsResponse.status} ${eventsResponse.statusText}`)
    }
    
    const events = await eventsResponse.json()
    console.log(`✅ Fetched ${events.length} events from Supabase`)
    
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

    // Transform events to match our interface (as articles)
    const transformedEvents = events.map((event: any) => ({
      id: event.id,
      title: event.title,
      content: event.description || '',
      excerpt: event.excerpt || event.description?.substring(0, 150) + '...' || '',
      category: event.category,
      categories: [event.category],
      location: event.location,
      author: event.organizer || 'Event Organizer',
      tags: event.tags || [],
      type: 'event',
      status: event.status || 'published',
      imageUrl: event.image_url,
      date: event.event_date || event.created_at,
      createdAt: event.created_at,
      updatedAt: event.updated_at,
      // Trending flags
      trendingHome: event.featured_home || false,
      trendingEdmonton: event.featured_edmonton || false,
      trendingCalgary: event.featured_calgary || false,
      // Featured flags
      featuredHome: event.featured_home || false,
      featuredEdmonton: event.featured_edmonton || false,
      featuredCalgary: event.featured_calgary || false,
      // Event-specific fields
      eventDate: event.event_date,
      eventEndDate: event.event_end_date,
      websiteUrl: event.website_url,
      organizer: event.organizer,
      organizerContact: event.organizer_contact
    }))

    // Combine articles and events
    const allContent = [...transformedArticles, ...transformedEvents]
    console.log(`✅ Combined ${transformedArticles.length} articles and ${transformedEvents.length} events into ${allContent.length} total items`)
    
    // Check if we're in production (Vercel) or development
    const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1'
    
    // Always try to write to local file if possible
    let fileWritten = false
    try {
      // CRITICAL FIX: Update optimized-fallback.json (PRIMARY FILE)
      const optimizedFallbackPath = path.join(process.cwd(), 'optimized-fallback.json')
      await fs.writeFile(optimizedFallbackPath, JSON.stringify(allContent, null, 2))
      console.log(`💾 ✅ Updated optimized-fallback.json with ${allContent.length} total items (${transformedArticles.length} articles + ${transformedEvents.length} events)`)
      fileWritten = true
      
      // ALSO update lib/data/articles.json for backward compatibility
      const articlesPath = path.join(process.cwd(), 'lib', 'data', 'articles.json')
      await fs.writeFile(articlesPath, JSON.stringify(allContent, null, 2))
      console.log(`💾 Also updated lib/data/articles.json for backward compatibility`)
      
      // Clear fast cache to force reload
      clearArticlesCache()
      console.log('🔄 Cleared fast articles cache')
    } catch (fileError) {
      console.log('⚠️ Could not write to local file (this is normal in production):', fileError)
    }
    
    // CRITICAL FIX: Direct revalidation after sync
    try {
      console.log('🔄 Revalidating all pages after POST sync...')
      revalidatePath('/', 'layout') // Revalidate entire app
      revalidatePath('/') // Homepage
      revalidatePath('/edmonton')
      revalidatePath('/calgary')
      revalidatePath('/food-drink')
      revalidatePath('/culture')
      revalidatePath('/events')
      revalidatePath('/articles')
      console.log('✅ Pages revalidated successfully')
    } catch (revalidateError) {
      console.log('⚠️ Revalidation failed, but sync was successful:', revalidateError)
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `Synced ${transformedArticles.length} articles and ${transformedEvents.length} events${fileWritten ? ' to local file' : ''} and triggered page revalidation`,
      timestamp: new Date().toISOString(),
      environment: isProduction ? 'production' : 'development',
      fileWritten,
      articlesCount: allContent.length,
      eventsCount: transformedEvents.length,
      downloadUrl: '/api/sync-articles/download'
    })
    
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
    console.log('🔄 Manual sync triggered: Syncing articles and events...')
    
    // Same logic as POST but triggered manually
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://itdmwpbsnviassgqfhxk.supabase.co'
    const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0ZG13cGJzbnZpYXNzZ3FmaHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0ODU5NjUsImV4cCI6MjA2OTA2MTk2NX0.pxAXREQJrXJFZEBB3s7iwfm3rV_C383EbWCwf6ayPQo'
    
    // Fetch articles from Supabase (ordered by created_at descending for newest first)
    const articlesResponse = await fetch(`${SUPABASE_URL}/rest/v1/articles?select=*&order=created_at.desc`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!articlesResponse.ok) {
      throw new Error(`Supabase articles request failed: ${articlesResponse.status} ${articlesResponse.statusText}`)
    }
    
    const articles = await articlesResponse.json()
    console.log(`✅ Fetched ${articles.length} articles from Supabase`)

    // Fetch events from Supabase
    const eventsResponse = await fetch(`${SUPABASE_URL}/rest/v1/events?select=*&order=created_at.desc`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!eventsResponse.ok) {
      throw new Error(`Supabase events request failed: ${eventsResponse.status} ${eventsResponse.statusText}`)
    }
    
    const events = await eventsResponse.json()
    console.log(`✅ Fetched ${events.length} events from Supabase`)
    
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

    // Transform events to match our interface (as articles)
    const transformedEvents = events.map((event: any) => ({
      id: event.id,
      title: event.title,
      content: event.description || '',
      excerpt: event.excerpt || event.description?.substring(0, 150) + '...' || '',
      category: event.category,
      categories: [event.category],
      location: event.location,
      author: event.organizer || 'Event Organizer',
      tags: event.tags || [],
      type: 'event',
      status: event.status || 'published',
      imageUrl: event.image_url,
      date: event.event_date || event.created_at,
      createdAt: event.created_at,
      updatedAt: event.updated_at,
      // Trending flags
      trendingHome: event.featured_home || false,
      trendingEdmonton: event.featured_edmonton || false,
      trendingCalgary: event.featured_calgary || false,
      // Featured flags
      featuredHome: event.featured_home || false,
      featuredEdmonton: event.featured_edmonton || false,
      featuredCalgary: event.featured_calgary || false,
      // Event-specific fields
      eventDate: event.event_date,
      eventEndDate: event.event_end_date,
      websiteUrl: event.website_url,
      organizer: event.organizer,
      organizerContact: event.organizer_contact
    }))

    // Combine articles and events
    const allContent = [...transformedArticles, ...transformedEvents]
    console.log(`✅ Combined ${transformedArticles.length} articles and ${transformedEvents.length} events into ${allContent.length} total items`)
    
    // Check if we're in production (Vercel) or development
    const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1'
    
    // Always try to write to local file if possible
    let fileWritten = false
    try {
      // CRITICAL FIX: Update optimized-fallback.json (PRIMARY FILE)
      const optimizedFallbackPath = path.join(process.cwd(), 'optimized-fallback.json')
      await fs.writeFile(optimizedFallbackPath, JSON.stringify(allContent, null, 2))
      console.log(`💾 ✅ Updated optimized-fallback.json with ${allContent.length} total items (${transformedArticles.length} articles + ${transformedEvents.length} events)`)
      fileWritten = true
      
      // ALSO update lib/data/articles.json for backward compatibility
      const articlesPath = path.join(process.cwd(), 'lib', 'data', 'articles.json')
      await fs.writeFile(articlesPath, JSON.stringify(allContent, null, 2))
      console.log(`💾 Also updated lib/data/articles.json for backward compatibility`)
      
      // Clear fast cache to force reload
      clearArticlesCache()
      console.log('🔄 Cleared fast articles cache')
    } catch (fileError) {
      console.log('⚠️ Could not write to local file (this is normal in production):', fileError)
    }
    
    // CRITICAL FIX: Direct revalidation after GET sync
    try {
      console.log('🔄 Revalidating all pages after GET sync...')
      revalidatePath('/', 'layout') // Revalidate entire app
      revalidatePath('/') // Homepage
      revalidatePath('/edmonton')
      revalidatePath('/calgary')
      revalidatePath('/food-drink')
      revalidatePath('/culture')
      revalidatePath('/events')
      revalidatePath('/articles')
      console.log('✅ Pages revalidated successfully')
    } catch (revalidateError) {
      console.log('⚠️ Revalidation failed, but sync was successful:', revalidateError)
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `Synced ${transformedArticles.length} articles and ${transformedEvents.length} events${fileWritten ? ' to local file' : ''} and triggered page revalidation`,
      timestamp: new Date().toISOString(),
      environment: isProduction ? 'production' : 'development',
      fileWritten,
      articlesCount: allContent.length,
      eventsCount: transformedEvents.length,
      downloadUrl: '/api/sync-articles/download'
    })
    
  } catch (error) {
    console.error('❌ Error syncing articles:', error)
    return NextResponse.json(
      { error: 'Failed to sync articles', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
