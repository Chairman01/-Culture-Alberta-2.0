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

// Clear events cache
export function clearEventsCache() {
  console.log('🗑️ Clearing events cache...')
  eventsCache.clear()
  eventsCacheTimestamp.clear()
}

/**
 * Get a single event by slug (title-based URL)
 */
export async function getEventBySlug(slug: string): Promise<Event | null> {
  try {
    console.log('🔍 Getting event by slug:', slug)
    
    // Get all events first
    const events = await getAllEvents()
    
    if (!events || events.length === 0) {
      console.log('❌ No events found')
      return null
    }
    
    // Try to find event by exact slug match first
    let event = events.find(e => {
      const eventSlug = createSlug(e.title)
      return eventSlug === slug
    })
    
    if (event) {
      console.log('✅ Found event by exact slug match:', event.title)
      return event
    }
    
    // Try partial matching if exact match fails
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
    
    if (event) {
      console.log('✅ Found event by partial slug match:', event.title)
      return event
    }
    
    console.log('❌ No event found for slug:', slug)
    return null
    
  } catch (error) {
    console.error('❌ Error getting event by slug:', error)
    return null
  }
}

// Get all events
export async function getAllEvents(): Promise<Event[]> {
  try {
    console.log('=== getAllEvents called ===')
    
    const now = Date.now()
    const cacheTime = eventsCacheTimestamp.get('all') || 0
    
    // Check cache first
    if (eventsCache.has('all') && (now - cacheTime) < getCacheDuration()) {
      console.log('Returning cached events:', eventsCache.get('all')?.length || 0, 'events')
      return eventsCache.get('all') || []
    }
    
    if (!supabase) {
      console.error('Supabase client is not initialized')
      return []
    }

    console.log('Fetching events from Supabase...')
    
    let data, error
    try {
      const result = await supabase
        .from('events')
        .select('*')
        .eq('status', 'published')
        .order('event_date', { ascending: true })
      
      data = result.data
      error = result.error

      if (error) {
        console.error('Error fetching events:', error)
        return []
      }
    } catch (supabaseError) {
      console.error('Supabase connection error:', supabaseError)
      return []
    }

    console.log('Successfully fetched events from Supabase:', data?.length || 0, 'events')
    console.log('Raw events data:', data)

    // Update cache
    eventsCache.set('all', data || [])
    eventsCacheTimestamp.set('all', now)

    return data || []
  } catch (error) {
    console.error('Error in getAllEvents:', error)
    return []
  }
}

// Get events by location
export async function getEventsByLocation(location: string): Promise<Event[]> {
  try {
    console.log(`=== getEventsByLocation called for: ${location} ===`)
    
    const now = Date.now()
    const cacheKey = `location_${location.toLowerCase()}`
    const cacheTime = eventsCacheTimestamp.get(cacheKey) || 0
    
    // Check cache first
    if (eventsCache.has(cacheKey) && (now - cacheTime) < getCacheDuration()) {
      console.log(`Returning cached ${location} events:`, eventsCache.get(cacheKey)?.length || 0, 'events')
      return eventsCache.get(cacheKey) || []
    }
    
    if (!supabase) {
      console.error('Supabase client is not initialized')
      return []
    }

    console.log(`Fetching ${location} events from Supabase...`)
    
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('status', 'published')
      .ilike('location', `%${location}%`)
      .order('event_date', { ascending: true })

    if (error) {
      console.error(`Error fetching ${location} events:`, error)
      return []
    }

    console.log(`Successfully fetched ${location} events from Supabase:`, data?.length || 0, 'events')

    // Update cache
    eventsCache.set(cacheKey, data || [])
    eventsCacheTimestamp.set(cacheKey, now)

    return data || []
  } catch (error) {
    console.error(`Error in getEventsByLocation for ${location}:`, error)
    return []
  }
}

