/**
 * Event by Slug API Route
 * 
 * Optimized API for fetching a single event by slug
 * 
 * Performance optimizations:
 * - Fetches only essential fields
 * - Timeout protection
 * - Uses database indexes
 * - Proper caching headers
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { loadOptimizedFallback } from '@/lib/optimized-fallback'
import { createSlug } from '@/lib/utils/slug'

// Essential fields for event display
const eventFields = [
  'id',
  'title',
  'excerpt',
  'description',
  'category',
  'location',
  'event_date',
  'event_end_date',
  'image_url',
  'status',
  'created_at',
  'organizer',
  'organizer_contact',
  'venue_address',
  'website_url',
  'price',
  'currency'
].join(',')

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const resolvedParams = await params
    const slug = resolvedParams.slug
    
    // Try Supabase first with timeout
    try {
      const eventsQuery = supabase
        .from('events')
        .select(eventFields)
        .eq('status', 'published')
        .order('event_date', { ascending: true })
        .limit(50)
      
      const queryPromise = eventsQuery
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Query timeout')), 5000)
      )
      
      const { data, error } = await Promise.race([
        queryPromise,
        timeoutPromise
      ]) as any
      
      if (!error && data) {
        // Find event by matching slug
        const event = data.find((event: any) => {
          const eventSlug = createSlug(event.title)
          return eventSlug.toLowerCase() === slug.toLowerCase()
        })
        
        if (event) {
          return NextResponse.json(event, {
            headers: {
              'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
              'X-Content-Type-Options': 'nosniff'
            }
          })
        }
      }
    } catch (supabaseError) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Supabase query failed, using fallback:', supabaseError)
      }
    }
    
    // Fallback to optimized fallback file
    const fallbackArticles = await loadOptimizedFallback()
    const event = fallbackArticles.find((item: any) => {
      if (item.type !== 'event') return false
      const eventSlug = createSlug(item.title)
      return eventSlug.toLowerCase() === slug.toLowerCase()
    })
    
    if (event) {
      return NextResponse.json(event, {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
          'X-Content-Type-Options': 'nosniff'
        }
      })
    }
    
    return NextResponse.json(
      { error: 'Event not found' },
      { 
        status: 404,
        headers: {
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff'
        }
      }
    )
    
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Failed to load event',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { 
        status: 500,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'X-Content-Type-Options': 'nosniff'
        }
      }
    )
  }
}

