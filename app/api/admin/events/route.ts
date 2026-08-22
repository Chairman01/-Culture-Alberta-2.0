import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { loadOptimizedFallback, updateOptimizedFallback } from '@/lib/optimized-fallback'
import { getServiceClient } from '@/lib/supabase-admin'

// Admin event writes run on the service role. They used the public anon key,
// which is the only reason the events table needed a policy letting anyone
// write to it -- and that policy was `USING (true)`, so the whole calendar was
// editable and deletable by anyone who read the browser bundle.
const getSupabaseClient = getServiceClient

export async function GET(request: NextRequest) {
  const auth = requireAdmin(request)
  if (!auth.ok) return auth.response

  console.log('🔄 Admin API: Loading events with fallback system...')

  // Try Supabase first
  try {
    const supabase = getSupabaseClient()
    const { data: supabaseEvents, error: supabaseError } = await supabase
      .from('events')
      .select('*')
      .order('event_date', { ascending: true })

    if (supabaseError) {
      console.warn(`⚠️ Admin API: Supabase query failed:`, supabaseError)
      throw supabaseError
    }

    if (supabaseEvents && supabaseEvents.length > 0) {
      console.log(`✅ Admin API: Loaded ${supabaseEvents.length} events from Supabase`)
      return NextResponse.json(supabaseEvents)
    }
  } catch (error) {
    console.warn('⚠️ Admin API: Supabase failed, using fallback:', error)
  }

  // Fallback to optimized JSON
  try {
    console.log('⚠️ Admin API: Using optimized fallback for events')
    const fallbackArticles = await loadOptimizedFallback()
    console.log(`⚡ FALLBACK: Loaded ${fallbackArticles.length} articles from optimized fallback`)

    // Filter for events only
    const events = fallbackArticles.filter(article => article.type === 'event')
    console.log(`✅ Admin API: Found ${events.length} events in fallback data`)

    return NextResponse.json(events)
  } catch (error) {
    console.error('❌ Admin API: Failed to load events from fallback:', error)
    return NextResponse.json([], { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const auth = requireAdmin(request)
  if (!auth.ok) return auth.response

  try {
    const { id } = await request.json()
    console.log(`🔧 Admin API: Delete event request for ID: ${id}`)

    // First, try to delete from Supabase
    try {
      const supabase = getSupabaseClient()
      const { error: supabaseError } = await supabase
        .from('events')
        .delete()
        .eq('id', id)

      if (supabaseError) {
        console.warn(`⚠️ Admin API: Failed to delete from Supabase:`, supabaseError)
        // Continue to local deletion as fallback
      } else {
        console.log(`✅ Admin API: Event ${id} deleted from Supabase`)
      }
    } catch (supabaseError) {
      console.warn(`⚠️ Admin API: Supabase delete failed, continuing with local deletion:`, supabaseError)
    }

    // Always also delete from local fallback file
    const fallbackData = await loadOptimizedFallback()
    const initialLength = fallbackData.length

    // Remove the event from fallback data
    const updatedData = fallbackData.filter(item => item.id !== id)

    if (updatedData.length < initialLength) {
      // Update the fallback file with the removed event
      await updateOptimizedFallback(updatedData)
      console.log(`✅ Admin API: Event ${id} deleted from fallback data`)
      return NextResponse.json({ success: true, message: 'Event deleted successfully' })
    } else {
      console.warn(`⚠️ Admin API: Event ${id} not found for deletion`)
      return NextResponse.json({ success: false, message: 'Event not found' }, { status: 404 })
    }
  } catch (error) {
    console.error('❌ Admin API: Failed to delete event:', error)
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 })
  }
}
