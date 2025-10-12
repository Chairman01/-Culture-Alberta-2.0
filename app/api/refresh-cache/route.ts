import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { clearArticlesCache } from '@/lib/supabase-articles'

// Simple API endpoint to refresh cache and show newest articles
export async function POST() {
  try {
    console.log('🔄 Refreshing cache for all pages...')
    
    // Clear in-memory articles cache
    clearArticlesCache()
    console.log('✅ Cleared in-memory cache')
    
    // Clear Next.js cache for all main pages
    revalidatePath('/')
    revalidatePath('/edmonton')
    revalidatePath('/calgary')
    revalidatePath('/food-drink')
    revalidatePath('/culture')
    revalidatePath('/events')
    revalidatePath('/articles')
    
    console.log('✅ Cache refreshed successfully')
    
    return NextResponse.json({ 
      success: true, 
      message: 'Cache refreshed - newest articles will now show',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('❌ Error refreshing cache:', error)
    return NextResponse.json(
      { error: 'Failed to refresh cache', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// Also support GET for easy browser testing
export async function GET() {
  return POST()
}

