import { NextResponse } from 'next/server'
import { loadOptimizedFallback, updateOptimizedFallback } from '@/lib/optimized-fallback'
import { supabase } from '@/lib/supabase'
import { createApiResponse, handleApiError, validateEventData } from '@/lib/cursor-web-utils'
import { clearEventsCache } from '@/lib/events'
import { notifySearchEngines } from '@/lib/indexing'
import { createSlug } from '@/lib/utils/slug'

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
  website_url?: string
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
  website_url?: string
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

    console.log(`🔧 Admin API: Getting event by ID: ${eventId}`)

    // Try Supabase first
    try {
      if (!supabase) {
        console.warn('⚠️ Supabase client not initialized, using fallback')
        throw new Error('Supabase not initialized')
      }

      const { data: supabaseEvent, error: supabaseError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single()

      if (supabaseError) {
        console.warn(`⚠️ Supabase query failed:`, supabaseError)
        throw supabaseError
      }

      if (supabaseEvent) {
        console.log(`✅ Admin API: Found event in Supabase: ${supabaseEvent.title}`)
        return NextResponse.json(createApiResponse(true, supabaseEvent, undefined, 'Event retrieved successfully'))
      }
    } catch (error) {
      console.warn('⚠️ Supabase failed, trying fallback:', error)
    }

    // Fallback to optimized JSON
    console.log('⚠️ Using optimized fallback for event')
    const fallbackArticles = await loadOptimizedFallback()
    console.log(`⚡ FALLBACK: Loaded ${fallbackArticles.length} articles from optimized fallback`)

    // Find the specific event
    const event = fallbackArticles.find(article =>
      article.id === eventId && article.type === 'event'
    )

    if (!event) {
      return NextResponse.json(createApiResponse(false, undefined, 'Event not found'), { status: 404 })
    }

    console.log(`✅ Admin API: Found event in fallback: ${event.title}`)
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

    console.log(`🔧 Admin API: Updating event ID: ${eventId}`)
    console.log(`📝 Update data:`, updateData)

    // Quick validation - only validate required fields for performance
    if (!updateData.title?.trim()) {
      return NextResponse.json(
        createApiResponse(false, undefined, 'Title is required', 'Validation failed'),
        { status: 400 }
      )
    }

    // Try to update in Supabase first
    try {
      if (!supabase) {
        console.warn('⚠️ Supabase client not initialized, using fallback')
        throw new Error('Supabase not initialized')
      }

      console.log(`🔄 Admin API: Updating event ${eventId} in Supabase...`)

      // Map camelCase to snake_case for Supabase
      const supabaseUpdateData: SupabaseUpdateData = {
        title: updateData.title,
        description: updateData.description,
        excerpt: updateData.excerpt,
        category: updateData.category,
        location: updateData.location,
        image_url: updateData.imageUrl,
        organizer: updateData.organizer,
        price: updateData.price,
        link: updateData.link,
        website_url: updateData.website_url,
        status: updateData.status,
        featured_home: updateData.featuredHome,
        featured_calgary: updateData.featuredCalgary,
        featured_edmonton: updateData.featuredEdmonton,
        trending_home: updateData.trendingHome,
        trending_calgary: updateData.trendingCalgary,
        trending_edmonton: updateData.trendingEdmonton,
        event_date: updateData.event_date,
        event_end_date: updateData.event_end_date,
        updated_at: new Date().toISOString()
      }

      // Remove undefined and empty string values ("" would fail for timestamp columns)
      Object.keys(supabaseUpdateData).forEach(key => {
        const val = supabaseUpdateData[key as keyof SupabaseUpdateData]
        if (val === undefined || val === '') {
          delete supabaseUpdateData[key as keyof SupabaseUpdateData]
        }
      })

      const { data: supabaseResult, error: supabaseError } = await supabase
        .from('events')
        .update(supabaseUpdateData)
        .eq('id', eventId)
        .select()
        .single()

      if (supabaseError) {
        console.warn(`⚠️ Supabase update failed:`, supabaseError)
        throw supabaseError
      }

      console.log(`✅ Admin API: Event ${eventId} updated successfully in Supabase`)

      clearEventsCache()

      // Also update fallback for consistency
      try {
        const fallbackArticles = await loadOptimizedFallback()
        const eventIndex = fallbackArticles.findIndex(article =>
          article.id === eventId && article.type === 'event'
        )

        if (eventIndex !== -1) {
          const updatedEvent = {
            ...fallbackArticles[eventIndex],
            ...updateData,
            id: eventId,
            type: 'event',
            updatedAt: new Date().toISOString()
          }
          fallbackArticles[eventIndex] = updatedEvent
          await updateOptimizedFallback(fallbackArticles)
          console.log(`✅ Admin API: Event also updated in fallback for consistency`)
        }
      } catch (fallbackError) {
        console.warn('⚠️ Failed to update fallback, but Supabase update succeeded:', fallbackError)
      }

      // Notify search engines about the updated event (non-blocking)
      if (updateData.status === 'published' || !updateData.status) {
        const eventSlug = createSlug(updateData.title || supabaseResult.title)
        notifySearchEngines(`/events/${eventSlug}`).catch(err =>
          console.warn('⚠️ Search engine notification failed (non-fatal):', err)
        )
      }

      return NextResponse.json(createApiResponse(
        true,
        supabaseResult,
        undefined,
        'Event updated successfully'
      ))
    } catch (error) {
      console.warn('⚠️ Supabase update failed, trying fallback:', error)
    }

    // Fallback: Update only in local fallback file
    console.log(`🔄 Admin API: Updating event ${eventId} in local fallback...`)

    const fallbackArticles = await loadOptimizedFallback()
    const eventIndex = fallbackArticles.findIndex(article =>
      article.id === eventId && article.type === 'event'
    )

    if (eventIndex === -1) {
      console.error(`❌ Admin API: Event ${eventId} not found in fallback`)
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

    console.log(`✅ Admin API: Event ${eventId} updated successfully in fallback`)
    clearEventsCache()

    return NextResponse.json(createApiResponse(
      true,
      updatedEvent,
      undefined,
      'Event updated successfully (fallback only - Supabase unavailable)'
    ))
  } catch (error) {
    const errorResponse = handleApiError(error, 'update event')
    return NextResponse.json(errorResponse, { status: 500 })
  }
}
