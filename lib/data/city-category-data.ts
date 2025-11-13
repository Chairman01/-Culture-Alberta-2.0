/**
 * City category data fetching utilities
 * 
 * Performance optimizations:
 * - Efficient filtering by city and category
 * - Proper error handling
 * - Reusable for different city categories
 * - Uses optimized fallback for fast loading
 * - Excludes content field for better performance
 * 
 * Used in:
 * - app/calgary/food-drink/page.tsx
 * - app/calgary/arts-culture/page.tsx
 * - app/calgary/outdoors/page.tsx
 * - app/edmonton/all-articles/page.tsx
 * - app/calgary/all-articles/page.tsx
 */

import { Article } from '@/lib/types/article'
import { loadOptimizedFallback } from '@/lib/optimized-fallback'

/**
 * Food & Drink category keywords for filtering
 */
const FOOD_DRINK_KEYWORDS = ['food', 'drink', 'restaurant', 'dining', 'cafe', 'bar', 'cuisine', 'culinary']

/**
 * Arts & Culture category keywords for filtering
 */
const ARTS_CULTURE_KEYWORDS = ['art', 'culture', 'music', 'theater', 'museum', 'gallery', 'performance', 'exhibition']

/**
 * Outdoors category keywords for filtering
 */
const OUTDOORS_KEYWORDS = ['outdoor', 'outdoors', 'hiking', 'nature', 'park', 'trail', 'camping', 'adventure']

/**
 * OPTIMIZED: Gets articles for a specific city and category
 * 
 * @param city - City name ('calgary' or 'edmonton')
 * @param categoryKeywords - Array of keywords to filter by
 * @returns Array of filtered articles
 * 
 * Performance:
 * - Uses optimized fallback (faster)
 * - Efficient filtering using keyword matching
 * - Excludes events
 * - Excludes content field for better performance
 * - Returns only articles
 */
export async function getCityCategoryArticles(
  city: 'calgary' | 'edmonton',
  categoryKeywords: string[]
): Promise<Article[]> {
  try {
    // PERFORMANCE: Use optimized fallback (faster than Supabase)
    const allContent = await loadOptimizedFallback()
    const cityLower = city.toLowerCase()
    
    // Filter for city articles (exclude events) and filter by category keywords
    const articles = allContent
      .filter((item: any) => {
        // Exclude events
        if (item.type === 'event') return false
        
        // Check if city-related
        const location = item.location?.toLowerCase() || ''
        const category = item.category?.toLowerCase() || ''
        const title = item.title?.toLowerCase() || ''
        const categories = item.categories || []
        const tags = item.tags || []
        
        const isCityRelated = location.includes(cityLower) || 
                             category.includes(cityLower) || 
                             title.includes(cityLower) ||
                             categories.some((cat: string) => cat.toLowerCase().includes(cityLower)) ||
                             tags.some((tag: string) => tag.toLowerCase().includes(cityLower))
        
        if (!isCityRelated) return false
        
        // Filter by category keywords
        return categoryKeywords.some(keyword => category.includes(keyword))
      })
      .map((item: any) => ({
        ...item,
        content: undefined // Don't include content for category listings
      })) as Article[]
    
    return articles
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error(`Error loading ${city} category articles:`, error)
    }
    return []
  }
}

/**
 * OPTIMIZED: Gets all articles for a specific city (excluding events)
 * 
 * @param city - City name ('calgary' or 'edmonton')
 * @returns Array of all articles for the city
 * 
 * Performance:
 * - Uses optimized fallback (faster)
 * - Efficient filtering
 * - Excludes events
 * - Excludes content field for better performance
 */
export async function getAllCityArticles(city: 'calgary' | 'edmonton'): Promise<Article[]> {
  try {
    // PERFORMANCE: Use optimized fallback (faster than Supabase)
    const allContent = await loadOptimizedFallback()
    const cityLower = city.toLowerCase()
    
    // Filter for city articles (exclude events)
    const articles = allContent
      .filter((item: any) => {
        if (item.type === 'event') return false
        
        const location = item.location?.toLowerCase() || ''
        const category = item.category?.toLowerCase() || ''
        const title = item.title?.toLowerCase() || ''
        const categories = item.categories || []
        const tags = item.tags || []
        
        return location.includes(cityLower) || 
               category.includes(cityLower) || 
               title.includes(cityLower) ||
               categories.some((cat: string) => cat.toLowerCase().includes(cityLower)) ||
               tags.some((tag: string) => tag.toLowerCase().includes(cityLower))
      })
      .map((item: any) => ({
        ...item,
        content: undefined // Don't include content for city listings
      })) as Article[]
    
    return articles
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error(`Error loading all ${city} articles:`, error)
    }
    return []
  }
}

/**
 * Gets food & drink articles for a city
 * 
 * @param city - City name ('calgary' or 'edmonton')
 * @returns Array of food & drink articles
 */
export async function getCityFoodDrinkArticles(city: 'calgary' | 'edmonton'): Promise<Article[]> {
  return getCityCategoryArticles(city, FOOD_DRINK_KEYWORDS)
}

/**
 * Gets arts & culture articles for a city
 * 
 * @param city - City name ('calgary' or 'edmonton')
 * @returns Array of arts & culture articles
 */
export async function getCityArtsCultureArticles(city: 'calgary' | 'edmonton'): Promise<Article[]> {
  return getCityCategoryArticles(city, ARTS_CULTURE_KEYWORDS)
}

/**
 * Gets outdoors articles for a city
 * 
 * @param city - City name ('calgary' or 'edmonton')
 * @returns Array of outdoors articles
 */
export async function getCityOutdoorsArticles(city: 'calgary' | 'edmonton'): Promise<Article[]> {
  return getCityCategoryArticles(city, OUTDOORS_KEYWORDS)
}



