import { Article } from './types/article'
import { getAllArticles as getSupabaseArticles } from './supabase-articles'
import { updateOptimizedFallback, loadOptimizedFallback } from './optimized-fallback'
import fs from 'fs'
import path from 'path'

// Cache for articles.json data - DISABLED for production fix
let articlesJsonCache: Article[] | null = null
let articlesJsonCacheTimestamp: number = 0
const ARTICLES_JSON_CACHE_DURATION = 0 // DISABLED - always fetch fresh data

/**
 * REMOVED: No longer using lib/data/articles.json
 * Now using only the optimized fallback system for consistency
 */
async function loadArticlesFromJson(): Promise<Article[]> {
  console.log('⚠️ DEPRECATED: loadArticlesFromJson() is no longer used - using optimized fallback instead')
  return loadOptimizedFallback()
}

/**
 * Load articles with Supabase as primary source and articles.json as fallback
 * This function tries Supabase first, and if it fails or takes too long, falls back to articles.json
 */
export async function getArticlesWithFallback(timeoutMs: number = 5000): Promise<Article[]> {
  console.log('🔄 Loading articles with fallback system...')
  
  // CRITICAL FIX: In production, ALWAYS use Supabase (never use stale articles.json)
  const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1'
  
  if (!isProduction) {
    // Only try articles.json in development
    try {
      const jsonArticles = await loadArticlesFromJson()
      if (jsonArticles.length > 0) {
        console.log(`✅ [DEV] Loaded ${jsonArticles.length} articles from articles.json`)
        
        // Log the date range to verify we have fresh data
        const dates = jsonArticles.map(a => a.createdAt).filter(Boolean).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
        if (dates.length > 0) {
          console.log(`📅 Latest article date: ${dates[0]}`)
          console.log(`📅 Oldest article date: ${dates[dates.length - 1]}`)
        }
        
        return jsonArticles
      }
    } catch (jsonError) {
      console.log('ℹ️ [DEV] articles.json not found, using Supabase:', jsonError)
    }
  } else {
    console.log('🚀 [PRODUCTION] Skipping articles.json, fetching directly from Supabase for fresh data')
  }
  
  // Use Supabase (ALWAYS in production, fallback in development)
  // Create a promise that resolves with Supabase data
  const supabasePromise = getSupabaseArticles()
  
  // Create a timeout promise
  const timeoutPromise = new Promise<Article[]>((_, reject) => {
    setTimeout(() => {
      reject(new Error('Supabase timeout'))
    }, timeoutMs)
  })
  
  try {
    // Race between Supabase and timeout
    const articles = await Promise.race([supabasePromise, timeoutPromise])
    console.log(`✅ Loaded ${articles.length} articles from Supabase`)
    
    // SUSTAINABLE FALLBACK: Update optimized fallback with fresh data when Supabase works
    try {
      await updateOptimizedFallback(articles)
    } catch (updateError) {
      console.warn('⚠️ Could not update optimized fallback file:', updateError)
      // Don't fail the request if fallback update fails
    }
    
    return articles
  } catch (error) {
    console.warn('⚠️ Supabase failed or timed out, using optimized fallback:', error)
    
    try {
      const fallbackArticles = await loadOptimizedFallback()
      if (fallbackArticles.length > 0) {
        console.log(`✅ Optimized fallback successful: ${fallbackArticles.length} articles`)
        return fallbackArticles
      } else {
        console.warn('⚠️ No optimized fallback articles available')
        return []
      }
    } catch (fallbackError) {
      console.error('❌ Optimized fallback also failed:', fallbackError)
      return []
    }
  }
}

/**
 * Load articles for homepage with optimized fallback
 */
export async function getHomepageArticlesWithFallback(): Promise<Article[]> {
  return getArticlesWithFallback(10000) // 10 second timeout for homepage - give Supabase more time
}

/**
 * Load articles for city pages with fallback
 * 
 * PERFORMANCE: Uses optimized fallback and efficient filtering
 * 
 * @param city - City name (e.g., 'edmonton', 'calgary')
 * @returns Array of city-specific articles
 */
export async function getCityArticlesWithFallback(city: string): Promise<Article[]> {
  try {
    const fallbackArticles = await loadOptimizedFallback()
    
    // PERFORMANCE: Filter for city-specific articles (single pass)
    const cityLower = city.toLowerCase()
    return fallbackArticles.filter(article => {
      const hasCityCategory = article.category?.toLowerCase().includes(cityLower)
      const hasCityLocation = article.location?.toLowerCase().includes(cityLower)
      const hasCityCategories = article.categories?.some((cat: string) => 
        cat.toLowerCase().includes(cityLower)
      )
      const hasCityTags = article.tags?.some((tag: string) => 
        tag.toLowerCase().includes(cityLower)
      )
      // Only include articles that are specifically related to the city
      return hasCityCategory || hasCityLocation || hasCityCategories || hasCityTags
    })
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error(`Failed to load ${city} articles from fallback:`, error)
    }
    return []
  }
}

/**
 * Load articles for food & drink page with fallback
 * 
 * PERFORMANCE: Uses optimized fallback and efficient filtering
 * 
 * @returns Array of food & drink articles
 */
export async function getFoodDrinkArticlesWithFallback(): Promise<Article[]> {
  try {
    const fallbackArticles = await loadOptimizedFallback()
    
    // PERFORMANCE: Use utility function for consistent filtering
    const { filterFoodDrinkArticles } = await import('@/lib/utils/article-helpers')
    const foodDrinkArticles = filterFoodDrinkArticles(fallbackArticles)
    
    // PERFORMANCE: Sort by newest first
    foodDrinkArticles.sort((a, b) => {
      const dateA = new Date(a.createdAt || a.date || 0).getTime()
      const dateB = new Date(b.createdAt || b.date || 0).getTime()
      return dateB - dateA // Newest first
    })

    return foodDrinkArticles
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Failed to load Food & Drink articles from fallback:', error)
    }
    return []
  }
}

/**
 * Load articles for culture page with fallback
 * 
 * PERFORMANCE: Uses optimized fallback and efficient filtering
 * 
 * @returns Array of culture articles
 */
export async function getCultureArticlesWithFallback(): Promise<Article[]> {
  try {
    const fallbackArticles = await loadOptimizedFallback()
    
    // PERFORMANCE: Filter for culture articles (excluding events) - single pass
    const cultureKeywords = ['culture', 'art', 'heritage', 'music', 'theater', 'dance', 'museum', 'festival', 'indigenous', 'community']
    const cultureArticles = fallbackArticles.filter(article => {
      // First filter out events
      if (article.type === 'event') return false
      
      // Exclude specific articles that shouldn't be on the Culture page
      const title = article.title?.toLowerCase() || ''
      if (title.includes('edmonton folk music festival') || title.includes('edmonton folk festival')) {
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
    
    // PERFORMANCE: Sort by newest first
    cultureArticles.sort((a, b) => {
      const dateA = new Date(a.createdAt || a.date || 0).getTime()
      const dateB = new Date(b.createdAt || b.date || 0).getTime()
      return dateB - dateA // Newest first
    })

    return cultureArticles
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Failed to load Culture articles from fallback:', error)
    }
    return []
  }
}

/**
 * Clear the articles.json cache (useful for development)
 */
export function clearArticlesJsonCache(): void {
  articlesJsonCache = null
  articlesJsonCacheTimestamp = 0
}
