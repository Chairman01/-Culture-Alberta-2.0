/**
 * Best Of Articles API Route
 * 
 * Optimized API for fetching best-of articles with server-side filtering and pagination
 * 
 * Query parameters:
 * - page: number - Page number (default: 1)
 * - limit: number - Items per page (default: 10, max: 50)
 * - category: string - Filter by category
 * - search: string - Search term
 * 
 * Performance:
 * - Server-side filtering (only best-of articles)
 * - Server-side pagination (default 10 items per page)
 * - Minimal fields (no content field)
 * - Uses database indexes for fast queries
 */

import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { loadOptimizedFallback } from '@/lib/optimized-fallback'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Parse query parameters with defaults
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)))
    const category = searchParams.get('category') || ''
    const search = searchParams.get('search') || ''
    
    const offset = (page - 1) * limit
    
    // Try to get live data from Supabase first
    try {
      // Select only minimal essential fields for best-of list view
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

      // Build query - filter for best-of articles
      let query = supabase
        .from('articles')
        .select(essentialFields, { count: 'exact' })
        .or('category.ilike.%best%,type.ilike.%best-of%,type.ilike.%bestof%')
        .order('created_at', { ascending: false })
      
      // Apply category filter
      if (category && category !== 'all') {
        query = query.eq('category', category)
      }
      
      // Apply search filter
      if (search) {
        const searchPattern = `%${search}%`
        query = query.or(`title.ilike.${searchPattern},excerpt.ilike.${searchPattern}`)
      }
      
      // Apply pagination
      query = query.range(offset, offset + limit - 1)
      
      // Execute query with timeout
      const queryPromise = query
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Query timeout')), 5000)
      )
      
      const { data: liveArticles, error, count } = await Promise.race([
        queryPromise,
        timeoutPromise
      ]) as any
      
      if (!error && liveArticles) {
        const articles = liveArticles.map((article: any) => ({
          id: article.id,
          title: article.title,
          excerpt: article.excerpt || undefined,
          category: article.category || undefined,
          location: article.location || undefined,
          type: article.type || undefined,
          status: article.status || undefined,
          imageUrl: article.image_url || undefined,
          date: article.created_at,
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
            'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
            'X-Content-Type-Options': 'nosniff'
          }
        })
      }
    } catch (supabaseError) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Supabase query failed, using fallback:', supabaseError)
      }
    }
    
    // Fallback to optimized fallback file
    const fallbackArticles = await loadOptimizedFallback()
    
    // Filter for best-of articles
    let filtered = fallbackArticles.filter((article: any) => {
      const cat = (article.category || '').toLowerCase()
      const type = (article.type || '').toLowerCase()
      return cat.includes('best') || type.includes('best-of') || type.includes('bestof')
    })
    
    // Apply category filter
    if (category && category !== 'all') {
      filtered = filtered.filter((article: any) => article.category === category)
    }
    
    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase()
      filtered = filtered.filter((article: any) => 
        article.title.toLowerCase().includes(searchLower) ||
        (article.excerpt && article.excerpt.toLowerCase().includes(searchLower))
      )
    }
    
    // Sort by date
    filtered.sort((a: any, b: any) => 
      new Date(b.createdAt || b.date || 0).getTime() - new Date(a.createdAt || a.date || 0).getTime()
    )
    
    // Apply pagination
    const total = filtered.length
    const paginated = filtered.slice(offset, offset + limit)
    
    const articles = paginated.map((article: any) => ({
      ...article,
      imageUrl: article.imageUrl,
      date: article.date || article.createdAt,
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
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        'X-Content-Type-Options': 'nosniff'
      }
    })
    
  } catch (error) {
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

