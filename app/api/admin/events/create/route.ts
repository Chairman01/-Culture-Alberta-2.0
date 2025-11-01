import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { updateOptimizedFallback, loadOptimizedFallback } from '@/lib/optimized-fallback'
import { revalidatePath } from 'next/cache'

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://itdmwpbsnviassgqfhxk.supabase.co'
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0ZG13cGJzbnZpYXNzZ3FmaHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0ODU5NjUsImV4cCI6MjA2OTA2MTk2NX0.pxAXREQJrXJFZEBB3s7iwfm3rV_C383EbWCwf6ayPQo'
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase environment variables are not configured')
  }
  
  return createClient(supabaseUrl, supabaseKey)
}

export async function POST(request: Request) {
  try {
    const eventData = await request.json()
    
    console.log(`🔧 Admin API: Creating new event`)
    console.log(`📝 Event data:`, eventData)
    
    // First, try to create in Supabase
    try {
      console.log(`🔄 Admin API: Attempting to create event in Supabase...`)
      
      const supabase = getSupabaseClient()
      
      // Generate an ID for the event
      const eventId = `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      
      // Map the event data to Supabase format
      const supabaseEventData: any = {
        id: eventId,
        title: eventData.title,
        description: eventData.description,
        excerpt: eventData.excerpt,
        category: eventData.category,
        location: eventData.location,
        image_url: eventData.imageUrl || "",
        organizer: eventData.organizer,
        organizer_contact: eventData.organizer_contact,
        price: eventData.price,
        website_url: eventData.website_url,
        status: eventData.status || 'published',
        featured_home: eventData.featuredHome || false,
        featured_calgary: eventData.featuredCalgary || false,
        featured_edmonton: eventData.featuredEdmonton || false,
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
        console.error(`❌ Admin API: Supabase creation failed:`, JSON.stringify(supabaseError, null, 2))
        console.error(`❌ Event data sent:`, JSON.stringify(supabaseEventData, null, 2))
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
        content: eventData.description || '', // Events use description as content
        category: eventData.category,
        location: eventData.location,
        type: 'event',
        imageUrl: eventData.imageUrl || "",
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
      
      // Revalidate pages to ensure new event appears immediately
      try {
        revalidatePath('/', 'layout')
        revalidatePath('/events')
        console.log('✅ Pages revalidated')
      } catch (revalidateError) {
        console.error('❌ Revalidation failed:', revalidateError)
      }
      
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
        content: eventData.description || '', // Events use description as content
        category: eventData.category,
        location: eventData.location,
        type: 'event',
        imageUrl: eventData.imageUrl || "",
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
