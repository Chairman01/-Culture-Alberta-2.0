/**
 * Article data fetching utilities
 * 
 * Performance optimizations:
 * - Efficient article lookup by slug
 * - Cached related articles
 * - Parallel data fetching where possible
 * - Minimal field selection for fast queries
 * - Timeout protection
 * 
 * Used in:
 * - app/articles/[slug]/page.tsx (article detail page)
 */

import { Article } from '@/lib/types/article'
import { createSlug } from '@/lib/utils/slug'
import { getFastArticleBySlug, getFastArticles } from '@/lib/fast-articles'
import { supabase } from '@/lib/supabase'
import { loadOptimizedFallback } from '@/lib/optimized-fallback'
import { getAllEvents } from '@/lib/events'

/**
 * OPTIMIZED: Finds an article by slug using optimized queries
 * 
 * @param slug - Article slug to find
 * @returns Article object or null if not found
 * 
 * Performance:
 * - Tries fast cache first (O(n) lookup)
 * - Uses optimized Supabase query with minimal fields
 * - Timeout protection (5 seconds)
 * - Falls back to optimized fallback file
 * 
 * Used in:
 * - app/articles/[slug]/page.tsx (article loading)
 */
export async function findArticleBySlug(slug: string): Promise<Article | null> {
  // PERFORMANCE: Try fast cache first (in-memory, fastest)
  let article = await getFastArticleBySlug(slug)
  
  if (article) {
    return article as Article
  }
  
  // PERFORMANCE: Try fast articles array (already loaded)
  const fastArticles = await getFastArticles()
  article = fastArticles.find(article => {
    const articleSlug = createSlug(article.title)
    return articleSlug.toLowerCase() === slug.toLowerCase()
  })
  
  if (article) {
    return article as Article
  }
  
  // PERFORMANCE: Try optimized Supabase query (minimal fields, no content)
  try {
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
    
    const articlesQuery = supabase
      .from('articles')
      .select(articlePreviewFields)
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(50)
    
    const queryPromise = articlesQuery
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Query timeout')), 5000)
    )
    
    const { data, error } = await Promise.race([
      queryPromise,
      timeoutPromise
    ]) as any
    
    if (!error && data) {
      const foundArticle = data.find((article: any) => {
        const articleSlug = createSlug(article.title)
        return articleSlug.toLowerCase() === slug.toLowerCase()
      })
      
      if (foundArticle) {
        return {
          id: foundArticle.id,
          title: foundArticle.title,
          excerpt: foundArticle.excerpt || '',
          category: foundArticle.category || '',
          categories: foundArticle.categories || [],
          location: foundArticle.location || '',
          author: foundArticle.author || '',
          tags: foundArticle.tags || [],
          type: foundArticle.type || 'article',
          status: foundArticle.status || 'published',
          imageUrl: foundArticle.image_url || '',
          date: foundArticle.created_at,
          createdAt: foundArticle.created_at,
          updatedAt: foundArticle.updated_at || foundArticle.created_at,
          trendingHome: foundArticle.trending_home ?? false,
          trendingEdmonton: foundArticle.trending_edmonton ?? false,
          trendingCalgary: foundArticle.trending_calgary ?? false,
          featuredHome: foundArticle.featured_home ?? false,
          featuredEdmonton: foundArticle.featured_edmonton ?? false,
          featuredCalgary: foundArticle.featured_calgary ?? false,
        } as Article
      }
    }
  } catch (error) {
    // Supabase failed, continue to fallback
    if (process.env.NODE_ENV === 'development') {
      console.error('Supabase lookup failed:', error)
    }
  }
  
  // Fallback to optimized fallback file
  try {
    const fallbackArticles = await loadOptimizedFallback()
    const foundArticle = fallbackArticles.find((item: any) => {
      const articleSlug = createSlug(item.title)
      return articleSlug.toLowerCase() === slug.toLowerCase()
    })
    
    if (foundArticle) {
      return foundArticle as Article
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Fallback lookup failed:', error)
    }
  }
  
  return null
}

/**
 * Checks if slug might be an event and redirects if found
 * 
 * @param slug - Slug to check
 * @returns Event object if found, null otherwise
 * 
 * Performance:
 * - Uses cached events if available
 * - Efficient slug matching
 */
