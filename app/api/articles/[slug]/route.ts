/**
 * Article by Slug API Route
 * 
 * Optimized API for fetching a single article by slug
 * 
 * Performance optimizations:
 * - Fetches only essential fields initially
 * - Fetches full content only when needed
 * - Timeout protection
 * - Uses database indexes
 * - Proper caching headers
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { loadOptimizedFallback } from '@/lib/optimized-fallback'
import { createSlug } from '@/lib/utils/slug'

// Minimal fields for article listing/preview
const articlePreviewFields = [
  'id',
  'title',
  'excerpt',
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

// Full fields including content
const articleFullFields = [
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const resolvedParams = await params
    const slug = resolvedParams.slug
    const { searchParams } = new URL(request.url)
    const includeContent = searchParams.get('content') === 'true'
    
    // Try Supabase first with timeout
    try {
      const fields = includeContent ? articleFullFields : articlePreviewFields
      
      const articlesQuery = supabase
        .from('articles')
        .select(fields)
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(50) // Get enough to find the article
      
      const queryPromise = articlesQuery
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Query timeout')), 5000)
      )
      
      const { data, error } = await Promise.race([
        queryPromise,
        timeoutPromise
      ]) as any
      
      if (!error && data) {
        // Find article by matching slug
        const article = data.find((article: any) => {
          const articleSlug = createSlug(article.title)
          return articleSlug.toLowerCase() === slug.toLowerCase()
        })
        
        if (article) {
          const mappedArticle = {
            id: article.id,
            title: article.title,
            excerpt: article.excerpt || '',
            content: includeContent ? (article.content || '') : undefined,
            category: article.category || '',
            categories: article.categories || [],
            location: article.location || '',
            author: article.author || '',
            tags: article.tags || [],
            type: article.type || 'article',
            status: article.status || 'published',
            imageUrl: article.image_url || '',
            date: article.created_at,
            createdAt: article.created_at,
            updatedAt: article.updated_at || article.created_at,
            trendingHome: article.trending_home ?? false,
            trendingEdmonton: article.trending_edmonton ?? false,
            trendingCalgary: article.trending_calgary ?? false,
            featuredHome: article.featured_home ?? false,
            featuredEdmonton: article.featured_edmonton ?? false,
            featuredCalgary: article.featured_calgary ?? false,
          }
          
          return NextResponse.json(mappedArticle, {
            headers: {
              'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
              'X-Content-Type-Options': 'nosniff'
            }
          })
        }
      }
    } catch (supabaseError) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Supabase query failed, using fallback:', supabaseError)
      }
    }
    
    // Fallback to optimized fallback file
    const fallbackArticles = await loadOptimizedFallback()
    const article = fallbackArticles.find((item: any) => {
      const articleSlug = createSlug(item.title)
      return articleSlug.toLowerCase() === slug.toLowerCase()
    })
    
    if (article) {
      // Only include content if requested
      const responseArticle = includeContent 
        ? article 
        : { ...article, content: undefined }
      
      return NextResponse.json(responseArticle, {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
          'X-Content-Type-Options': 'nosniff'
        }
      })
    }
    
    return NextResponse.json(
      { error: 'Article not found' },
      { 
        status: 404,
        headers: {
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff'
        }
      }
    )
    
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Failed to load article',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { 
        status: 500,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'X-Content-Type-Options': 'nosniff'
        }
      }
    )
  }
}

