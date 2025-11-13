/**
 * City page data fetching utilities
 * 
 * Performance optimizations:
 * - Efficient city article filtering
 * - Event filtering and sorting
 * - Featured and trending article selection
 * - Uses optimized fallback for fast loading
 * 
 * Used in:
 * - app/edmonton/page.tsx
 * - app/calgary/page.tsx
 */

import { Article } from '@/lib/types/article'
import { loadOptimizedFallback } from '@/lib/optimized-fallback'
import { filterArticlesByCity, sortArticlesByDate } from '@/lib/utils/article-helpers'

/**
 * Interface for city page data
 */
export interface CityPageData {
  articles: Article[]
  featuredArticle: Article | null
  trendingArticles: Article[]
  upcomingEvents: Article[]
}

/**
 * OPTIMIZED: Fetches all data needed for a city page
 * 
 * @param city - City name ('edmonton' or 'calgary')
 * @returns City page data including articles, featured article, trending articles, and events
 * 
 * Performance:
 * - Uses optimized fallback (faster than Supabase)
 * - Filters events efficiently
 * - Sorts articles by date
 * - Excludes content field for better performance
 */
export async function getCityPageData(city: 'edmonton' | 'calgary'): Promise<CityPageData> {
  try {
    // PERFORMANCE: Use optimized fallback (faster than Supabase)
    const allContent = await loadOptimizedFallback()
    
    // Filter city articles (exclude events)
    const cityArticles = allContent.filter((article: any) => {
      if (article.type === 'event') return false
      
      const location = article.location?.toLowerCase() || ''
      const category = article.category?.toLowerCase() || ''
      const title = article.title?.toLowerCase() || ''
      const categories = article.categories || []
      const tags = article.tags || []
      const cityLower = city.toLowerCase()
      
      return location.includes(cityLower) || 
             category.includes(cityLower) || 
             title.includes(cityLower) ||
             categories.some((cat: string) => cat.toLowerCase().includes(cityLower)) ||
             tags.some((tag: string) => tag.toLowerCase().includes(cityLower))
    })
    
    // Remove content field for better performance
    const articles = cityArticles.map((article: any) => ({
      ...article,
      content: undefined // Don't include content for city page listings
    })) as Article[]
    
    // PERFORMANCE: Sort once
    const sortedArticles = sortArticlesByDate(articles)
    
    // Get featured article (prioritize featured flag, then first article)
    const featuredArticle = sortedArticles.find(
      article => city === 'edmonton' ? article.featuredEdmonton : article.featuredCalgary
    ) || sortedArticles[0] || null
    
    // Get trending articles (prioritize trending flag, then recent articles)
    const trendingWithFlag = sortedArticles.filter(
      article => city === 'edmonton' ? article.trendingEdmonton : article.trendingCalgary
    )
    const trendingArticles = trendingWithFlag.length > 0
      ? trendingWithFlag.slice(0, 4)
      : sortedArticles.slice(0, 4)
    
    // Get upcoming events for the city
    const cityEvents: Article[] = allContent
      .filter((article: any) => {
        // First check if it's an event
        if (article.type !== 'event') return false
        
        // Then check if it's city-related
        const location = article.location?.toLowerCase() || ''
        const category = article.category?.toLowerCase() || ''
        const title = article.title?.toLowerCase() || ''
        const categories = article.categories || []
        const tags = article.tags || []
        const cityLower = city.toLowerCase()
        
        return location.includes(cityLower) || 
               category.includes(cityLower) || 
               title.includes(cityLower) ||
               categories.some((cat: string) => cat.toLowerCase().includes(cityLower)) ||
               tags.some((tag: string) => tag.toLowerCase().includes(cityLower))
      })
    
    // Filter for future events and sort by date
    const now = new Date()
    const upcomingEvents = cityEvents
      .filter(event => {
        const eventDate = new Date(event.date || event.createdAt || 0)
        return eventDate > now
      })
      .sort((a, b) => {
        const dateA = new Date(a.date || a.createdAt || 0).getTime()
        const dateB = new Date(b.date || b.createdAt || 0).getTime()
        return dateA - dateB // Earliest first
      })
      .slice(0, 3)
    
    return {
      articles: sortedArticles,
      featuredArticle,
      trendingArticles,
      upcomingEvents,
    }
  } catch (error) {
    // Return empty data on error
    if (process.env.NODE_ENV === 'development') {
      console.error(`Error loading ${city} data:`, error)
    }
    return {
      articles: [],
      featuredArticle: null,
      trendingArticles: [],
      upcomingEvents: [],
    }
  }
}

