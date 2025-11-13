/**
 * Cache Refresh API Route
 * 
 * Performance optimizations:
 * - Efficient cache clearing
 * - Proper error handling
 * - No console.logs in production
 * 
 * Used by:
 * - Admin panel to manually refresh cache
 * - Automated cache refresh systems
 */

import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { clearArticlesCache } from '@/lib/supabase-articles'

// Force dynamic rendering - no caching for this endpoint
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * POST handler for cache refresh
 * 
 * Clears in-memory cache and revalidates Next.js paths
 * 
 * @returns JSON response indicating success or failure
 * 
 * Performance:
 * - Efficient path revalidation
 * - Proper error handling
 */
export async function POST() {
  try {
    // Clear in-memory articles cache
    clearArticlesCache()
    
    // PERFORMANCE: Revalidate all main pages in parallel
    const pathsToRevalidate = [
      '/',
      '/edmonton',
      '/calgary',
      '/food-drink',
      '/culture',
      '/events',
      '/articles',
    ]
    
    pathsToRevalidate.forEach(path => {
      revalidatePath(path)
    })
    
    return NextResponse.json({ 
      success: true, 
      message: 'Cache refreshed - newest articles will now show',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error refreshing cache:', error)
    }
    return NextResponse.json(
      { 
        error: 'Failed to refresh cache', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }, 
      { status: 500 }
    )
  }
}

/**
 * GET handler for cache refresh (for easy browser testing)
 * 
 * @returns Same as POST handler
 */
export async function GET() {
  return POST()
}
