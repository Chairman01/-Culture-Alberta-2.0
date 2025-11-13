/**
 * Homepage data fetching utilities
 * 
 * Performance optimizations:
 * - Parallel data fetching (articles + events simultaneously)
 * - Efficient data transformation
 * - Proper error handling with fallbacks
 * - Type-safe operations
 * - Minimal field selection for fast queries
 * - Timeout protection
 * 
 * Used in:
 * - app/page.tsx (main homepage)
 * - app/api/homepage/route.ts (homepage API)
 */

import { Article } from '@/lib/types/article'
import { deduplicateArticles } from '@/lib/utils/article-helpers'
import { supabase } from '@/lib/supabase'
import { loadOptimizedFallback } from '@/lib/optimized-fallback'

/**
 * Converts an event to article format for homepage display
 * 
 * @param event - Event object from database
 * @returns Article-formatted object
 * 
 * Performance: O(1) - constant time object transformation
 */
function convertEventToArticle(event: any): Article {
  return {
    id: event.id,
    title: event.title,
    excerpt: event.excerpt || event.description?.substring(0, 150) || '',
    content: event.description || '',
    category: 'Events',
    categories: ['Events'],
    location: event.location || '',
    author: event.organizer || 'Event Organizer',
    imageUrl: event.image_url || '',
    date: event.event_date || event.created_at,
    createdAt: event.created_at || new Date().toISOString(),
    updatedAt: event.updated_at || event.created_at || new Date().toISOString(),
    status: event.status || 'published',
    trendingHome: event.featured_home ?? false,
    trendingEdmonton: event.featured_edmonton ?? false,
    trendingCalgary: event.featured_calgary ?? false,
    featuredHome: event.featured_home ?? false,
    featuredEdmonton: event.featured_edmonton ?? false,
    featuredCalgary: event.featured_calgary ?? false,
    type: 'event',
    eventDate: event.event_date
  }
}

/**
 * Creates fallback content when no articles are available
 * 
 * @returns Array with single fallback article
 * 
 * Performance: O(1) - constant time object creation
 */
function createFallbackContent(): Article[] {
  return [{
    id: 'fallback-1',
    title: 'Welcome to Culture Alberta',
    excerpt: 'Discover the best of Alberta\'s culture, events, and experiences. From Calgary to Edmonton, we bring you the stories that matter.',
    content: 'Welcome to Culture Alberta! We\'re working on bringing you amazing content about Alberta\'s vibrant culture, events, and experiences.',
    category: 'Culture',
    categories: ['Culture'],
    location: 'Alberta',
    imageUrl: '/images/culture-alberta-og.jpg',
    author: 'Culture Alberta',
    date: '2024-01-01T00:00:00.000Z',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    featuredHome: true,
    trendingHome: true,
    type: 'article',
    status: 'published',
    tags: ['Alberta', 'Culture', 'Welcome']
  }]
}

/**
 * OPTIMIZED: Fetches homepage data directly from Supabase with minimal queries
 * 
 * Performance optimizations:
 * - Fetches only essential fields (no content)
 * - Parallel queries for articles and events
 * - Timeout protection (5 seconds)
 * - Uses database indexes
 * - Falls back to optimized fallback file
 * 
 * @returns Object containing posts and events arrays
 * 
 * Used in:
 * - app/page.tsx (homepage data loading)
 * - app/api/homepage/route.ts (homepage API)
 */
export async function getOptimizedHomepageData(): Promise<{
  posts: Article[]
  events: Article[]
}> {
  try {
    // PERFORMANCE: Select only minimal essential fields
    const homepageFields = [
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
    
    const eventFields = [
      'id',
      'title',
      'excerpt',
      'description',
      'category',
      'location',
      'event_date',
      'image_url',
      'status',
      'created_at',
      'organizer'
    ].join(',')
    
    // Try Supabase first with timeout
    try {
      const articlesQuery = supabase
        .from('articles')
        .select(homepageFields)
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(30)
      
      const eventsQuery = supabase
        .from('events')
        .select(eventFields)
        .eq('status', 'published')
        .order('event_date', { ascending: true })
        .limit(3)
      
      const queryPromise = Promise.all([articlesQuery, eventsQuery])
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Query timeout')), 5000)
      )
      
      const [articlesResult, eventsResult] = await Promise.race([
        queryPromise,
        timeoutPromise
      ]) as any[]
      
      if (!articlesResult.error && !eventsResult.error) {
        const articles = (articlesResult.data || []).map((article: any) => ({
          id: article.id,
          title: article.title,
          excerpt: article.excerpt || '',
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
        }))
        
        const events = (eventsResult.data || []).map(convertEventToArticle)
        
        return {
          posts: articles,
          events: events
        }
      }
    } catch (supabaseError) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Supabase query failed, using fallback:', supabaseError)
      }
    }
    
    // Fallback to optimized fallback file
    const fallbackArticles = await loadOptimizedFallback()
    const articles = fallbackArticles.filter((item: any) => item.type !== 'event')
    const events = fallbackArticles.filter((item: any) => item.type === 'event').slice(0, 3)
    
    return {
      posts: articles,
      events: events
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error loading homepage data:', error)
    }
    
    return {
      posts: createFallbackContent(),
      events: []
    }
  }
}

/**
 * Legacy function - kept for backward compatibility
 * @deprecated Use getOptimizedHomepageData instead
 */
export async function getHomePageData(): Promise<{
  posts: Article[]
  events: Article[]
}> {
  return getOptimizedHomepageData()
}


