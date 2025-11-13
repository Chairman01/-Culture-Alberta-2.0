/**
 * Admin Events API Route
 * 
 * Performance optimizations:
 * - Efficient data fetching
 * - Proper error handling
 * - No console.logs in production
 * - Secure credential handling
 * 
 * Used by:
 * - Admin panel for event management
 */

import { NextRequest, NextResponse } from 'next/server'
import { loadOptimizedFallback, updateOptimizedFallback } from '@/lib/optimized-fallback'
import { supabase } from '@/lib/supabase'

/**
 * GET handler for admin events
 * 
 * Fetches events with server-side pagination, filtering, and sorting.
 * 
 * Query parameters:
 * - page: number - Page number (default: 1)
 * - limit: number - Items per page (default: 20, max: 100)
 * - search: string - Search term for title/description
 * - location: string - Filter by location
 * - status: string - Filter by status
 * - sortBy: string - Sort field: 'newest' | 'oldest' | 'event_date' | 'title' (default: 'event_date')
 * 
 * @returns JSON response with events array and pagination metadata
 * 
 * Performance:
 * - Queries events table directly (not filtering all articles)
 * - Server-side pagination (default 20 items per page)
 * - Server-side filtering and sorting
 * - Uses database indexes for fast queries
 * - Proper error handling
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Parse query parameters with defaults
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)))
    const search = searchParams.get('search') || ''
    const location = searchParams.get('location') || ''
    const status = searchParams.get('status') || ''
    const sortBy = searchParams.get('sortBy') || 'event_date'
    
    const offset = (page - 1) * limit
    
    // Try to get live data from Supabase events table
    try {
      // Select only minimal essential fields for admin list view
      const essentialFields = [
        'id',
        'title',
        'category',
        'location',
        'event_date',
        'image_url',
        'status',
        'created_at'
      ].join(',')
      
      // Build query with filters - optimized for speed
      let query = supabase
        .from('events')
        .select(essentialFields, { count: 'exact' })
      
      // Apply sorting first (indexes work better this way)
      switch (sortBy) {
        case 'oldest':
          query = query.order('created_at', { ascending: true })
          break
        case 'newest':
          query = query.order('created_at', { ascending: false })
          break
        case 'title':
          query = query.order('title', { ascending: true })
          break
        case 'event_date':
        default:
          query = query.order('event_date', { ascending: true })
          break
      }
      
      // Apply filters (after sorting for better index usage)
      if (search) {
        const searchPattern = `%${search}%`
        query = query.or(`title.ilike.${searchPattern}`)
      }
      
      if (location && location !== 'all') {
        query = query.ilike('location', `%${location}%`)
      }
      
      if (status && status !== 'all') {
        query = query.eq('status', status)
      }
      
      // Apply pagination last
      query = query.range(offset, offset + limit - 1)
      
      // Execute query with timeout for faster failure
      const queryPromise = query
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Query timeout')), 5000)
      )
      
      const { data: liveEvents, error, count } = await Promise.race([
        queryPromise,
        timeoutPromise
      ]) as any
      
      if (!error && liveEvents) {
        // Map Supabase data to match admin interface expectations (only fields we selected)
        const events = liveEvents.map((event: any) => ({
          id: event.id,
          title: event.title,
          category: event.category || undefined,
          date: event.event_date || event.created_at,
          event_date: event.event_date,
          location: event.location || undefined,
          image: event.image_url || undefined,
          image_url: event.image_url || undefined,
          status: event.status || 'published',
          createdAt: event.created_at,
        }))
        
        const totalPages = count ? Math.ceil(count / limit) : 1
        
        return NextResponse.json({
          events,
          pagination: {
            page,
            limit,
            total: count || 0,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1
          }
        }, {
          headers: {
            'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
            'X-Content-Type-Options': 'nosniff'
          }
        })
      }
    } catch (supabaseError) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Supabase events query failed, using fallback:', supabaseError)
      }
    }
    
    // Fallback: Try to get events from articles table (for backward compatibility)
    try {
      const fallbackArticles = await loadOptimizedFallback()
      let filtered = fallbackArticles.filter(article => article.type === 'event')
      
      // Apply filters
      if (search) {
        const searchLower = search.toLowerCase()
        filtered = filtered.filter(event => 
          event.title.toLowerCase().includes(searchLower) ||
          (event.description && event.description.toLowerCase().includes(searchLower)) ||
          (event.excerpt && event.excerpt.toLowerCase().includes(searchLower))
        )
      }
      
      if (location && location !== 'all') {
        const locationLower = location.toLowerCase()
        filtered = filtered.filter(event => 
          event.location && event.location.toLowerCase().includes(locationLower)
        )
      }
      
      if (status && status !== 'all') {
        filtered = filtered.filter(event => event.status?.toLowerCase() === status.toLowerCase())
      }
      
      // Apply sorting
      switch (sortBy) {
        case 'oldest':
          filtered.sort((a, b) => new Date(a.createdAt || a.date || 0).getTime() - new Date(b.createdAt || b.date || 0).getTime())
          break
        case 'newest':
          filtered.sort((a, b) => new Date(b.createdAt || b.date || 0).getTime() - new Date(a.createdAt || a.date || 0).getTime())
          break
        case 'title':
          filtered.sort((a, b) => a.title.localeCompare(b.title))
          break
        case 'event_date':
        default:
          filtered.sort((a, b) => {
            const dateA = (a as any).event_date || a.date || a.createdAt || 0
            const dateB = (b as any).event_date || b.date || b.createdAt || 0
            return new Date(dateA).getTime() - new Date(dateB).getTime()
          })
          break
      }
      
      // Apply pagination
      const total = filtered.length
      const paginated = filtered.slice(offset, offset + limit)
      
      const events = paginated.map(event => ({
        id: event.id,
        title: event.title,
        category: event.category || undefined,
        date: (event as any).event_date || event.date || event.createdAt,
        location: event.location || undefined,
        image: event.imageUrl || (event as any).image_url || undefined,
        image_url: event.imageUrl || (event as any).image_url || undefined,
        status: event.status || 'published',
        createdAt: event.createdAt,
      }))
      
      const totalPages = Math.ceil(total / limit)
      
      return NextResponse.json({
        events,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }, {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
          'X-Content-Type-Options': 'nosniff'
        }
      })
    } catch (fallbackError) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Fallback events loading failed:', fallbackError)
      }
    }
    
    // Return empty result if all fails
    return NextResponse.json({
      events: [],
      pagination: {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: false
      }
    }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Content-Type-Options': 'nosniff'
      }
    })
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Admin API: Failed to load events:', error)
    }
    return NextResponse.json({
      events: [],
      pagination: {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: false
      }
    }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Content-Type-Options': 'nosniff'
      }
    })
  }
}

/**
 * DELETE handler for admin events
 * 
 * Deletes an event from both Supabase and local fallback
 * 
 * @param request - Next.js request object with event ID
 * @returns JSON response indicating success or failure
 * 
 * Performance:
 * - Atomic deletion from Supabase
 * - Efficient fallback update
 * - Proper error handling
 */
