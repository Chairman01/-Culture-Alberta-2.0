import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

export const revalidate = 0

// OPTIMIZED sync endpoint to prevent timeouts
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 OPTIMIZED SYNC: Syncing articles and events from Supabase...')
    
    // Supabase configuration
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://itdmwpbsnviassgqfhxk.supabase.co'
    const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0ZG13cGJzbnZpYXNzZ3FmaHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0ODU5NjUsImV4cCI6MjA2OTA2MTk2NX0.pxAXREQJrXJFZEBB3s7iwfm3rV_C383EbWCwf6ayPQo'
    
    // OPTIMIZED: Fetch only recent articles (last 50) with essential fields only
    const articlesResponse = await fetch(`${SUPABASE_URL}/rest/v1/articles?select=id,title,excerpt,content,category,categories,location,author,tags,type,status,created_at,updated_at,trending_home,trending_edmonton,trending_calgary,featured_home,featured_edmonton,featured_calgary,image_url&order=created_at.desc&limit=50`, {
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

    // Fetch events with correct column structure
    const eventsResponse = await fetch(`${SUPABASE_URL}/rest/v1/events?select=id,title,description,excerpt,category,location,organizer,event_date,event_end_date,image_url,created_at,updated_at,featured_home,featured_edmonton,featured_calgary,status,tags,venue,price,website_url&order=created_at.desc&limit=100`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    })
    
    let events: any[] = []
    if (eventsResponse.ok) {
      events = await eventsResponse.json()
      console.log(`✅ OPTIMIZED: Fetched ${events.length} events from Supabase`)
    } else {
      console.log(`ℹ️ OPTIMIZED: Could not fetch events: ${eventsResponse.status}`)
    }
    
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
      description: event.description || '', // Add description field for events
      content: event.description || '',
      excerpt: event.excerpt || (event.description ? event.description.substring(0, 150) + '...' : ''),
      category: event.category || 'Event',
      categories: [event.category || 'Event'],
      location: event.location || 'Alberta',
      author: event.organizer || 'Event Organizer',
      tags: event.tags || [],
      type: 'event',
      status: event.status || 'published',
      createdAt: event.created_at,
      updatedAt: event.updated_at,
      date: event.event_date || event.created_at,
      imageUrl: event.image_url || null,
      trendingHome: false,
      trendingEdmonton: false,
      trendingCalgary: false,
      featuredHome: event.featured_home || false,
      featuredEdmonton: event.featured_edmonton || false,
      featuredCalgary: event.featured_calgary || false,
      // Event-specific fields
      event_date: event.event_date,
      event_end_date: event.event_end_date,
      organizer: event.organizer,
      venue: event.venue,
      price: event.price,
      website_url: event.website_url,
    }))
    
    // Combine articles and events
    const allContent = [...transformedArticles, ...transformedEvents]
    
    // Write to optimized-fallback.json using direct file write
    const optimizedFallbackPath = join(process.cwd(), 'optimized-fallback.json')
    writeFileSync(optimizedFallbackPath, JSON.stringify(allContent, null, 2), 'utf-8')
    console.log(`✅ OPTIMIZED: Updated optimized-fallback.json with ${transformedArticles.length} articles and ${transformedEvents.length} events`)
    
    // Revalidate pages
    revalidatePath('/', 'layout')
    revalidatePath('/articles')
    revalidatePath('/events')
    
    return NextResponse.json({ 
      success: true, 
      count: allContent.length,
      articles: transformedArticles.length,
      events: transformedEvents.length,
      message: `Successfully synced ${transformedArticles.length} articles and ${transformedEvents.length} events`
    })
    
  } catch (error) {
    console.error('❌ OPTIMIZED SYNC failed:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('❌ Full error details:', JSON.stringify(error, null, 2))
    return NextResponse.json({ 
      success: false, 
      error: errorMessage,
      details: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}
