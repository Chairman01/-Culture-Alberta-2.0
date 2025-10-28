import { NextResponse } from 'next/server'
import { loadOptimizedFallback } from '@/lib/optimized-fallback'

export async function GET() {
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