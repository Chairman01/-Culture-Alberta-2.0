import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * Download endpoint to get articles as a downloadable JSON file
 * 
 * Performance optimizations:
 * - Uses optimized Supabase client
 * - Selects only essential fields
 * - Timeout protection
 * - Efficient data transformation
 */
export async function GET() {
  try {
    if (!supabase) {
      throw new Error('Supabase client is not initialized')
    }
    
    // PERFORMANCE: Select only essential fields (reduces payload size)
    const essentialFields = [
      'id',
      'title',
      'excerpt',
      'content',
      'category',
      'categories',
      'location',
      'author',
      'tags',
      'type',
      'status',
      'created_at',
      'updated_at',
      'trending_home',
      'trending_edmonton',
      'trending_calgary',
      'featured_home',
      'featured_edmonton',
      'featured_calgary',
      'image_url'
    ].join(',')
    
    // Build query with timeout protection
    const queryPromise = supabase
      .from('articles')
      .select(essentialFields)
      .order('created_at', { ascending: false })
    
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Query timeout')), 30000) // 30 second timeout
    )
    
    const { data: articles, error } = await Promise.race([
      queryPromise,
      timeoutPromise
    ]) as any
    
    if (error) {
      throw new Error(`Supabase request failed: ${error.message}`)
    }
    
    if (!articles) {
      throw new Error('No articles returned from Supabase')
    }
    
    // Transform articles to match our interface
    const transformedArticles = (articles || []).map((article: any) => ({
      id: article.id,
      title: article.title || '',
      content: article.content || '',
      excerpt: article.excerpt || '',
      category: article.category || '',
      categories: article.categories || [article.category || ''],
      location: article.location || '',
      author: article.author || '',
      tags: article.tags || [],
      type: article.type || 'article',
      status: article.status || 'published',
      imageUrl: article.image_url || '',
      date: article.created_at || new Date().toISOString(),
      createdAt: article.created_at || new Date().toISOString(),
      updatedAt: article.updated_at || article.created_at || new Date().toISOString(),
      trendingHome: article.trending_home ?? false,
      trendingEdmonton: article.trending_edmonton ?? false,
      trendingCalgary: article.trending_calgary ?? false,
      featuredHome: article.featured_home ?? false,
      featuredEdmonton: article.featured_edmonton ?? false,
      featuredCalgary: article.featured_calgary ?? false
    }))
    
    // Create filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0] // YYYY-MM-DD format
    const filename = `articles-${timestamp}.json`
    
    // Return as downloadable JSON file
    return new Response(JSON.stringify(transformedArticles, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache'
      }
    })
    
  } catch (error) {
    console.error('❌ Error downloading articles:', error)
    return NextResponse.json(
      { error: 'Failed to download articles', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
