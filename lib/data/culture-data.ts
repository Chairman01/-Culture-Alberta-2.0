/**
 * Culture page data fetching utilities
 * 
 * Performance optimizations:
 * - Efficient culture article filtering
 * - Article sorting and processing
 * - Featured article selection
 * - Uses optimized fallback for fast loading
 * - Excludes content field for better performance
 * 
 * Used in:
 * - app/culture/page.tsx
 */

import { Article } from '@/lib/types/article'
import { sortArticlesByDate } from '@/lib/utils/article-helpers'
import { loadOptimizedFallback } from '@/lib/optimized-fallback'

/**
 * Interface for culture page data
 */
export interface CulturePageData {
  articles: Article[]
  featuredArticle: Article | null
}

/**
 * Filters articles for culture-related content
 * 
 * @param articles - Array of all articles
 * @returns Filtered array of culture articles
 * 
 * Performance:
 * - Single-pass filtering
 * - Efficient keyword matching
 */
function filterCultureArticles(articles: Article[]): Article[] {
  const cultureKeywords = [
    'culture', 'art', 'heritage', 'music', 'theater', 'dance', 
    'museum', 'festival', 'indigenous', 'community', 'gallery',
    'exhibition', 'performance', 'tradition', 'painting', 'sculpture'
  ]
  
  return articles.filter(article => {
    // Filter out events
    if (article.type === 'event') return false
    
    // Exclude specific articles that shouldn't be on the Culture page
    const title = article.title?.toLowerCase() || ''
    if (title.includes('edmonton folk music festival') || 
        title.includes('edmonton folk festival')) {
      return false
    }
    
    const category = article.category?.toLowerCase() || ''
    const categories = article.categories || []
    const tags = article.tags || []
    
    const hasCultureCategory = cultureKeywords.some(keyword => category.includes(keyword))
    const hasCultureCategories = categories.some((cat: string) => 
      cultureKeywords.some(keyword => cat.toLowerCase().includes(keyword))
    )
    const hasCultureTags = tags.some((tag: string) => 
      cultureKeywords.some(keyword => tag.toLowerCase().includes(keyword))
    )
    
    return hasCultureCategory || hasCultureCategories || hasCultureTags
  })
}

/**
 * OPTIMIZED: Fetches all data needed for the Culture page
 * 
 * @returns Culture page data including articles and featured article
 * 
 * Performance:
 * - Uses optimized fallback (faster than Supabase)
 * - Excludes content field for better performance
 * - Sorts articles by date
 * - Selects featured article efficiently
 */
export async function getCulturePageData(): Promise<CulturePageData> {
  try {
    // PERFORMANCE: Use optimized fallback (faster than Supabase)
    const allContent = await loadOptimizedFallback()
    
    // PERFORMANCE: Filter for culture articles
    const cultureArticles = filterCultureArticles(allContent)
    
    // PERFORMANCE: Remove content field for listings
    const articlesWithoutContent = cultureArticles.map((article: any) => ({
      ...article,
      content: undefined // Don't include content for culture page listings
    })) as Article[]
    
    // PERFORMANCE: Sort once
    const sortedArticles = sortArticlesByDate(articlesWithoutContent)
    
    // Get featured article (first one, or null if no articles)
    const featuredArticle = sortedArticles.length > 0 ? sortedArticles[0] : null
    
    // Remaining articles (skip first if featured)
    const articles = sortedArticles.length > 1 ? sortedArticles.slice(1) : sortedArticles
    
    return {
      articles,
      featuredArticle,
    }
  } catch (error) {
    // Return empty data on error
    if (process.env.NODE_ENV === 'development') {
      console.error('Error loading Culture data:', error)
    }
    return {
      articles: [],
      featuredArticle: null,
    }
  }
}




