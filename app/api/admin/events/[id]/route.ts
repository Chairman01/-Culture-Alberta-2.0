import { NextResponse } from 'next/server'
import { loadOptimizedFallback, updateOptimizedFallback } from '@/lib/optimized-fallback'
import { supabase } from '@/lib/supabase'
import { createApiResponse, handleApiError, validateEventData } from '@/lib/cursor-web-utils'

// Types for better type safety with Cursor web assistance
interface EventUpdateData {
  title?: string
  description?: string
  excerpt?: string
  category?: string
  location?: string
  imageUrl?: string
  organizer?: string
  price?: string
  link?: string
  status?: string
  featuredHome?: boolean
  featuredCalgary?: boolean
  featuredEdmonton?: boolean
  trendingHome?: boolean
  trendingCalgary?: boolean
  trendingEdmonton?: boolean
  event_date?: string
  event_end_date?: string
}

interface SupabaseUpdateData {
  title?: string
  description?: string
  excerpt?: string
  category?: string
  location?: string
  image_url?: string
  organizer?: string
  price?: string
  link?: string
  status?: string
  featured_home?: boolean
  featured_calgary?: boolean
  featured_edmonton?: boolean
  trending_home?: boolean
  trending_calgary?: boolean
  trending_edmonton?: boolean
  event_date?: string
  event_end_date?: string
  updated_at: string
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const eventId = resolvedParams.id
    
    const fallbackArticles = await loadOptimizedFallback()
    
    // Find the specific event
    const event = fallbackArticles.find(article => 
      article.id === eventId && article.type === 'event'
    )
    
    if (!event) {
      return NextResponse.json(createApiResponse(false, undefined, 'Event not found'), { status: 404 })
    }
    
    return NextResponse.json(createApiResponse(true, event, undefined, 'Event retrieved successfully'))
  } catch (error) {
    const errorResponse = handleApiError(error, 'get event')
    return NextResponse.json(errorResponse, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const eventId = resolvedParams.id
    const updateData: EventUpdateData = await request.json()
    
    // Quick validation - only validate required fields for performance
    if (!updateData.title?.trim()) {
      return NextResponse.json(
        createApiResponse(false, undefined, 'Title is required', 'Validation failed'),
        { status: 400 }
      )
    }
    
    // Update the local fallback file (events are stored locally)
    const fallbackArticles = await loadOptimizedFallback()
    const eventIndex = fallbackArticles.findIndex(article => 
      article.id === eventId && article.type === 'event'
    )

    if (eventIndex === -1) {
      if (process.env.NODE_ENV === 'development') {
        console.error(`Event ${eventId} not found in fallback`)
      }
      return NextResponse.json(
        createApiResponse(false, undefined, 'Event not found', 'Event not found'),
        { status: 404 }
      )
    }

    const updatedEvent = {
      ...fallbackArticles[eventIndex],
      ...updateData,
      id: eventId,
      type: 'event',
      updatedAt: new Date().toISOString()
    }

    fallbackArticles[eventIndex] = updatedEvent
    await updateOptimizedFallback(fallbackArticles)

    return NextResponse.json(createApiResponse(
      true,
      updatedEvent,
      undefined,
      'Event updated successfully'
    ))
  } catch (error) {
    const errorResponse = handleApiError(error, 'update event')
    return NextResponse.json(errorResponse, { status: 500 })
  }
}
