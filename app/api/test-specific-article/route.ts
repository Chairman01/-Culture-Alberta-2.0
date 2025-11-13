import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    console.log('=== TESTING SPECIFIC ARTICLE DATA ===')
    
    // Create Supabase client with hardcoded credentials
    const supabase = createClient(
      'https://itdmwpbsnviassgqfhxk.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0ZG13cGJzbnZpYXNzZ3FmaHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0ODU5NjUsImV4cCI6MjA2OTA2MTk2NX0.pxAXREQJrXJFZEBB3s7iwfm3rV_C383EbWCwf6ayPQo'
    )
    
    // Get the minimum wage article with full data
    const { data: article, error } = await supabase
      .from('articles')
      .select('*')
      .ilike('title', '%minimum wage%')
      .limit(1)
    
    if (error) {
      return NextResponse.json({
        error: error.message,
        timestamp: new Date().toISOString()
      }, { status: 500 })
    }
    
    if (!article || article.length === 0) {
      return NextResponse.json({
        error: 'Article not found',
        timestamp: new Date().toISOString()
      }, { status: 404 })
    }
    
    const articleData = article[0]
    
    // Check content status
    const contentStatus = {
      hasContent: !!articleData.content,
      contentLength: articleData.content?.length || 0,
      contentTrimmed: articleData.content?.trim()?.length || 0,
      contentIsString: typeof articleData.content === 'string',
      contentIsNull: articleData.content === null,
      contentIsUndefined: articleData.content === undefined,
      contentIsEmptyString: articleData.content === '',
      hasExcerpt: !!articleData.excerpt,
      excerptLength: articleData.excerpt?.length || 0,
    }
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      article: {
        id: articleData.id,
        title: articleData.title,
        excerpt: articleData.excerpt,
        category: articleData.category,
        created_at: articleData.created_at,
        contentStatus: contentStatus,
        contentPreview: articleData.content?.substring(0, 200) || 'NO CONTENT',
        excerptPreview: articleData.excerpt?.substring(0, 200) || 'NO EXCERPT'
      }
    })
    
  } catch (error) {
    console.error('Test failed:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
