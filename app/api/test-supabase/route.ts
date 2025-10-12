import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Force dynamic rendering - no caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET /api/test-supabase - Simple test to check Supabase connection
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Testing Supabase connection...')
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({
        success: false,
        error: 'Missing Supabase credentials',
        environment: {
          NODE_ENV: process.env.NODE_ENV,
          VERCEL: process.env.VERCEL,
          hasSupabaseUrl: !!supabaseUrl,
          hasSupabaseKey: !!supabaseKey
        }
      }, { status: 500 })
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Test simple query with timeout
    const startTime = Date.now()
    const { data, error } = await Promise.race([
      supabase.from('articles').select('id, title, created_at').limit(5),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Supabase timeout after 10 seconds')), 10000)
      )
    ]) as any
    
    const endTime = Date.now()
    const responseTime = endTime - startTime
    
    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
        responseTime: responseTime,
        environment: {
          NODE_ENV: process.env.NODE_ENV,
          VERCEL: process.env.VERCEL,
          supabaseUrl: supabaseUrl.substring(0, 30) + '...'
        }
      }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      articleCount: data?.length || 0,
      responseTime: responseTime,
      sampleArticles: data?.slice(0, 3).map((a: any) => ({
        id: a.id,
        title: a.title,
        created_at: a.created_at
      })) || [],
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL: process.env.VERCEL,
        supabaseUrl: supabaseUrl.substring(0, 30) + '...'
      }
    })
  } catch (error) {
    console.error('❌ Supabase test failed:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL: process.env.VERCEL
      }
    }, { status: 500 })
  }
}
