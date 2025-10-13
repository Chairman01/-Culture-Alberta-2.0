import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { updateOptimizedFallback, loadOptimizedFallback } from '@/lib/optimized-fallback'

export async function POST(request: Request) {
  try {
    const eventData = await request.json()
    
    console.log(`🔧 Admin API: Creating new event`)
    console.log(`📝 Event data:`, eventData)
    
    // First, try to create in Supabase
    try {
      console.log(`🔄 Admin API: Attempting to create event in Supabase...`)
      
      // Map the event data to Supabase format
      const supabaseEventData: any = {
        title: eventData.title,
        description: eventData.description,
        excerpt: eventData.excerpt,
        category: eventData.category,
        location: eventData.location,
        image_url: eventData.imageUrl || "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=600&fit=crop",
        organizer: eventData.organizer,
        price: eventData.price,
        link: eventData.link,
        status: eventData.status || 'published',
        featured_home: eventData.featuredHome || false,
        featured_calgary: eventData.featuredCalgary || false,
        featured_edmonton: eventData.featuredEdmonton || false,
        trending_home: eventData.trendingHome || false,
        trending_calgary: eventData.trendingCalgary || false,
        trending_edmonton: eventData.trendingEdmonton || false,
        event_date: eventData.event_date,
        event_end_date: eventData.event_end_date,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      // Remove undefined values
      Object.keys(supabaseEventData).forEach(key => {
        if (supabaseEventData[key] === undefined) {
          delete supabaseEventData[key]
        }
      })
      
      const { data: supabaseResult, error: supabaseError } = await supabase
        .from('events')
        .insert(supabaseEventData)
        .select()
        .single()
      
      if (supabaseError) {
        console.warn(`⚠️ Admin API: Supabase creation failed:`, supabaseError)
        throw new Error(`Supabase creation failed: ${supabaseError.message}`)
      }
      
      console.log(`✅ Admin API: Event successfully created in Supabase with ID: ${supabaseResult.id}`)
      
      // Also add to fallback for consistency
      const fallbackArticles = await loadOptimizedFallback()
      const newEvent = {
        id: supabaseResult.id,
        title: eventData.title,
        description: eventData.description,
        excerpt: eventData.excerpt || (eventData.description ? eventData.description.substring(0, 150) + (eventData.description.length > 150 ? '...' : '') : ''),
        category: eventData.category,
        location: eventData.location,
        type: 'event',
        imageUrl: eventData.imageUrl || "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=600&fit=crop",
        event_date: eventData.event_date,
        event_end_date: eventData.event_end_date,
        website_url: eventData.website_url,
        organizer: eventData.organizer,
        organizer_contact: eventData.organizer_contact,
        status: 'published',
        createdAt: supabaseResult.created_at,
        updatedAt: supabaseResult.updated_at
      }
      
      fallbackArticles.push(newEvent)
      await updateOptimizedFallback(fallbackArticles)
      console.log(`✅ Admin API: Event also added to fallback for consistency`)
      
      return NextResponse.json({ 
        success: true, 
        message: 'Event created successfully in Supabase',
        event: supabaseResult
      })
      
    } catch (supabaseError) {
      console.warn(`⚠️ Admin API: Supabase creation failed, falling back to local creation:`, supabaseError)
      
      // Fallback: Create only in local fallback file
      const eventId = `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      
      const fallbackArticles = await loadOptimizedFallback()
      const newEvent = {
        id: eventId,
        title: eventData.title,
        description: eventData.description,
        excerpt: eventData.excerpt || (eventData.description ? eventData.description.substring(0, 150) + (eventData.description.length > 150 ? '...' : '') : ''),
        category: eventData.category,
        location: eventData.location,
        type: 'event',
        imageUrl: eventData.imageUrl || "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=600&fit=crop",
        event_date: eventData.event_date,
        event_end_date: eventData.event_end_date,
        website_url: eventData.website_url,
        organizer: eventData.organizer,
        organizer_contact: eventData.organizer_contact,
        status: 'published',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      
      fallbackArticles.push(newEvent)
      await updateOptimizedFallback(fallbackArticles)
      
      console.log(`⚠️ Admin API: Event ${eventId} created in fallback only (Supabase unavailable)`)
      
      return NextResponse.json({ 
        success: true, 
        message: 'Event created in fallback (Supabase unavailable)',
        event: newEvent,
        warning: 'Event saved locally only - Supabase connection failed'
      })
    }
  } catch (error) {
    console.error('❌ Admin API: Failed to create event:', error)
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 })
  }
}
