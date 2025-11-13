/**
 * Articles API Route
 * 
 * Performance optimizations:
 * - Efficient file reading
 * - Proper error handling
 * - No console.logs in production
 * - Caching headers for better performance
 * 
 * Used by:
 * - Client-side components that need all articles
 * - Note: Server components should use getAllArticles() directly
 */

import { NextRequest, NextResponse } from 'next/server'
import { loadOptimizedFallback } from '@/lib/optimized-fallback'

// PERFORMANCE: Cache for 60 seconds (short cache for API)
export const revalidate = 60

/**
 * GET handler for articles API
 * 
 * Returns all articles or a specific article by ID
 * 
 * @param request - Next.js request object
 * @returns JSON response with articles array or single article
 * 
 * Performance:
 * - Efficient file reading
 * - Optional ID filtering
 * - Proper error handling
 */
export async function GET(request: NextRequest) {
  try {
    const fallbackArticles = await loadOptimizedFallback()
    
    // Check if we're looking for a specific article by ID
    const { searchParams } = new URL(request.url)
    const articleId = searchParams.get('id')
    
    if (articleId) {
      // PERFORMANCE: Use find() for O(n) lookup (acceptable for small arrays)
      const article = fallbackArticles.find((article: any) => article.id === articleId)
      
      if (article) {
        return NextResponse.json(article, {
          headers: {
            'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
          },
        })
      } else {
        return NextResponse.json(
          { error: 'Article not found' }, 
          { 
            status: 404,
            headers: {
              'Cache-Control': 'no-store',
            },
          }
        )
      }
    }
    
    // Return all articles if no specific ID requested
    return NextResponse.json(fallbackArticles, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    })
  } catch (error) {
    // Return error response
    if (process.env.NODE_ENV === 'development') {
      console.error('Failed to load articles:', error)
    }
    return NextResponse.json(
      { 
        error: 'Failed to load articles', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }, 
      { 
        status: 500,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    )
  }
}
