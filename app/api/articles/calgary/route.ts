import { NextResponse } from 'next/server'
import { loadOptimizedFallback } from '@/lib/optimized-fallback'

export async function GET() {
  try {
    console.log('🔧 API: Loading Calgary articles from optimized fallback...')
    
    const fallbackArticles = await loadOptimizedFallback()
    console.log(`✅ API: Loaded ${fallbackArticles.length} articles from optimized fallback`)
    
    // Filter for Calgary articles
    const calgaryArticles = fallbackArticles.filter(article => 
      article.category?.toLowerCase().includes('calgary') ||
      article.location?.toLowerCase().includes('calgary') ||
      article.categories?.some((cat: string) => cat.toLowerCase().includes('calgary')) ||
      article.tags?.some((tag: string) => tag.toLowerCase().includes('calgary'))
    )
    
    console.log(`✅ API: Found ${calgaryArticles.length} Calgary articles`)
    return NextResponse.json(calgaryArticles)
  } catch (error) {
    console.error('❌ API: Failed to load Calgary articles:', error)
    return NextResponse.json([], { status: 500 })
  }
}
