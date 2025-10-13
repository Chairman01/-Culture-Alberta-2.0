import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://itdmwpbsnviassgqfhxk.supabase.co'
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0ZG13cGJzbnZpYXNzZ3FmaHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0ODU5NjUsImV4cCI6MjA2OTA2MTk2NX0.pxAXREQJrXJFZEBB3s7iwfm3rV_C383EbWCwf6ayPQo'
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase environment variables are not configured')
  }
  
  return createClient(supabaseUrl, supabaseKey)
}

export async function POST(request: NextRequest) {
  try {
    const articleData = await request.json()
    
    console.log('📝 Creating new article:', articleData.title)

    // Get Supabase client
    const supabase = getSupabaseClient()

    // Insert the article into Supabase
    const { data, error } = await supabase
      .from('articles')
      .insert([{
        title: articleData.title,
        content: articleData.content,
        excerpt: articleData.excerpt,
        category: articleData.category,
        categories: articleData.categories,
        location: articleData.location,
        author: articleData.author,
        tags: articleData.tags,
        type: articleData.type || 'article',
        status: articleData.status || 'published',
        image_url: articleData.imageUrl,
        trending_home: articleData.trendingHome || false,
        trending_edmonton: articleData.trendingEdmonton || false,
        trending_calgary: articleData.trendingCalgary || false,
        featured_home: articleData.featuredHome || false,
        featured_edmonton: articleData.featuredEdmonton || false,
        featured_calgary: articleData.featuredCalgary || false,
      }])
      .select()
      .single()

    if (error) {
      console.error('❌ Error creating article in Supabase:', error)
      throw error
    }

    console.log('✅ Article created successfully:', data.id)

    return NextResponse.json({ 
      success: true, 
      article: data,
      message: 'Article created successfully. Remember to click "Sync Now" in /admin/sync-articles to make it appear on your website!'
    })

  } catch (error) {
    console.error('❌ Error in create article API:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create article', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

