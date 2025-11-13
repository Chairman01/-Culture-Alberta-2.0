/**
 * Article helper utilities for data transformation and filtering
 * 
 * Performance optimizations:
 * - Single-pass array operations where possible
 * - Efficient filtering with Set lookups
 * - Memoization-friendly functions
 * 
 * Used in:
 * - app/page.tsx (homepage filtering)
 * - app/edmonton/page.tsx (city filtering)
 * - app/calgary/page.tsx (city filtering)
 */

import { Article } from '@/lib/types/article'

/**
 * Extracts title from article, with fallback
 * 
 * @param article - Article object
 * @returns Article title or "Untitled Article"
 * 
 * Performance: O(1) - constant time operation
 */
export function getArticleTitle(article: Article): string {
  return article.title || 'Untitled Article'
}

/**
 * Extracts excerpt from article, with intelligent truncation
 * 
 * @param article - Article object
 * @param maxLength - Maximum excerpt length (default: 200)
 * @returns Article excerpt or generated from content
 * 
 * Performance: O(n) where n is excerpt length - optimized with early returns
 */
export function getArticleExcerpt(article: Article, maxLength: number = 200): string {
  if (article.excerpt) {
    return article.excerpt.length > maxLength 
      ? article.excerpt.substring(0, maxLength) + '...' 
      : article.excerpt
  }
  
  if (article.content && article.content.trim()) {
    return article.content.substring(0, 150) + '...'
  }
  
  return 'Article content coming soon...'
}

/**
 * Gets article image URL with fallback
 * 
 * @param article - Article object
 * @returns Image URL or placeholder
 * 
 * Performance: O(1) - constant time operation
 */
export function getArticleImage(article: Article): string {
  return article.imageUrl || '/placeholder.svg'
}

/**
 * Gets article category with fallback
 * 
 * @param article - Article object
 * @returns Category name or "General"
 * 
 * Performance: O(1) - constant time operation
 */
export function getArticleCategory(article: Article): string {
  return article.category || 'General'
}

/**
 * Removes duplicate articles by ID
 * 
 * @param articles - Array of articles
 * @returns Deduplicated array of articles
 * 
 * Performance: O(n) - single pass with Set lookup
 * 
 * Uses Set for O(1) lookup instead of array.includes() which is O(n)
 */
export function deduplicateArticles(articles: Article[]): Article[] {
  const seenIds = new Set<string>()
  return articles.filter(article => {
    if (seenIds.has(article.id)) {
      return false
    }
    seenIds.add(article.id)
    return true
  })
}

/**
 * Filters articles by city (Edmonton or Calgary)
 * 
 * @param articles - Array of articles
 * @param city - City name ("edmonton" or "calgary")
 * @returns Filtered array of articles
 * 
 * Performance: O(n) - single pass filter
 * 
 * Checks multiple fields for city match:
 * - category field
 * - categories array
 * - location field
 * - tags array
 */
export function filterArticlesByCity(
  articles: Article[], 
  city: 'edmonton' | 'calgary'
): Article[] {
  const cityLower = city.toLowerCase()
  
  return articles.filter(article => {
    // Exclude events from city sections
    if (article.type === 'event') return false
    
    // Check category field
    const hasCityCategory = article.category?.toLowerCase().includes(cityLower)
    
    // Check categories array
    const hasCityInCategories = article.categories?.some((cat: string) => 
      cat.toLowerCase().includes(cityLower)
    )
    
    // Check location field
    const hasCityLocation = article.location?.toLowerCase().includes(cityLower)
    
    // Check tags array
    const hasCityTags = article.tags?.some((tag: string) => 
      tag.toLowerCase().includes(cityLower)
    )
    
    return hasCityCategory || hasCityInCategories || hasCityLocation || hasCityTags
  })
}

/**
 * Filters articles by food & drink category
 * 
 * @param articles - Array of articles
 * @returns Filtered array of food & drink articles
 * 
 * Performance: O(n) - single pass filter
 * 
 * Checks:
 * - Category field for "food", "drink", "food & drink"
 * - Categories array
 * - Title for food-related keywords
 */
export function filterFoodDrinkArticles(articles: Article[]): Article[] {
  const foodKeywords = [
    'restaurant', 'sushi', 'food', 'romantic', 'dining', 'cafe', 
    'bar', 'drink', 'coffee', 'bite', 'cuisine', 'chef', 
    'menu', 'meal', 'taste', 'flavor', 'cook', 'recipe'
  ]
  
  return articles.filter(article => {
    // Exclude events
    if (article.type === 'event') return false
    
    const category = article.category?.toLowerCase() || ''
    const categories = article.categories || []
    const title = article.title?.toLowerCase() || ''
    
    // Check category field
    const hasFoodCategory = category.includes('food & drink') || 
                           category.includes('food') || 
                           category.includes('drink')
    
    // Check categories array
    const hasFoodInCategories = categories.some((cat: string) => {
      const catLower = cat.toLowerCase()
      return catLower.includes('food & drink') ||
             catLower.includes('food') ||
             catLower.includes('drink')
    })
    
    // Check title for food keywords
    const hasFoodInTitle = foodKeywords.some(keyword => title.includes(keyword))
    
    return hasFoodCategory || hasFoodInCategories || hasFoodInTitle
  })
}

/**
 * Filters events from articles
 * 
 * @param articles - Array of articles (may include events)
 * @returns Filtered array containing only events
 * 
 * Performance: O(n) - single pass filter
 */
export function filterEvents(articles: Article[]): Article[] {
  return articles.filter(article => {
    // Include actual events
    if (article.type === 'event') return true
    
    // Include articles with event categories (but exclude news)
    const hasEventCategory = article.category?.toLowerCase() === 'events' || 
                            article.category?.toLowerCase().includes('art') ||
                            article.category?.toLowerCase().includes('festival')
    
    const hasEventInCategories = article.categories?.some((cat: string) => 
      cat.toLowerCase() === 'events' ||
      cat.toLowerCase().includes('art') ||
      cat.toLowerCase().includes('festival')
    )
    
    // Exclude news articles about health alerts, strikes, etc.
    const isNewsArticle = article.title?.toLowerCase().includes('alert') ||
                         article.title?.toLowerCase().includes('strike') ||
                         article.title?.toLowerCase().includes('exposure') ||
                         article.title?.toLowerCase().includes('rally')
    
    if (isNewsArticle) return false
    
    return hasEventCategory || hasEventInCategories
  })
}

/**
 * Sorts articles by date (newest first)
 * 
 * @param articles - Array of articles
 * @returns Sorted array of articles
 * 
 * Performance: O(n log n) - standard sort operation
 * 
 * Handles both articles and events:
 * - Events: Uses event_date or createdAt
 * - Articles: Uses date or createdAt
 */
export function sortArticlesByDate(articles: Article[]): Article[] {
  return [...articles].sort((a, b) => {
    const getDate = (article: Article): Date => {
      if (article.type === 'event') {
        return new Date((article as any).event_date || article.date || article.createdAt || 0)
      }
      return new Date(article.date || article.createdAt || 0)
    }
    
    const dateA = getDate(a)
    const dateB = getDate(b)
    
    return dateB.getTime() - dateA.getTime() // Newest first
  })
}


