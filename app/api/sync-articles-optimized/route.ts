import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

export const revalidate = 0

// OPTIMIZED sync endpoint to prevent timeouts
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 OPTIMIZED SYNC: Syncing articles and events from Supabase...')
    
    // Supabase configuration
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://itdmwpbsnviassgqfhxk.supabase.co'
    const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0ZG13cGJzbnZpYXNzZ3FmaHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0ODU5NjUsImV4cCI6MjA2OTA2MTk2NX0.pxAXREQJrXJFZEBB3s7iwfm3rV_C383EbWCwf6ayPQo'
    
    // OPTIMIZED: Fetch only recent articles (last 50) with essential fields only
    const articlesResponse = await fetch(`${SUPABASE_URL}/rest/v1/articles?select=id,title,excerpt,content,category,categories,location,author,tags,type,status,created_at,updated_at,trending_home,trending_edmonton,trending_calgary,featured_home,featured_edmonton,featured_calgary,image_url,event_date,event_end_date,organizer&order=created_at.desc&limit=50`, {
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
    console.log(`✅ OPTIMIZED: Fetched ${articles.length} recent articles from Supabase`)

    // OPTIMIZED: Fetch only recent events (last 25) with essential fields only
    const eventsResponse = await fetch(`${SUPABASE_URL}/rest/v1/events?select=id,title,excerpt,content,category,categories,location,author,tags,type,status,created_at,updated_at,trending_home,trending_edmonton,trending_calgary,featured_home,featured_edmonton,featured_calgary,image_url,event_date,event_end_date,organizer&order=created_at.desc&limit=25`, {
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
    console.log(`✅ OPTIMIZED: Fetched ${events.length} recent events from Supabase`)
    
    // Transform articles to match our interface
    const transformedArticles = articles.map((article: any) => ({
      id: article.id,
      title: article.title,
      content: article.content || '',
      excerpt: article.excerpt || '',
      category: article.category || 'General',
      categories: article.categories || [article.category || 'General'],
      location: article.location || 'Alberta',
      author: article.author || 'Culture Alberta',
      tags: article.tags || [],
      type: article.type || 'article',
      status: article.status || 'published',
      createdAt: article.created_at,
      updatedAt: article.updated_at,
      date: article.created_at,
      imageUrl: article.image_url || null,
      trendingHome: article.trending_home || false,
      trendingEdmonton: article.trending_edmonton || false,
      trendingCalgary: article.trending_calgary || false,
      featuredHome: article.featured_home || false,
      featuredEdmonton: article.featured_edmonton || false,
      featuredCalgary: article.featured_calgary || false,
      // Event-specific fields
      event_date: article.event_date || undefined,
      event_end_date: article.event_end_date || undefined,
      organizer: article.organizer || undefined
    }))
    
    // Transform events to match our interface
    const transformedEvents = events.map((event: any) => ({
      id: event.id,
      title: event.title,
      content: event.content || '',
      excerpt: event.excerpt || '',
      category: event.category || 'Event',
      categories: event.categories || [event.category || 'Event'],
      location: event.location || 'Alberta',
      author: event.author || 'Event Organizer',
      tags: event.tags || [],
      type: 'event',
      status: event.status || 'published',
      createdAt: event.created_at,
      updatedAt: event.updated_at,
      date: event.event_date || event.created_at,
      imageUrl: event.image_url || null,
      trendingHome: event.trending_home || false,
      trendingEdmonton: event.trending_edmonton || false,
      trendingCalgary: event.trending_calgary || false,
      featuredHome: event.featured_home || false,
      featuredEdmonton: event.featured_edmonton || false,
      featuredCalgary: event.featured_calgary || false,
      // Event-specific fields
      event_date: event.event_date || undefined,
      event_end_date: event.event_end_date || undefined,
      organizer: event.organizer || undefined
    }))
    
    // Combine articles and events
    const allContent = [...transformedArticles, ...transformedEvents]
    
    // Write to optimized-fallback.json
    const fs = require('fs')
    const path = require('path')
    
    const optimizedFallbackPath = path.join(process.cwd(), 'optimized-fallback.json')
    fs.writeFileSync(optimizedFallbackPath, JSON.stringify(allContent, null, 2), 'utf-8')
    console.log(`✅ OPTIMIZED: Updated optimized-fallback.json with ${allContent.length} items`)
    
    // Revalidate pages
    revalidatePath('/', 'layout')
    revalidatePath('/articles')
    revalidatePath('/events')
    
    return NextResponse.json({ 
      success: true, 
      count: allContent.length,
      articles: transformedArticles.length,
      events: transformedEvents.length,
      message: `Successfully synced ${allContent.length} items (${transformedArticles.length} articles, ${transformedEvents.length} events)`
    })
    
  } catch (error) {
    console.error('❌ OPTIMIZED SYNC failed:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Sync failed' 
    }, { status: 500 })
  }
}
