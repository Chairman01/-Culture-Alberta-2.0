/**
 * Calgary Articles API Route
 * 
 * Performance optimizations:
 * - Efficient filtering (single pass)
 * - Proper error handling
 * - No console.logs in production
 * - Caching headers for better performance
 * 
 * Used by:
 * - Client-side components that need Calgary articles
 * - Note: Server components should use getCityArticles() directly
 */

import { NextResponse } from 'next/server'
import { loadOptimizedFallback } from '@/lib/optimized-fallback'

// PERFORMANCE: Cache for 60 seconds (short cache for API)
export const revalidate = 60

/**
 * GET handler for Calgary articles API
 * 
 * Returns Calgary-specific articles (excluding events)
 * 
 * @returns JSON response with Calgary articles array
 * 
 * Performance:
 * - Single-pass filtering
 * - Efficient string matching
 * - Proper error handling
 */
export async function GET() {
  try {
    const fallbackArticles = await loadOptimizedFallback()
    
    // PERFORMANCE: Single-pass filter for Calgary articles (excluding events)
    const calgaryArticles = fallbackArticles.filter(article => {
      // Filter out events first (most common case)
      if (article.type === 'event') return false
      
      // Check if article is Calgary-related
      const cityLower = 'calgary'
      const category = article.category?.toLowerCase() || ''
      const location = article.location?.toLowerCase() || ''
      const categories = article.categories || []
      const tags = article.tags || []
      
      return category.includes(cityLower) ||
             location.includes(cityLower) ||
             categories.some((cat: string) => cat.toLowerCase().includes(cityLower)) ||
             tags.some((tag: string) => tag.toLowerCase().includes(cityLower))
    })
    
    // PERFORMANCE: Return with caching headers
    return NextResponse.json(calgaryArticles, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    })
  } catch (error) {
    // Return empty array on error (non-critical endpoint)
    if (process.env.NODE_ENV === 'development') {
      console.error('Failed to load Calgary articles:', error)
    }
    return NextResponse.json([], { 
      status: 500,
      headers: {
        'Cache-Control': 'no-store',
      },
    })
  }
}
