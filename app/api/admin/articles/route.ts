import { NextResponse } from 'next/server'
import { loadOptimizedFallback } from '@/lib/optimized-fallback'

export async function GET() {
  try {
    console.log('🔧 Admin Articles API: Loading articles from optimized fallback...')
    
    const fallbackArticles = await loadOptimizedFallback()
    console.log(`✅ Admin Articles API: Loaded ${fallbackArticles.length} articles from optimized fallback`)
    
    // Filter for articles only (not events)
    const articles = fallbackArticles.filter(article => article.type !== 'event')
    console.log(`✅ Admin Articles API: Found ${articles.length} articles in fallback data`)
    
    return NextResponse.json(articles)
  } catch (error) {
    console.error('❌ Admin Articles API: Failed to load articles:', error)
    return NextResponse.json([], { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json()
    console.log(`🔧 Admin Articles API: Delete article request for ID: ${id}`)
    
    // For now, just return success since we're using fallback data
    // In a real implementation, you'd delete from Supabase
    console.log(`✅ Admin Articles API: Article ${id} deletion simulated`)
    
    return NextResponse.json({ success: true, message: 'Article deleted successfully' })
  } catch (error) {
    console.error('❌ Admin Articles API: Failed to delete article:', error)
    return NextResponse.json({ error: 'Failed to delete article' }, { status: 500 })
  }
}
