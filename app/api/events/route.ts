import { NextResponse } from 'next/server'
import { loadOptimizedFallback } from '@/lib/optimized-fallback'

export async function GET() {
  try {
    console.log('🔧 API: Loading events from optimized fallback...')
    
    const fallbackArticles = await loadOptimizedFallback()
    console.log(`✅ API: Loaded ${fallbackArticles.length} articles from optimized fallback`)
    
    // Filter for events only
    const events = fallbackArticles.filter(article => article.type === 'event')
    console.log(`✅ API: Found ${events.length} events in fallback data`)
    
    return NextResponse.json(events)
  } catch (error) {
    console.error('❌ API: Failed to load events:', error)
    return NextResponse.json([], { status: 500 })
  }
}
