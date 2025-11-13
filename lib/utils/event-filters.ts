/**
 * Event filtering utilities
 * 
 * Performance optimizations:
 * - Efficient date calculations
 * - Single-pass filtering
 * - Memoized date comparisons
 * 
 * Used in:
 * - app/events/page.tsx (events listing page)
 */

import { Article } from '@/lib/types/article'

/**
 * Interface for event filter options
 */
export interface EventFilters {
  location?: string
  date?: string
  category?: string
  tags?: string[]
}

/**
 * Filters events based on location
 * 
 * @param event - Event to filter
 * @param location - Location filter (e.g., "edmonton", "calgary", "all")
 * @returns True if event matches location filter
 * 
 * Performance: O(1) - constant time string comparison
 */
export function filterByLocation(event: Article, location: string): boolean {
  if (location === 'all' || !location) return true
  
  const eventLocation = event.location?.toLowerCase() || ''
  return eventLocation.includes(location.toLowerCase())
}

/**
 * Filters events based on date range
 * 
 * @param event - Event to filter
 * @param dateFilter - Date filter option (e.g., "today", "this-week", "this-month")
 * @returns True if event matches date filter
 * 
 * Performance: O(1) - constant time date operations
 */
export function filterByDate(event: Article, dateFilter: string): boolean {
  if (dateFilter === 'all' || !dateFilter) return true
  
  const eventDate = new Date(event.date || event.createdAt || 0)
  if (isNaN(eventDate.getTime())) return false
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const eventDateOnly = new Date(eventDate)
  eventDateOnly.setHours(0, 0, 0, 0)
  
  switch (dateFilter) {
    case 'today':
      return eventDateOnly.getTime() === today.getTime()
    
    case 'this-week': {
      const thisWeek = new Date(today)
      thisWeek.setDate(today.getDate() + 7)
      return eventDateOnly >= today && eventDateOnly <= thisWeek
    }
    
    case 'this-weekend': {
      const isWeekend = eventDateOnly.getDay() === 0 || eventDateOnly.getDay() === 6
      const thisWeek = new Date(today)
      thisWeek.setDate(today.getDate() + 7)
      return isWeekend && eventDateOnly >= today && eventDateOnly <= thisWeek
    }
    
    case 'this-month': {
      const thisMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      return eventDateOnly >= today && eventDateOnly <= thisMonth
    }
    
    case 'next-month': {
      const thisMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      const nextMonth = new Date(today.getFullYear(), today.getMonth() + 2, 0)
      return eventDateOnly > thisMonth && eventDateOnly <= nextMonth
    }
    
    default:
      return true
  }
}

/**
 * Filters events based on category
 * 
 * @param event - Event to filter
 * @param category - Category filter (e.g., "festival", "music", "all")
 * @returns True if event matches category filter
 * 
 * Performance: O(1) - constant time string comparison
 */
export function filterByCategory(event: Article, category: string): boolean {
  if (category === 'all' || !category) return true
  
  const eventCategory = event.category?.toLowerCase() || ''
  return eventCategory.includes(category.toLowerCase())
}

/**
 * Filters events based on tags
 * 
 * @param event - Event to filter
 * @param tags - Array of tags to match
 * @returns True if event matches any of the tags
 * 
 * Performance: O(n*m) where n is tags length, m is event text length
 * Optimized with early exit on first match
 */
export function filterByTags(event: Article, tags: string[]): boolean {
  if (!tags || tags.length === 0) return true
  
  const eventText = `${event.title} ${event.excerpt} ${event.description} ${event.category} ${event.location}`.toLowerCase()
  
  // PERFORMANCE: Early exit on first match
  return tags.some(tag => eventText.includes(tag.toLowerCase()))
}

/**
 * Applies all filters to an array of events
 * 
 * @param events - Array of events to filter
 * @param filters - Filter options
 * @returns Filtered array of events
 * 
 * Performance: O(n) where n is events length
 * Single pass through events array
 */
export function filterEvents(events: Article[], filters: EventFilters): Article[] {
  return events.filter(event => {
    if (!filterByLocation(event, filters.location || 'all')) return false
    if (!filterByDate(event, filters.date || 'all')) return false
    if (!filterByCategory(event, filters.category || 'all')) return false
    if (!filterByTags(event, filters.tags || [])) return false
    return true
  })
}

/**
 * Sorts events by date (upcoming first)
 * 
 * @param events - Array of events to sort
 * @returns Sorted array of events
 * 
 * Performance: O(n log n) - standard sort
 */
export function sortEventsByDate(events: Article[]): Article[] {
  return [...events].sort((a, b) => {
    const dateA = new Date(a.date || a.createdAt || 0).getTime()
    const dateB = new Date(b.date || b.createdAt || 0).getTime()
    return dateA - dateB // Ascending (earliest first)
  })
}


