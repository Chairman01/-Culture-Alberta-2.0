import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { requireAdmin } from '@/lib/admin-auth'

export async function POST(request: NextRequest) {
  const auth = requireAdmin(request)
  if (!auth.ok) return auth.response

  try {
    console.log('🔄 Force refresh endpoint called')
    
    // Revalidate all major paths
    revalidatePath('/')
    revalidatePath('/edmonton')
    revalidatePath('/calgary')
    revalidatePath('/food-drink')
    revalidatePath('/culture')
    revalidatePath('/events')
    
    // Revalidate all article paths
    revalidatePath('/articles')
    revalidatePath('/articles/[slug]', 'page')
    
    // Revalidate all event paths
    revalidatePath('/events/[slug]', 'page')
    
    // Clear all caches
    revalidateTag('articles')
    revalidateTag('events')
    revalidateTag('homepage')
    revalidateTag('city-pages')
    
    console.log('✅ All caches cleared and paths revalidated')
    
    return NextResponse.json({ 
      success: true, 
      message: 'All caches cleared and paths revalidated',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('❌ Error in force refresh:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to refresh caches' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Force refresh endpoint - use POST to trigger refresh',
    timestamp: new Date().toISOString()
  })
}
