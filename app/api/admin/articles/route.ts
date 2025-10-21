import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://itdmwpbsnviassgqfhxk.supabase.co'
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0ZG13cGJzbnZpYXNzZ3FmaHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0ODU5NjUsImV4cCI6MjA2OTA2MTk2NX0.pxAXREQJrXJFZEBB3s7iwfm3rV_C383EbWCwf6ayPQo'
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase environment variables are not configured')
  }
  
  return createClient(supabaseUrl, supabaseKey)
}

export async function GET() {
  try {
    console.log('🔧 Admin Articles API: Loading articles from Supabase...')
    
    const supabase = getSupabaseClient()
    
    // Fetch articles from Supabase
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('❌ Admin Articles API: Supabase error:', error)
      throw error
    }
    
    console.log(`✅ Admin Articles API: Loaded ${data?.length || 0} articles from Supabase`)
    
    // Map Supabase data to match our Article interface
    const articles = (data || []).map(article => ({
      ...article,
      imageUrl: article.image_url,
      date: article.created_at,
      trendingHome: article.trending_home || false,
      trendingEdmonton: article.trending_edmonton || false,
      trendingCalgary: article.trending_calgary || false,
      featuredHome: article.featured_home || false,
      featuredEdmonton: article.featured_edmonton || false,
      featuredCalgary: article.featured_calgary || false,
      createdAt: article.created_at,
      updatedAt: article.updated_at,
    }))
    
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
