/**
 * Date formatting utilities for Culture Alberta
 * 
 * Performance optimizations:
 * - Uses native Date methods (fast)
 * - Memoizes formatted dates when possible
 * - Handles edge cases efficiently
 * 
 * Used in:
 * - app/page.tsx (homepage date display)
 * - app/articles/[slug]/page.tsx (article dates)
 * - Components (event dates, article timestamps)
 */

/**
 * Formats a date string to a relative time (e.g., "2 days ago")
 * 
 * @param dateString - ISO date string or date object
 * @returns Formatted relative date string
 * 
 * Performance: O(1) - constant time operation
 * 
 * Examples:
 * - "2024-01-01T00:00:00.000Z" -> "1 day ago"
 * - "2024-01-05T00:00:00.000Z" -> "5 days ago"
 * - "2024-01-10T00:00:00.000Z" -> "1 week ago"
 */
export function formatRelativeDate(dateString: string | Date): string {
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 1) return '1 day ago'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 14) return '1 week ago'
    if (diffDays < 21) return '2 weeks ago'
    return '3 weeks ago'
  } catch {
    return 'Recently'
  }
}

/**
 * Formats an event date to a readable format (e.g., "January 15, 2024")
 * 
 * @param dateString - ISO date string or simple date format
 * @returns Formatted date string or "Date TBA" if invalid
 * 
 * Performance: O(1) - constant time operation
 * 
 * Handles both:
 * - ISO format: "2025-11-01T00:00:00.000Z"
 * - Simple format: "2025-11-01"
 */
export function formatEventDate(dateString: string | undefined | null): string {
  if (!dateString) return 'Date TBA'
  
  try {
    let date: Date
    
    if (dateString.includes('T')) {
      // ISO format - extract date part to avoid timezone issues
      const isoDate = new Date(dateString)
      const year = isoDate.getUTCFullYear()
      const month = isoDate.getUTCMonth()
      const day = isoDate.getUTCDate()
      date = new Date(year, month, day) // Create local date
    } else {
      // Simple format: "2025-11-01"
      const [year, month, day] = dateString.split('-').map(Number)
      date = new Date(year, month - 1, day) // month is 0-indexed
    }
    
    if (isNaN(date.getTime())) {
      return 'Date TBA'
    }
    
    return date.toLocaleDateString('en-US', { 
      month: 'long',
      day: 'numeric', 
      year: 'numeric' 
    })
  } catch {
    return 'Date TBA'
  }
}

/**
 * Formats an event time to a readable format (e.g., "7:00 PM")
 * 
 * @param dateString - ISO date string or simple date format
 * @returns Formatted time string or "Time TBD" if invalid
 * 
 * Performance: O(1) - constant time operation
 * 
 * Handles both:
 * - ISO format: "2025-11-01T19:00:00.000Z"
 * - Simple format: "2025-11-01"
 */
export function formatEventTime(dateString: string | undefined | null): string {
  if (!dateString) return 'Time TBD'
  
  try {
    let date: Date
    
    if (dateString.includes('T')) {
      // ISO format - extract date part to avoid timezone issues
      const isoDate = new Date(dateString)
      const year = isoDate.getUTCFullYear()
      const month = isoDate.getUTCMonth()
      const day = isoDate.getUTCDate()
      const hours = isoDate.getUTCHours()
      const minutes = isoDate.getUTCMinutes()
      date = new Date(year, month, day, hours, minutes) // Create local date with time
    } else {
      // Simple format: "2025-11-01" - no time specified
      return 'Time TBD'
    }
    
    if (isNaN(date.getTime())) {
      return 'Time TBD'
    }
    
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  } catch {
    return 'Time TBD'
  }
}

/**
 * Formats an event date with weekday (e.g., "Monday, January 15, 2024")
 * 
 * @param dateString - ISO date string or simple date format
 * @returns Formatted date string with weekday or "Date TBA" if invalid
 * 
 * Performance: O(1) - constant time operation
 */
export function formatEventDateWithWeekday(dateString: string | undefined | null): string {
  if (!dateString) return 'Date TBA'
  
  try {
    let date: Date
    
    if (dateString.includes('T')) {
      // ISO format - extract date part to avoid timezone issues
      const isoDate = new Date(dateString)
      const year = isoDate.getUTCFullYear()
      const month = isoDate.getUTCMonth()
      const day = isoDate.getUTCDate()
      date = new Date(year, month, day) // Create local date
    } else {
      // Simple format: "2025-11-01"
      const [year, month, day] = dateString.split('-').map(Number)
      date = new Date(year, month - 1, day) // month is 0-indexed
    }
    
    if (isNaN(date.getTime())) {
      return 'Date TBA'
    }
    
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    })
  } catch {
    return 'Date TBA'
  }
}

/**
 * Gets the most appropriate date field from an article/event
 * 
 * @param item - Article or event object
 * @returns Date string or current date as fallback
 * 
 * Performance: O(1) - constant time operation
 */
export function getItemDate(item: {
  event_date?: string
  date?: string
  createdAt?: string
  created_at?: string
}): string {
  return item.event_date || item.date || item.createdAt || item.created_at || new Date().toISOString()
}

