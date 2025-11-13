/**
 * Events data fetching and management utilities
 * 
 * Performance optimizations:
 * - Efficient event caching
 * - Optimized database queries
 * - Proper error handling
 * - No console.logs in production
 * 
 * Used in:
 * - app/events/page.tsx
 * - app/events/[slug]/page.tsx
 * - app/edmonton/page.tsx
 * - app/calgary/page.tsx
 * - lib/data/event-data.ts
 */

import { supabase } from './supabase'
import { Event, EventFormData } from './types/event'
import { createSlug } from './utils/slug'

// Cache for events
const eventsCache = new Map<string, Event[]>()
const eventsCacheTimestamp = new Map<string, number>()

// Cache duration: 5 minutes in production, 1 minute in development
const getCacheDuration = () => {
  return process.env.NODE_ENV === 'production' ? 5 * 60 * 1000 : 1 * 60 * 1000
}

/**
 * Clear events cache
 * 
 * Performance: O(n) - clears all cache entries
 */
export function clearEventsCache() {
  eventsCache.clear()
  eventsCacheTimestamp.clear()
}

/**
 * Get a single event by slug (title-based URL)
 * 
 * @param slug - Event slug to find
 * @returns Event object or null if not found
 * 
 * Performance:
 * - Uses getAllEvents() which is cached
 * - Efficient slug matching (exact first, then partial)
 */
export async function getEventBySlug(slug: string): Promise<Event | null> {
  try {
    // Get all events first (uses cached version)
    const events = await getAllEvents()
    
    if (!events || events.length === 0) {
      return null
    }
    
    // PERFORMANCE: Try exact slug match first (fastest)
    let event = events.find(e => {
      const eventSlug = createSlug(e.title)
      return eventSlug === slug
    })
    
    if (event) {
      return event
    }
    
    // PERFORMANCE: Try partial matching if exact match fails
    event = events.find(e => {
      const eventSlug = createSlug(e.title)
      const slugWords = slug.split('-')
      const eventSlugWords = eventSlug.split('-')
      
      // Check if at least 70% of words match
      const matchingWords = slugWords.filter(word => 
        eventSlugWords.some(eventWord => 
          eventWord.includes(word) || word.includes(eventWord)
        )
      )
      
      return (matchingWords.length / slugWords.length) >= 0.7
    })
    
    return event || null
    
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error getting event by slug:', error)
    }
    return null
  }
}

/**
 * Get all events
 * 
 * PERFORMANCE: Uses optimized fallback for fast loading
 * 
 * @returns Array of all events
 */
export async function getAllEvents(): Promise<Event[]> {
  try {
    // PERFORMANCE: Use optimized fallback (fastest and most reliable)
    const { loadOptimizedFallback } = await import('./optimized-fallback')
    const fallbackArticles = await loadOptimizedFallback()
    
    // Filter for events only
    const events = fallbackArticles.filter(article => article.type === 'event')
    return events as unknown as Event[]
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error in getAllEvents:', error)
    }
    return []
  }
}

/**
 * Get events by location
 * 
 * @param location - Location to filter by
 * @returns Array of events in the specified location
 * 
 * Performance:
 * - Uses caching to reduce database queries
 * - Efficient filtering
 */
export async function getEventsByLocation(location: string): Promise<Event[]> {
  try {
    const now = Date.now()
    const cacheKey = `location_${location.toLowerCase()}`
    const cacheTime = eventsCacheTimestamp.get(cacheKey) || 0
    
    // PERFORMANCE: Check cache first
    if (eventsCache.has(cacheKey) && (now - cacheTime) < getCacheDuration()) {
      return eventsCache.get(cacheKey) || []
    }
    
    if (!supabase) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Supabase client is not initialized')
      }
      return []
    }

    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('status', 'published')
      .ilike('location', `%${location}%`)
      .order('event_date', { ascending: true })

    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error(`Error fetching ${location} events:`, error)
      }
      return []
    }

    // Update cache
    eventsCache.set(cacheKey, data || [])
    eventsCacheTimestamp.set(cacheKey, now)

    return data || []
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error(`Error in getEventsByLocation for ${location}:`, error)
    }
    return []
  }
}

