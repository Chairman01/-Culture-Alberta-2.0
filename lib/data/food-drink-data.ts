/**
 * Food & Drink Page Data Fetching
 * 
 * Centralized data fetching logic for the Food & Drink page.
 * Provides efficient filtering and fallback mechanisms.
 * 
 * Performance optimizations:
 * - Uses optimized fallback system
 * - Efficient filtering with utility functions
 * - Proper error handling with fallbacks
 * - Excludes content field for better performance
 * 
 * Used by: app/food-drink/page.tsx
 */

import { Article } from '@/lib/types/article'
import { loadOptimizedFallback } from '@/lib/optimized-fallback'
import { filterFoodDrinkArticles } from '@/lib/utils/article-helpers'

/**
 * OPTIMIZED: Fetches and processes data for the Food & Drink page
 * 
 * @returns Object containing articles and featured article
 * 
 * Performance:
 * - Single data load from optimized fallback
 * - Efficient filtering using utility functions
 * - O(n) time complexity for filtering
 * - Excludes content field for faster loading
 */
export async function getFoodDrinkPageData(): Promise<{
  articles: Article[]
  featuredArticle: Article | null
}> {
  try {
    // PERFORMANCE: Load all content from optimized fallback
    const allContent = await loadOptimizedFallback()
    
    // Filter for food & drink articles using utility function
    const foodDrinkArticles = filterFoodDrinkArticles(allContent)
    
    // PERFORMANCE: Remove content field for listings (not needed for article cards)
    const articlesWithoutContent = foodDrinkArticles.map((article: any) => ({
      ...article,
      content: undefined // Don't include content for food-drink page listings
    })) as Article[]
    
    // Sort by date (newest first)
    const sortedArticles = articlesWithoutContent.sort((a, b) => {
      const dateA = new Date(a.createdAt || a.date || 0).getTime()
      const dateB = new Date(b.createdAt || b.date || 0).getTime()
      return dateB - dateA
    })
    
    // Find featured article (first featured or first article)
    const featuredArticle = sortedArticles.find(article => article.featuredHome) || sortedArticles[0] || null
    
    // Return articles excluding the featured one (if it exists)
    const articles = featuredArticle 
      ? sortedArticles.filter(article => article.id !== featuredArticle.id)
      : sortedArticles
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Food & Drink] Loaded ${articles.length} articles, featured: ${featuredArticle ? 'yes' : 'no'}`)
    }
    
    return {
      articles,
      featuredArticle
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[Food & Drink] Error loading data:', error)
    }
    
    // Return empty arrays on error
    return {
      articles: [],
      featuredArticle: null
    }
  }
}

