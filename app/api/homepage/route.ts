/**
 * Homepage API Route
 * 
 * Optimized API for fetching homepage data with minimal queries
 * 
 * Performance optimizations:
 * - Fetches only essential data for homepage sections
 * - Minimal fields (no content field)
 * - Parallel queries for articles and events
 * - Timeout protection
 * - Uses database indexes for fast queries
 */

/**
 * Homepage API Route
 * 
 * Optimized API for fetching homepage data
 * Uses shared getOptimizedHomepageData function for consistency
 */

import { NextResponse } from 'next/server'
import { getOptimizedHomepageData } from '@/lib/data/homepage-data'

export async function GET() {
  try {
    const { posts, events } = await getOptimizedHomepageData()
    
    return NextResponse.json({
      posts,
      events
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        'X-Content-Type-Options': 'nosniff'
      }
    })
  } catch (error) {
    return NextResponse.json({
      posts: [],
      events: []
    }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Content-Type-Options': 'nosniff'
      }
    })
  }
}