export async function DELETE(request: Request) {
  try {
    const { id } = await request.json()
    
    if (!id) {
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      )
    }
    
    // First, try to delete from Supabase
    if (supabase) {
      try {
        const { error: supabaseError } = await supabase
          .from('events')
          .delete()
          .eq('id', id)
        
        if (supabaseError) {
          if (process.env.NODE_ENV === 'development') {
            console.warn('Admin API: Failed to delete from Supabase:', supabaseError)
          }
          // Continue to local deletion as fallback
        }
      } catch (supabaseError) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('Admin API: Supabase delete failed, continuing with local deletion:', supabaseError)
        }
      }
    }
    
    // Always also delete from local fallback file
    const fallbackData = await loadOptimizedFallback()
    const initialLength = fallbackData.length
    
    // Remove the event from fallback data
    const updatedData = fallbackData.filter(item => item.id !== id)
    
    if (updatedData.length < initialLength) {
      // Update the fallback file with the removed event
      await updateOptimizedFallback(updatedData)
      return NextResponse.json({ 
        success: true, 
        message: 'Event deleted successfully' 
      })
    } else {
      return NextResponse.json({ 
        success: false, 
        message: 'Event not found' 
      }, { status: 404 })
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Admin API: Failed to delete event:', error)
    }
    return NextResponse.json(
      { error: 'Failed to delete event' }, 
      { status: 500 }
    )
  }
}