export async function checkEventSlug(slug: string): Promise<{ title: string; slug: string } | null> {
  try {
    const events = await getAllEvents()
    const eventSlug = createSlug(slug)
    
    for (const event of events) {
      const eventSlugFromTitle = createSlug(event.title)
      if (eventSlugFromTitle === eventSlug) {
        return {
          title: event.title,
          slug: eventSlugFromTitle
        }
      }
    }
  } catch (error) {
    // Events check failed, return null
    if (process.env.NODE_ENV === 'development') {
      console.error('Events check failed:', error)
    }
  }
  
  return null
}

/**
 * OPTIMIZED: Fetches full article content if missing or too short
 * 
 * @param article - Article object (may have missing content)
 * @param slug - Article slug for lookup
 * @returns Article with full content if available
 * 
 * Performance:
 * - Only fetches if content is missing/short
 * - Uses optimized Supabase query (content field only)
 * - Timeout protection (5 seconds)
 * - Falls back to optimized fallback file
 */
export async function ensureFullContent(
  article: Article,
  slug: string
): Promise<Article> {
  const hasUsableContent = !!(
    article.content &&
    typeof article.content === 'string' &&
    article.content.trim().length > 100
  )
  
  if (hasUsableContent) {
    return article
  }
  
  // Try to fetch full content from Supabase (content field only)
  try {
    const contentQuery = supabase
      .from('articles')
      .select('id, content')
      .eq('id', article.id)
      .single()
    
    const queryPromise = contentQuery
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Query timeout')), 5000)
    )
    
    const { data, error } = await Promise.race([
      queryPromise,
      timeoutPromise
    ]) as any
    
    if (!error && data?.content && 
        typeof data.content === 'string' && 
        data.content.trim().length > 0) {
      return { ...article, content: data.content }
    }
  } catch (error) {
    // Content fetch failed, try fallback
    if (process.env.NODE_ENV === 'development') {
      console.error('Failed to fetch full content from Supabase:', error)
    }
  }
  
  // Fallback to optimized fallback file
  try {
    const fallbackArticles = await loadOptimizedFallback()
    const foundArticle = fallbackArticles.find((item: any) => 
      item.id === article.id || createSlug(item.title).toLowerCase() === slug.toLowerCase()
    )
    
    if (foundArticle?.content && 
        typeof foundArticle.content === 'string' && 
        foundArticle.content.trim().length > 0) {
      return { ...article, content: foundArticle.content }
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Failed to fetch content from fallback:', error)
    }
  }
  
  return article
}

/**
 * OPTIMIZED: Gets related articles for an article
 * 
 * @param currentArticle - Current article object
 * @param limit - Maximum number of related articles (default: 6)
 * @returns Array of related articles
 * 
 * Performance:
 * - Uses optimized fallback (faster than Supabase)
 * - Minimal field selection (no content)
 * - Efficient filtering and sorting
 * - Limits results to reduce payload
 * 
 * Strategy:
 * - Prioritizes same category articles
 * - Includes diverse content from other categories
 * - Excludes current article
 */
export async function getRelatedArticles(
  currentArticle: Article,
  limit: number = 6
): Promise<Article[]> {
  try {
    // PERFORMANCE: Use optimized fallback (faster than Supabase)
    const allArticles = await loadOptimizedFallback()
    
    if (allArticles.length === 0) {
      return []
    }
    
    // Filter out current article, events, and unpublished articles
    const availableArticles = allArticles.filter(
      (article: any) => 
        article.id !== currentArticle.id && 
        article.type !== 'event' &&
        (article.status === 'published' || !article.status)
    )
    
    // Get same category articles (higher priority)
    const sameCategory = availableArticles
      .filter((article: any) => article.category === currentArticle.category)
      .slice(0, 3)
    
    // Get other category articles (diversity)
    const otherCategory = availableArticles
      .filter((article: any) => article.category !== currentArticle.category)
      .slice(0, 3)
    
    // Combine and shuffle for variety
    const related = [...sameCategory, ...otherCategory]
      .sort(() => Math.random() - 0.5)
      .slice(0, limit)
    
    // Map to Article format (remove content for performance)
    return related.map((article: any) => ({
      ...article,
      content: undefined // Don't include content for related articles
    })) as Article[]
  } catch (error) {
    // Return empty array on error (non-critical)
    if (process.env.NODE_ENV === 'development') {
      console.error('Failed to load related articles:', error)
    }
    return []
  }
}


