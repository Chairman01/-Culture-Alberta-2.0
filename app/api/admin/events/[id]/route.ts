import { NextResponse } from 'next/server'
import { loadOptimizedFallback, updateOptimizedFallback } from '@/lib/optimized-fallback'
import { supabase } from '@/lib/supabase'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const eventId = resolvedParams.id
    
    console.log(`🔧 Admin API: Getting event by ID: ${eventId}`)
    
    const fallbackArticles = await loadOptimizedFallback()
    console.log(`✅ Admin API: Loaded ${fallbackArticles.length} articles from optimized fallback`)
    
    // Find the specific event
    const event = fallbackArticles.find(article => 
      article.id === eventId && article.type === 'event'
    )
    
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }
    
    console.log(`✅ Admin API: Found event: ${event.title}`)
    return NextResponse.json(event)
  } catch (error) {
    console.error('❌ Admin API: Failed to get event:', error)
    return NextResponse.json({ error: 'Failed to get event' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const eventId = resolvedParams.id
    const updateData = await request.json()
    
    console.log(`🔧 Admin API: Updating event ID: ${eventId}`)
    console.log(`📝 Update data:`, updateData)
    
    // First, try to update in Supabase
    try {
      console.log(`🔄 Admin API: Attempting to update event ${eventId} in Supabase...`)
      
      // Map the update data to Supabase format
      const supabaseUpdateData: any = {
        title: updateData.title,
        description: updateData.description,
        excerpt: updateData.excerpt,
        category: updateData.category,
        location: updateData.location,
        image_url: updateData.imageUrl,
        organizer: updateData.organizer,
        price: updateData.price,
        link: updateData.link,
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
      
      // Remove undefined values
      Object.keys(supabaseUpdateData).forEach(key => {
        if (supabaseUpdateData[key] === undefined) {
          delete supabaseUpdateData[key]
        }
      })
      
      const { data: supabaseResult, error: supabaseError } = await supabase
        .from('events')
        .update(supabaseUpdateData)
        .eq('id', eventId)
        .select()
        .single()
      
      if (supabaseError) {
        console.warn(`⚠️ Admin API: Supabase update failed:`, supabaseError)
        throw new Error(`Supabase update failed: ${supabaseError.message}`)
      }
      
      console.log(`✅ Admin API: Event ${eventId} successfully updated in Supabase`)
      
      // Also update the fallback for consistency
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
        console.log(`✅ Admin API: Fallback also updated for consistency`)
      }
      
      return NextResponse.json({ 
        success: true, 
        message: 'Event updated successfully in Supabase',
        event: supabaseResult
      })
      
    } catch (supabaseError) {
      console.warn(`⚠️ Admin API: Supabase update failed, falling back to local update:`, supabaseError)
      
      // Fallback: Update only the local fallback file
      const fallbackArticles = await loadOptimizedFallback()
      const eventIndex = fallbackArticles.findIndex(article => 
        article.id === eventId && article.type === 'event'
      )
      
      if (eventIndex === -1) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 })
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
      
      console.log(`⚠️ Admin API: Event ${eventId} updated in fallback only (Supabase unavailable)`)
      
      return NextResponse.json({ 
        success: true, 
        message: 'Event updated in fallback (Supabase unavailable)',
        event: updatedEvent,
        warning: 'Changes saved locally only - Supabase connection failed'
      })
    }
  } catch (error) {
    console.error('❌ Admin API: Failed to update event:', error)
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 })
  }
}
