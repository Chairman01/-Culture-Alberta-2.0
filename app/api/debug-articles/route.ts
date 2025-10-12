import { NextRequest, NextResponse } from 'next/server'
import { getAllArticles } from '@/lib/supabase-articles'
import { testSupabaseConnection } from '@/lib/supabase-articles'

export async function GET(request: NextRequest) {
  try {
    console.log('=== DEBUG ARTICLES API CALLED ===')
    
    // Test Supabase connection first
    console.log('Testing Supabase connection...')
    const connectionTest = await testSupabaseConnection()
    console.log('Connection test result:', connectionTest)
    
    // Try to get articles
    console.log('Fetching articles...')
    const articles = await getAllArticles()
    console.log('Articles fetched:', articles.length)
    
    if (articles.length > 0) {
      console.log('First article:', {
        id: articles[0].id,
        title: articles[0].title,
        category: articles[0].category,
        createdAt: articles[0].createdAt
      })
    }
    
    return NextResponse.json({
      success: true,
      connectionTest,
      articleCount: articles.length,
      articles: articles.slice(0, 5).map(article => ({
        id: article.id,
        title: article.title,
        category: article.category,
        createdAt: article.createdAt,
        status: article.status
      })),
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL: process.env.VERCEL,
        isProduction: process.env.NODE_ENV === 'production' || process.env.VERCEL === '1'
      }
    })
  } catch (error) {
    console.error('Debug articles API error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL: process.env.VERCEL,
        isProduction: process.env.NODE_ENV === 'production' || process.env.VERCEL === '1'
      }
    }, { status: 500 })
  }
}