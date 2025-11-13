/**
 * Event data fetching utilities
 * 
 * Performance optimizations:
 * - Efficient event lookup by slug
 * - Related events and articles fetching
 * - Proper error handling
 * - Minimal field selection for fast queries
 * - Timeout protection
 * 
 * Used in:
 * - app/events/[slug]/page.tsx
 */

import { Event } from '@/lib/types/event'
import { Article } from '@/lib/types/article'
import { supabase } from '@/lib/supabase'
import { loadOptimizedFallback } from '@/lib/optimized-fallback'
import { createSlug } from '@/lib/utils/slug'

/**
 * Interface for event detail page data
 */
export interface EventDetailPageData {
  event: Event
  latestArticles: Article[]
  moreEvents: (Event | Article)[]
  moreArticles: Article[]
}

/**
 * OPTIMIZED: Finds an event by slug using optimized queries
 * 
 * @param slug - Event slug (URL-friendly title)
 * @returns Event object or null if not found
 * 
 * Performance:
 * - Uses optimized Supabase query with minimal fields
 * - Timeout protection (5 seconds)
 * - Falls back to optimized fallback file
 */
export async function findEventBySlug(slug: string): Promise<Event | null> {
  // Try optimized fallback first (fastest)
  try {
    const fallbackArticles = await loadOptimizedFallback()
    const event = fallbackArticles.find((item: any) => {
      if (item.type !== 'event') return false
      const eventSlug = createSlug(item.title)
      return eventSlug.toLowerCase() === slug.toLowerCase()
    })
    
    if (event) {
      return event as unknown as Event
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error finding event in fallback:', error)
    }
  }
  
  // Try Supabase with optimized query (minimal fields)
  try {
    const eventFields = [
      'id',
      'title',
      'excerpt',
      'description',
      'category',
      'location',
      'event_date',
      'event_end_date',
      'image_url',
      'status',
      'created_at',
      'organizer',
      'organizer_contact',
      'venue_address',
      'website_url',
      'price',
      'currency'
    ].join(',')
    
    const eventsQuery = supabase
      .from('events')
      .select(eventFields)
      .eq('status', 'published')
      .order('event_date', { ascending: true })
      .limit(50)
    
    const queryPromise = eventsQuery
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Query timeout')), 5000)
    )
    
    const { data, error } = await Promise.race([
      queryPromise,
      timeoutPromise
    ]) as any
    
    if (!error && data) {
      const foundEvent = data.find((event: any) => {
        const eventSlug = createSlug(event.title)
        return eventSlug.toLowerCase() === slug.toLowerCase()
      })
      
      if (foundEvent) {
        return foundEvent as Event
      }
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error finding event in Supabase:', error)
    }
  }
  
  return null
}

/**
 * OPTIMIZED: Fetches all data needed for an event detail page
 * 
 * @param eventId - Event ID to exclude from related events
 * @returns Event detail page data including related content
 * 
 * Performance:
 * - Uses optimized fallback (faster than Supabase)
 * - Efficient filtering
 * - Limits results for performance
 * - Excludes content field from related articles
 */
export async function getEventDetailPageData(eventId: string): Promise<EventDetailPageData | null> {
  try {
    // PERFORMANCE: Use optimized fallback (faster than Supabase)
    const allContent = await loadOptimizedFallback()
    
    // Filter articles (exclude events)
    const allArticles = allContent.filter((item: any) => item.type !== 'event')
    
    // Filter events
    const allEvents = allContent.filter((item: any) => item.type === 'event')
    
    // Get latest articles for sidebar (limit to 3, no content)
    const latestArticles = allArticles
      .slice(0, 3)
      .map((article: any) => ({
        ...article,
        content: undefined // Don't include content for sidebar
      })) as Article[]
    
    // Get more articles for bottom section (limit to 6, no content)
    const moreArticles = allArticles
      .slice(0, 6)
      .map((article: any) => ({
        ...article,
        content: undefined // Don't include content for related articles
      })) as Article[]
    
    // Find the current event
    const currentEvent = allEvents.find((e: any) => e.id === eventId)
    
    if (!currentEvent) {
      return null
    }
    
    // Get more events (exclude current event, limit to 3)
    const moreEvents = allEvents
      .filter((e: any) => {
        const status = e.status || 'published'
        return e.id !== eventId && (status === 'published' || !status)
      })
      .slice(0, 3) as (Event | Article)[]
    
    return {
      event: currentEvent as Event,
      latestArticles,
      moreEvents,
      moreArticles,
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error loading event detail page data:', error)
    }
    return null
  }
}

/**
 * OPTIMIZED: Generates static params for all published events
 * 
 * @returns Array of slug parameters for static generation
 * 
 * Performance:
 * - Uses optimized fallback (faster)
 * - Only generates params for published events
 * - Uses consistent slug generation
 */
export async function generateEventStaticParams() {
  try {
    // PERFORMANCE: Use optimized fallback (faster than Supabase)
    const allContent = await loadOptimizedFallback()
    const events = allContent.filter((item: any) => item.type === 'event')
    
    // Only generate params for published events
    const publishedEvents = events.filter((event: any) => {
      const status = event.status || 'published'
      return status === 'published' || !status
    })
    
    const params = publishedEvents.map((event: any) => {
      const title = event.title
      const slug = createSlug(title)
      return { slug }
    })
    
    return params
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error generating event static params:', error)
    }
    return []
  }
}

