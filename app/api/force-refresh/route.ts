/**
 * Force Refresh API Route
 * 
 * Performance optimizations:
 * - Efficient cache clearing
 * - Proper error handling
 * - No console.logs in production
 * 
 * Used by:
 * - Admin panel to force refresh all caches
 * - Automated cache refresh systems
 */

import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'

// Force dynamic rendering - no caching for this endpoint
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * POST handler for force refresh
 * 
 * Revalidates all major paths and clears all cache tags
 * 
 * @param request - Next.js request object
 * @returns JSON response indicating success or failure
 * 
 * Performance:
 * - Efficient path and tag revalidation
 * - Proper error handling
 */
export async function POST(request: NextRequest) {
  try {
    // PERFORMANCE: Revalidate all major paths
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
    
    // Revalidate dynamic article and event paths
    revalidatePath('/articles/[slug]', 'page')
    revalidatePath('/events/[slug]', 'page')
    
    // PERFORMANCE: Clear all cache tags
    const tagsToRevalidate = [
      'articles',
      'events',
      'homepage',
      'city-pages',
    ]
    
    tagsToRevalidate.forEach(tag => {
      revalidateTag(tag)
    })
    
    return NextResponse.json({ 
      success: true, 
      message: 'All caches cleared and paths revalidated',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error in force refresh:', error)
    }
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to refresh caches',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * GET handler for force refresh (returns info message)
 * 
 * @returns JSON response with usage instructions
 */
export async function GET() {
  return NextResponse.json({ 
    message: 'Force refresh endpoint - use POST to trigger refresh',
    timestamp: new Date().toISOString()
  })
}
