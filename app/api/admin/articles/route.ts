import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { loadOptimizedFallback } from '@/lib/optimized-fallback'

/**
 * Admin Articles API Route
 * 
 * Handles GET and DELETE operations for admin article management.
 * 
 * Performance optimizations:
 * - Uses singleton Supabase client (reuses connection)
 * - Selects only essential fields (reduces payload size)
 * - Implements fallback system for reliability
 * - Limits query results (prevents large data transfers)
 * 
 * Security:
 * - TODO: Add authentication middleware (currently missing - CRITICAL)
 * - Validates input parameters
 * - Uses environment variables for credentials
 * 
 * @route GET /api/admin/articles
 * @route DELETE /api/admin/articles
 */

/**
 * Type definition for Supabase article row from database
 * 
 * This matches the actual database schema structure
 */
interface SupabaseArticleRow {
  id: string
  title: string
  excerpt?: string | null
  category?: string | null
  categories?: string[] | null
  location?: string | null
  author?: string | null
  tags?: string[] | null
  type?: string | null
  status?: string | null
  created_at: string
  updated_at?: string | null
  trending_home?: boolean | null
  trending_edmonton?: boolean | null
  trending_calgary?: boolean | null
  featured_home?: boolean | null
  featured_edmonton?: boolean | null
  featured_calgary?: boolean | null
  image_url?: string | null
}

/**
 * GET /api/admin/articles
 * 
 * Fetches articles for admin dashboard with server-side pagination, filtering, and sorting.
 * 
 * Query parameters:
 * - page: number - Page number (default: 1)
 * - limit: number - Items per page (default: 20, max: 100)
 * - search: string - Search term for title/excerpt
 * - category: string - Filter by category
 * - location: string - Filter by location
 * - sortBy: string - Sort field: 'newest' | 'oldest' | 'title' (default: 'newest')
 * - refresh: boolean - Force refresh from Supabase (bypasses cache)
 * 
 * Returns:
 * - Object with articles array, pagination metadata, and total count
 * - Empty array on error (with 500 status)
 * 
 * Performance:
 * - Server-side pagination (default 20 items per page)
 * - Server-side filtering and sorting
 * - Fetches only essential fields (excludes full content for list view)
 * - Uses database indexes for fast queries
 * - Falls back to optimized fallback file if Supabase fails
 * 
 * Used by:
 * - app/admin/articles/page.tsx (admin dashboard)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const forceRefresh = searchParams.get('refresh') === 'true'
    
    // Parse query parameters with defaults
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)))
    const search = searchParams.get('search') || ''
    const category = searchParams.get('category') || ''
    const location = searchParams.get('location') || ''
    const sortBy = searchParams.get('sortBy') || 'newest'
    
    const offset = (page - 1) * limit
    
    // SECURITY: TODO - Add authentication check here
    // if (!await isAuthenticated(request)) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }
    
    // Try to get live data from Supabase first
    try {
      // PERFORMANCE: Select only minimal essential fields for admin list view
      // Reduced fields for faster queries and smaller payload
      const essentialFields = [
        'id',
        'title',
        'excerpt',
        'category',
        'location',
        'type',
        'status',
        'created_at',
        'updated_at',
        'image_url'
      ].join(',')

      // Build query with filters - optimized for speed
      let query = supabase
        .from('articles')
        .select(essentialFields, { count: 'exact' })
      
      // Apply sorting first (indexes work better this way)
      switch (sortBy) {
        case 'oldest':
          query = query.order('created_at', { ascending: true })
          break
        case 'title':
          query = query.order('title', { ascending: true })
          break
        case 'newest':
        default:
          query = query.order('created_at', { ascending: false })
          break
      }
      
      // Apply filters (after sorting for better index usage)
      if (search) {
        const searchPattern = `%${search}%`
        query = query.or(`title.ilike.${searchPattern},excerpt.ilike.${searchPattern}`)
      }
      
      if (category && category !== 'all') {
        query = query.eq('category', category)
      }
      
      if (location && location !== 'all') {
        query = query.eq('location', location)
      }
      
      // Apply pagination last
      query = query.range(offset, offset + limit - 1)
      
      // Execute query with timeout for faster failure
      const queryPromise = query
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Query timeout')), 5000)
      )
      
      const { data: liveArticles, error, count } = await Promise.race([
        queryPromise,
        timeoutPromise
      ]) as any
      
      if (!error && liveArticles) {
        // Type guard: Ensure we have valid article data
        const typedArticles = (liveArticles || []) as unknown as SupabaseArticleRow[]
        
        // PERFORMANCE: Map fields in single pass (O(n) instead of multiple operations)
        const articles = typedArticles.map((article: SupabaseArticleRow) => ({
          id: article.id,
          title: article.title,
          excerpt: article.excerpt || undefined,
          category: article.category || undefined,
          categories: article.categories || undefined,
          location: article.location || undefined,
          author: article.author || undefined,
          tags: article.tags || undefined,
          type: article.type || undefined,
          status: article.status || undefined,
          imageUrl: article.image_url || undefined,
          date: article.created_at,
          trendingHome: article.trending_home ?? false,
          trendingEdmonton: article.trending_edmonton ?? false,
          trendingCalgary: article.trending_calgary ?? false,
          featuredHome: article.featured_home ?? false,
          featuredEdmonton: article.featured_edmonton ?? false,
          featuredCalgary: article.featured_calgary ?? false,
          createdAt: article.created_at,
          updatedAt: article.updated_at || article.created_at,
        }))
        
        const totalPages = count ? Math.ceil(count / limit) : 1
        
        return NextResponse.json({
          articles,
          pagination: {
            page,
            limit,
            total: count || 0,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1
          }
        }, {
          headers: {
            'Cache-Control': forceRefresh 
              ? 'no-cache, no-store, must-revalidate'
              : 'public, s-maxage=30, stale-while-revalidate=60',
            'X-Content-Type-Options': 'nosniff'
          }
        })
      }
    } catch (supabaseError) {
      // Fallback to optimized fallback if Supabase fails
      if (process.env.NODE_ENV === 'development') {
        console.error('Supabase query failed, using fallback:', supabaseError)
      }
    }
    
    // Fallback to optimized fallback file with client-side filtering
    const fallbackArticles = await loadOptimizedFallback()
    
    // Apply filters to fallback data
    let filtered = fallbackArticles
    
    if (search) {
      const searchLower = search.toLowerCase()
      filtered = filtered.filter(article => 
        article.title.toLowerCase().includes(searchLower) ||
        (article.excerpt && article.excerpt.toLowerCase().includes(searchLower))
      )
    }
    
    if (category && category !== 'all') {
      filtered = filtered.filter(article => article.category === category)
    }
    
    if (location && location !== 'all') {
      filtered = filtered.filter(article => article.location === location)
    }
    
    // Apply sorting
    switch (sortBy) {
      case 'oldest':
        filtered.sort((a, b) => new Date(a.createdAt || a.date || 0).getTime() - new Date(b.createdAt || b.date || 0).getTime())
        break
      case 'title':
        filtered.sort((a, b) => a.title.localeCompare(b.title))
        break
      case 'newest':
      default:
        filtered.sort((a, b) => new Date(b.createdAt || b.date || 0).getTime() - new Date(a.createdAt || a.date || 0).getTime())
        break
    }
    
    // Apply pagination
    const total = filtered.length
    const paginated = filtered.slice(offset, offset + limit)
    
    // Map fallback data to match admin interface expectations
    const articles = paginated.map(article => ({
      ...article,
      imageUrl: article.imageUrl,
      date: article.date || article.createdAt,
      trendingHome: article.trendingHome ?? false,
      trendingEdmonton: article.trendingEdmonton ?? false,
      trendingCalgary: article.trendingCalgary ?? false,
      featuredHome: article.featuredHome ?? false,
      featuredEdmonton: article.featuredEdmonton ?? false,
      featuredCalgary: article.featuredCalgary ?? false,
      createdAt: article.createdAt,
      updatedAt: article.updatedAt || article.createdAt,
    }))
    
    const totalPages = Math.ceil(total / limit)
    
    return NextResponse.json({
      articles,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
      }
    })
    
  } catch (error) {
    // Return empty result instead of error to prevent admin dashboard crash
    return NextResponse.json({
      articles: [],
      pagination: {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: false
      }
    }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Content-Type-Options': 'nosniff'
      }
    })
  }
}

/**
 * DELETE /api/admin/articles
 * 
 * Deletes an article from the database.
 * 
 * Request body:
 * - id: string - Article ID to delete
 * 
 * Returns:
 * - Success object with message
 * - Error object with status code
 * 
 * Security:
 * - TODO: Add authentication check (CRITICAL - currently missing)
 * - TODO: Add authorization check (verify user has delete permissions)
 * - Validates article ID format
 * 
 * Performance:
 * - Uses Supabase for atomic delete operation
 * - Updates fallback file asynchronously (non-blocking)
 * 
 * Used by:
 * - app/admin/articles/page.tsx (delete button)
 */
