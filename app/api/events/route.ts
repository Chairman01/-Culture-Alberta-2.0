/**
 * Events API Route
 * 
 * Performance optimizations:
 * - Efficient filtering (single pass)
 * - Proper error handling
 * - No console.logs in production
 * - Caching headers for better performance
 * 
 * Used by:
 * - Client-side components that need events
 * - Note: Server components should use getAllEvents() directly
 */

import { NextResponse } from 'next/server'
import { loadOptimizedFallback } from '@/lib/optimized-fallback'

// PERFORMANCE: Cache for 60 seconds (short cache for API)
export const revalidate = 60

/**
 * GET handler for events API
 * 
 * Returns all events from the optimized fallback
 * 
 * @returns JSON response with events array
 * 
 * Performance:
 * - Single-pass filtering
 * - Efficient type checking
 * - Proper error handling
 */
export async function GET() {
  try {
    const fallbackArticles = await loadOptimizedFallback()
    
    // PERFORMANCE: Single-pass filter for events only
    const events = fallbackArticles.filter(article => article.type === 'event')
    
    // PERFORMANCE: Return with caching headers
    return NextResponse.json(events, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    })
  } catch (error) {
    // Return empty array on error (non-critical endpoint)
    if (process.env.NODE_ENV === 'development') {
      console.error('Failed to load events:', error)
    }
    return NextResponse.json([], { 
      status: 500,
      headers: {
        'Cache-Control': 'no-store',
      },
    })
  }
}
