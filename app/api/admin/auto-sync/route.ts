/**
 * Auto-Sync API Route
 * 
 * Automatically syncs articles from Supabase to fallback file
 * This ensures content is always up-to-date
 */

import { NextRequest, NextResponse } from 'next/server'
import { autoSyncArticles } from '@/lib/auto-sync'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Auto-sync API: Starting automatic sync...')
    
    const result = await autoSyncArticles()
    
    if (result.success) {
      console.log(`✅ Auto-sync API: Successfully synced ${result.count} articles`)
      return NextResponse.json({
        success: true,
        count: result.count,
        message: `Successfully synced ${result.count} articles`
      })
    } else {
      console.error('❌ Auto-sync API: Sync failed:', result.error)
      return NextResponse.json({
        success: false,
        error: result.error,
        message: 'Sync failed'
      }, { status: 500 })
    }
    
  } catch (error) {
    console.error('❌ Auto-sync API: Unexpected error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Auto-sync failed'
    }, { status: 500 })
  }
}