export async function DELETE(request: Request) {
  try {
    // SECURITY: TODO - Add authentication check
    // if (!await isAuthenticated(request)) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }
    
    const body = await request.json() as { id?: unknown }
    const { id } = body
    
    // VALIDATION: Ensure ID is provided and is a string
    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'Invalid article ID' }, 
        { status: 400 }
      )
    }
    
    // SECURITY: Validate ID format (prevent injection attacks)
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
      return NextResponse.json(
        { error: 'Invalid article ID format' }, 
        { status: 400 }
      )
    }
    
    // PERFORMANCE: Delete from Supabase first (primary source of truth)
    // This is atomic and ensures data consistency
    const { error: deleteError } = await supabase
      .from('articles')
      .delete()
      .eq('id', id)
    
    if (deleteError) {
      // If Supabase delete fails, don't update fallback
      // This prevents data inconsistency
      return NextResponse.json(
        { error: 'Failed to delete article from database' }, 
        { status: 500 }
      )
    }
    
    // PERFORMANCE: Update fallback file asynchronously (non-blocking)
    // This doesn't block the response, improving perceived performance
    setImmediate(async () => {
      try {
        const { loadOptimizedFallback, updateOptimizedFallback } = await import('@/lib/optimized-fallback')
        const allArticles = await loadOptimizedFallback()
        const filteredArticles = allArticles.filter(article => article.id !== id)
        await updateOptimizedFallback(filteredArticles)
      } catch (fallbackError) {
        // Log error but don't fail the request
        // Fallback update is not critical for delete operation
        if (process.env.NODE_ENV === 'development') {
          console.error('Failed to update fallback after delete:', fallbackError)
        }
      }
    })
    
    return NextResponse.json({ 
      success: true, 
      message: 'Article deleted successfully' 
    })
    
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Failed to delete article',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
}
