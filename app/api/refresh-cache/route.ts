import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { clearArticlesCache } from '@/lib/supabase-articles'
import { requireAdmin } from '@/lib/admin-auth'

// Force dynamic rendering - no caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

// Simple API endpoint to refresh cache and show newest articles
export async function POST(request: NextRequest) {
  const auth = requireAdmin(request)
  if (!auth.ok) return auth.response

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

export async function GET(request: NextRequest) {
  return POST(request)
}