/**
 * Get upcoming events (events happening in the future)
 * 
 * @param limit - Maximum number of events to return
 * @returns Array of upcoming events
 * 
 * Performance:
 * - Efficient date filtering
 * - Limits results for performance
 */
export async function getUpcomingEvents(limit: number = 10): Promise<Event[]> {
  try {
    const now = new Date().toISOString()
    
    if (!supabase) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Supabase client is not initialized')
      }
      return []
    }

    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('status', 'published')
      .gte('event_date', now)
      .order('event_date', { ascending: true })
      .limit(limit)

    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching upcoming events:', error)
      }
      return []
    }

    return data || []
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error in getUpcomingEvents:', error)
    }
    return []
  }
}

/**
 * Get featured events
 * 
 * @returns Array of featured events
 * 
 * Performance:
 * - Efficient filtering
 * - Sorted by date
 */
export async function getFeaturedEvents(): Promise<Event[]> {
  try {
    if (!supabase) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Supabase client is not initialized')
      }
      return []
    }

    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('status', 'published')
      .eq('featured', true)
      .order('event_date', { ascending: true })

    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching featured events:', error)
      }
      return []
    }

    return data || []
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error in getFeaturedEvents:', error)
    }
    return []
  }
}

/**
 * Get event by ID
 * 
 * @param id - Event ID
 * @returns Event object or null if not found
 * 
 * Performance:
 * - Direct database lookup by ID (fast)
 */
export async function getEventById(id: string): Promise<Event | null> {
  try {
    if (!supabase) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Supabase client is not initialized')
      }
      return null
    }

    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error(`Error fetching event ${id}:`, error)
      }
      return null
    }

    return data
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error(`Error in getEventById for ${id}:`, error)
    }
    return null
  }
}

/**
 * Create new event
 * 
 * @param eventData - Event form data
 * @returns Created event or null if failed
 * 
 * Performance:
 * - Clears cache after creation
 * - Generates unique ID efficiently
 */
export async function createEvent(eventData: EventFormData): Promise<Event | null> {
  try {
    if (!supabase) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Supabase client is not initialized')
      }
      return null
    }

    // Generate ID
    const id = `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    const { data, error } = await supabase
      .from('events')
      .insert([{
        id,
        ...eventData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single()

    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error creating event:', error)
      }
      return null
    }

    // PERFORMANCE: Clear cache after creation
    clearEventsCache()

    return data
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error in createEvent:', error)
    }
    return null
  }
}

/**
 * Update event
 * 
 * @param id - Event ID
 * @param eventData - Partial event data to update
 * @returns Updated event or null if failed
 * 
 * Performance:
 * - Clears cache after update
 * - Efficient partial updates
 */
export async function updateEvent(id: string, eventData: Partial<EventFormData>): Promise<Event | null> {
  try {
    if (!supabase) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Supabase client is not initialized')
      }
      return null
    }

    const { data, error } = await supabase
      .from('events')
      .update({
        ...eventData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error(`Error updating event ${id}:`, error)
      }
      return null
    }

    // PERFORMANCE: Clear cache after update
    clearEventsCache()

    return data
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error(`Error in updateEvent for ${id}:`, error)
    }
    return null
  }
}

/**
 * Delete event
 * 
 * @param id - Event ID
 * @returns True if successful, false otherwise
 * 
 * Performance:
 * - Clears cache after deletion
 */
export async function deleteEvent(id: string): Promise<boolean> {
  try {
    if (!supabase) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Supabase client is not initialized')
      }
      return false
    }

    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id)

    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error(`Error deleting event ${id}:`, error)
      }
      return false
    }

    // PERFORMANCE: Clear cache after deletion
    clearEventsCache()

    return true
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error(`Error in deleteEvent for ${id}:`, error)
    }
    return false
  }
}