// Get upcoming events (events happening in the future)
export async function getUpcomingEvents(limit: number = 10): Promise<Event[]> {
  try {
    console.log(`=== getUpcomingEvents called (limit: ${limit}) ===`)
    
    const now = new Date().toISOString()
    
    if (!supabase) {
      console.error('Supabase client is not initialized')
      return []
    }

    console.log('Fetching upcoming events from Supabase...')
    
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('status', 'published')
      .gte('event_date', now)
      .order('event_date', { ascending: true })
      .limit(limit)

    if (error) {
      console.error('Error fetching upcoming events:', error)
      return []
    }

    console.log('Successfully fetched upcoming events from Supabase:', data?.length || 0, 'events')

    return data || []
  } catch (error) {
    console.error('Error in getUpcomingEvents:', error)
    return []
  }
}

// Get featured events
export async function getFeaturedEvents(): Promise<Event[]> {
  try {
    console.log('=== getFeaturedEvents called ===')
    
    if (!supabase) {
      console.error('Supabase client is not initialized')
      return []
    }

    console.log('Fetching featured events from Supabase...')
    
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('status', 'published')
      .eq('featured', true)
      .order('event_date', { ascending: true })

    if (error) {
      console.error('Error fetching featured events:', error)
      return []
    }

    console.log('Successfully fetched featured events from Supabase:', data?.length || 0, 'events')

    return data || []
  } catch (error) {
    console.error('Error in getFeaturedEvents:', error)
    return []
  }
}

// Get event by ID
export async function getEventById(id: string): Promise<Event | null> {
  try {
    console.log(`=== getEventById called for: ${id} ===`)
    
    if (!supabase) {
      console.error('Supabase client is not initialized')
      return null
    }

    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error(`Error fetching event ${id}:`, error)
      return null
    }

    console.log('Successfully fetched event from Supabase:', data?.title)

    return data
  } catch (error) {
    console.error(`Error in getEventById for ${id}:`, error)
    return null
  }
}

// Create new event
export async function createEvent(eventData: EventFormData): Promise<Event | null> {
  try {
    console.log('=== createEvent called ===')
    
    if (!supabase) {
      console.error('Supabase client is not initialized')
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
      console.error('Error creating event:', error)
      console.error('Event data that failed:', {
        id,
        ...eventData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      return null
    }

    console.log('Successfully created event:', data?.title)

    // Clear cache
    eventsCache.clear()
    eventsCacheTimestamp.clear()

    return data
  } catch (error) {
    console.error('Error in createEvent:', error)
    return null
  }
}

// Update event
export async function updateEvent(id: string, eventData: Partial<EventFormData>): Promise<Event | null> {
  try {
    console.log(`=== updateEvent called for: ${id} ===`)
    console.log('📝 Update data:', eventData)
    
    if (!supabase) {
      console.error('Supabase client is not initialized')
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
      console.error(`Error updating event ${id}:`, error)
      return null
    }

    console.log('Successfully updated event:', data?.title)
    console.log('📝 Updated description:', data?.description)
    console.log('📝 Updated excerpt:', data?.excerpt)

    // Clear cache more aggressively
    eventsCache.clear()
    eventsCacheTimestamp.clear()
    console.log('🗑️ Cleared events cache after update')

    return data
  } catch (error) {
    console.error(`Error in updateEvent for ${id}:`, error)
    return null
  }
}

// Delete event
export async function deleteEvent(id: string): Promise<boolean> {
  try {
    console.log(`=== deleteEvent called for: ${id} ===`)
    
    if (!supabase) {
      console.error('Supabase client is not initialized')
      return false
    }

    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id)

    if (error) {
      console.error(`Error deleting event ${id}:`, error)
      return false
    }

    console.log('Successfully deleted event:', id)

    // Clear cache
    eventsCache.clear()
    eventsCacheTimestamp.clear()

    return true
  } catch (error) {
    console.error(`Error in deleteEvent for ${id}:`, error)
    return false
  }
}
