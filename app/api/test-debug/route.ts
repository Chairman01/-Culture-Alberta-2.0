import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    console.log('=== PRODUCTION DEBUG TEST ===')
    
    // Test environment variables
    const envCheck = {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      VERCEL_ENV: process.env.VERCEL_ENV,
      SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'NOT SET',
      SUPABASE_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET',
      SUPABASE_CLIENT: supabase ? 'INITIALIZED' : 'NOT INITIALIZED'
    }
    
    console.log('Environment check:', envCheck)
    
    // Test Supabase connection
    let supabaseTest = null
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('articles')
          .select('id, title')
          .limit(1)
        
        supabaseTest = {
          success: !error,
          error: error?.message || null,
          dataCount: data?.length || 0,
          sampleTitle: data?.[0]?.title || null
        }
      } catch (err) {
        supabaseTest = {
          success: false,
          error: err instanceof Error ? err.message : String(err),
          dataCount: 0,
          sampleTitle: null
        }
      }
    }
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      environment: envCheck,
      supabase: supabaseTest,
      message: 'Production debug test completed'
    })
    
  } catch (error) {
    console.error('Debug test failed:', error)
    return NextResponse.json({
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
