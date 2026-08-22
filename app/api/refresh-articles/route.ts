import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { getQuickArticles } from '@/lib/supabase-optimized'
import { loadOptimizedFallback, updateOptimizedFallback } from '@/lib/optimized-fallback'
import { Article } from '@/lib/types/article'

/**
 * Admin only.
 *
 * This was open to the internet and does real work on every call -- Supabase
 * reads over the whole article set, in some cases including full article
 * bodies. Unauthenticated, it is free compute for anyone who finds it and a
 * standing invitation to run up the hosting bill.
 */
export async function POST(request: NextRequest) {
  const auth = requireAdmin(request)
  if (!auth.ok) return auth.response

  try {
    console.log('🔄 Refreshing articles cache...')
    
    // Try to get fresh data from Supabase
    try {
      const freshArticles = await getQuickArticles() as Article[]
      
      if (freshArticles.length > 0) {
        console.log(`✅ Got ${freshArticles.length} fresh articles from Supabase`)
        
        // Update the optimized fallback with fresh data
        await updateOptimizedFallback(freshArticles)
        
        return NextResponse.json({
          success: true,
          message: `Successfully refreshed ${freshArticles.length} articles`,
          count: freshArticles.length
        })
      }
    } catch (error) {
      console.warn('⚠️ Failed to get fresh articles from Supabase:', error)
    }
    
    // If Supabase fails, at least reload the current fallback
    const currentArticles = await loadOptimizedFallback()
    
    return NextResponse.json({
      success: true,
      message: `Reloaded ${currentArticles.length} articles from fallback`,
      count: currentArticles.length
    })
    
  } catch (error) {
    console.error('❌ Failed to refresh articles:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to refresh articles'
    }, { status: 500 })
  }
}
