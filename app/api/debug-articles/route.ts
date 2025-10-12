import { NextRequest, NextResponse } from 'next/server'
import { getAllArticles } from '@/lib/supabase-articles'

// Force dynamic rendering - no caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET /api/debug-articles - Debug endpoint to check article data
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 DEBUG: Starting article debug check...')
    
    const articles = await getAllArticles()
    
    // Calculate response size
    const responseSize = JSON.stringify(articles).length
    const responseSizeMB = (responseSize / (1024 * 1024)).toFixed(2)
    
    // Get article statistics
    const stats = {
      totalArticles: articles.length,
      responseSizeBytes: responseSize,
      responseSizeMB: responseSizeMB,
      articlesWithLargeContent: articles.filter(a => a.content && a.content.length > 100000).length,
      articlesWithVeryLargeContent: articles.filter(a => a.content && a.content.length > 1000000).length,
      largestContentSize: Math.max(...articles.map(a => a.content?.length || 0)),
      sampleArticleTitles: articles.slice(0, 5).map(a => ({
        title: a.title,
        contentLength: a.content?.length || 0,
        date: a.createdAt
      }))
    }
    
    console.log('📊 DEBUG: Article statistics:', stats)
    
    // Return limited debug info to prevent oversized responses
    return NextResponse.json({
      success: true,
      stats,
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL: process.env.VERCEL,
        isProduction: process.env.NODE_ENV === 'production' || process.env.VERCEL === '1'
      }
    })
  } catch (error) {
    console.error('❌ DEBUG: Error in debug endpoint:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        environment: {
          NODE_ENV: process.env.NODE_ENV,
          VERCEL: process.env.VERCEL,
          isProduction: process.env.NODE_ENV === 'production' || process.env.VERCEL === '1'
        }
      },
      { status: 500 }
    )
  }
}