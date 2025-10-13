import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET(request: NextRequest) {
  try {
    console.log('🔧 API: Loading articles from optimized fallback...')
    
    // Read directly from file to avoid server-only import issues
    const fallbackPath = path.join(process.cwd(), 'optimized-fallback.json')
    
    if (!fs.existsSync(fallbackPath)) {
      console.log('❌ API: Optimized fallback file not found')
      return NextResponse.json({ error: 'Articles not available' }, { status: 404 })
    }
    
    const fileContents = fs.readFileSync(fallbackPath, 'utf-8')
    const fallbackArticles = JSON.parse(fileContents)
    
    console.log(`✅ API: Loaded ${fallbackArticles.length} articles from optimized fallback`)
    
    // Check if we're looking for a specific article by ID
    const { searchParams } = new URL(request.url)
    const articleId = searchParams.get('id')
    
    if (articleId) {
      console.log(`🔍 API: Looking for article with ID: ${articleId}`)
      const article = fallbackArticles.find((article: any) => article.id === articleId)
      
      if (article) {
        console.log(`✅ API: Found article: ${article.title}`)
        return NextResponse.json(article)
      } else {
        console.log(`❌ API: Article not found with ID: ${articleId}`)
        return NextResponse.json({ error: 'Article not found' }, { status: 404 })
      }
    }
    
    // Return all articles if no specific ID requested
    return NextResponse.json(fallbackArticles)
  } catch (error) {
    console.error('❌ API: Failed to load articles:', error)
    return NextResponse.json({ 
      error: 'Failed to load articles', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}