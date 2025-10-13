import { NextResponse } from 'next/server'
import { loadOptimizedFallback, updateOptimizedFallback } from '@/lib/optimized-fallback'

export async function GET() {
  try {
    console.log('🔧 Admin API: Loading events from optimized fallback...')
    
    const fallbackArticles = await loadOptimizedFallback()
    console.log(`✅ Admin API: Loaded ${fallbackArticles.length} articles from optimized fallback`)
    
    // Filter for events only
    const events = fallbackArticles.filter(article => article.type === 'event')
    console.log(`✅ Admin API: Found ${events.length} events in fallback data`)
    
    return NextResponse.json(events)
  } catch (error) {
    console.error('❌ Admin API: Failed to load events:', error)
    return NextResponse.json([], { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json()
    console.log(`🔧 Admin API: Delete event request for ID: ${id}`)
    
    // Load current fallback data
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
