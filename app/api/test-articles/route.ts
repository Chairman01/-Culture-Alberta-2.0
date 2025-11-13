import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    console.log('=== TESTING PRODUCTION ARTICLE FETCH ===')
    
    // Create Supabase client with hardcoded credentials
    const supabase = createClient(
      'https://itdmwpbsnviassgqfhxk.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0ZG13cGJzbnZpYXNzZ3FmaHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0ODU5NjUsImV4cCI6MjA2OTA2MTk2NX0.pxAXREQJrXJFZEBB3s7iwfm3rV_C383EbWCwf6ayPQo'
    )
    
    console.log('Supabase client created successfully')
    
    // Test 1: Get all articles
    const { data: allArticles, error: allError } = await supabase
      .from('articles')
      .select('id, title, created_at')
      .order('created_at', { ascending: false })
      .limit(5)
    
    console.log('All articles query result:', { 
      success: !allError, 
      error: allError?.message, 
      count: allArticles?.length || 0 
    })
    
    // Test 2: Get specific article by title
    const { data: specificArticle, error: specificError } = await supabase
      .from('articles')
      .select('id, title, excerpt, content, category, created_at')
      .ilike('title', '%minimum wage%')
      .limit(1)
    
    console.log('Specific article query result:', { 
      success: !specificError, 
      error: specificError?.message, 
      found: specificArticle?.length || 0,
      title: specificArticle?.[0]?.title || null
    })
    
    // Test 3: Get Henna article
    const { data: hennaArticle, error: hennaError } = await supabase
      .from('articles')
      .select('id, title, excerpt, content, category, created_at')
      .ilike('title', '%henna%')
      .limit(1)
    
    console.log('Henna article query result:', { 
      success: !hennaError, 
      error: hennaError?.message, 
      found: hennaArticle?.length || 0,
      title: hennaArticle?.[0]?.title || null
    })
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      tests: {
        allArticles: {
          success: !allError,
          error: allError?.message || null,
          count: allArticles?.length || 0,
          sampleTitles: allArticles?.slice(0, 3).map(a => a.title) || []
        },
        minimumWageArticle: {
          success: !specificError,
          error: specificError?.message || null,
          found: specificArticle?.length || 0,
          title: specificArticle?.[0]?.title || null
        },
        hennaArticle: {
          success: !hennaError,
          error: hennaError?.message || null,
          found: hennaArticle?.length || 0,
          title: hennaArticle?.[0]?.title || null
        }
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
