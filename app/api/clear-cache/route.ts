import { NextResponse } from 'next/server'
import { clearFileArticlesCache } from '@/lib/file-articles'

export async function POST() {
  try {
    console.log('🧹 Clearing all caches...')
    
    // Clear file articles cache
    clearFileArticlesCache()
    
    // Clear any other caches if needed
    // You can add more cache clearing logic here
    
    console.log('✅ All caches cleared successfully')
    
    return NextResponse.json({ 
      success: true, 
      message: 'All caches cleared successfully',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('❌ Error clearing caches:', error)
    return NextResponse.json(
      { error: 'Failed to clear caches', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
