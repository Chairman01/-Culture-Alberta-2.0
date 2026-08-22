import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { loadOptimizedFallback } from '@/lib/optimized-fallback'

/**
 * Admin only.
 *
 * This was open to the internet and does real work on every call -- Supabase
 * reads over the whole article set, in some cases including full article
 * bodies. Unauthenticated, it is free compute for anyone who finds it and a
 * standing invitation to run up the hosting bill.
 */
export async function GET(request: NextRequest) {
  const auth = requireAdmin(request)
  if (!auth.ok) return auth.response

  try {
    console.log('🔍 Debug: Loading articles...')
    
    const articles = await loadOptimizedFallback()
    
    console.log(`🔍 Debug: Found ${articles.length} articles`)
    
    // Show first few articles for debugging
    const recentArticles = articles
      .sort((a, b) => new Date(b.createdAt || b.date || 0).getTime() - new Date(a.createdAt || a.date || 0).getTime())
      .slice(0, 5)
      .map(article => ({
        id: article.id,
        title: article.title,
        type: article.type,
        createdAt: article.createdAt || article.date,
        status: article.status
      }))
    
    return NextResponse.json({
      total: articles.length,
      recent: recentArticles,
      message: 'Debug info loaded'
    })
    
  } catch (error) {
    console.error('❌ Debug failed:', error)
    return NextResponse.json({
      error: 'Debug failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}