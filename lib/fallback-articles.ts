import 'server-only'
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
 */
export async function getCityArticlesWithFallback(city: string): Promise<Article[]> {
  // TESTING: Skip Supabase entirely, use optimized fallback only
  console.log(`🧪 TESTING: Loading ${city} articles from optimized fallback only...`)
  
  try {
    const fallbackArticles = await loadOptimizedFallback()
    console.log(`⚡ FALLBACK ONLY: Loaded ${fallbackArticles.length} articles from optimized fallback`)
    
    // Filter for city-specific articles
    return fallbackArticles.filter(article => {
      const hasCityCategory = article.category?.toLowerCase().includes(city.toLowerCase())
      const hasCityLocation = article.location?.toLowerCase().includes(city.toLowerCase())
      const hasCityCategories = article.categories?.some((cat: string) => 
        cat.toLowerCase().includes(city.toLowerCase())
      )
      const hasCityTags = article.tags?.some((tag: string) => 
        tag.toLowerCase().includes(city.toLowerCase())
      )
      // Only include articles that are specifically related to the city
      return hasCityCategory || hasCityLocation || hasCityCategories || hasCityTags
    })
  } catch (error) {
    console.error(`❌ Failed to load ${city} articles from fallback:`, error)
    return []
  }
  
  // Filter for city-specific articles
  return allArticles.filter(article => {
    const hasCityCategory = article.category?.toLowerCase().includes(city.toLowerCase())
    const hasCityLocation = article.location?.toLowerCase().includes(city.toLowerCase())
    const hasCityCategories = article.categories?.some((cat: string) => 
      cat.toLowerCase().includes(city.toLowerCase())
    )
    const hasCityTags = article.tags?.some((tag: string) => 
      tag.toLowerCase().includes(city.toLowerCase())
    )
    // Only include articles that are specifically related to the city
    return hasCityCategory || hasCityLocation || hasCityCategories || hasCityTags
  })
}

/**
 * Load articles for food & drink page with fallback
 */
export async function getFoodDrinkArticlesWithFallback(): Promise<Article[]> {
  // TESTING: Skip Supabase entirely, use optimized fallback only
  console.log('🧪 TESTING: Loading Food & Drink articles from optimized fallback only...')
  
  try {
    const fallbackArticles = await loadOptimizedFallback()
    console.log(`⚡ FALLBACK ONLY: Loaded ${fallbackArticles.length} articles from optimized fallback`)
    
    // Filter for food & drink articles
    return fallbackArticles.filter(article => {
    const hasFoodCategory = article.category?.toLowerCase().includes('food') || 
                           article.category?.toLowerCase().includes('drink') ||
                           article.category?.toLowerCase().includes('restaurant') ||
                           article.category?.toLowerCase().includes('cafe') ||
                           article.category?.toLowerCase().includes('brewery') ||
                           article.category?.toLowerCase().includes('food & drink')
    
    const hasFoodCategories = article.categories?.some(cat => 
      cat.toLowerCase().includes('food') || 
      cat.toLowerCase().includes('drink') ||
      cat.toLowerCase().includes('restaurant') ||
      cat.toLowerCase().includes('cafe') ||
      cat.toLowerCase().includes('brewery') ||
      cat.toLowerCase().includes('food & drink')
    )
    
    const hasFoodTags = article.tags?.some(tag => 
      tag.toLowerCase().includes('food') || 
      tag.toLowerCase().includes('drink') ||
      tag.toLowerCase().includes('restaurant') ||
      tag.toLowerCase().includes('cafe') ||
      tag.toLowerCase().includes('brewery') ||
      tag.toLowerCase().includes('food & drink')
    )
    
    return hasFoodCategory || hasFoodCategories || hasFoodTags
    })
  } catch (error) {
    console.error('❌ Failed to load Food & Drink articles from fallback:', error)
    return []
  }
}

/**
 * Load articles for culture page with fallback
 */
export async function getCultureArticlesWithFallback(): Promise<Article[]> {
  // TESTING: Skip Supabase entirely, use optimized fallback only
  console.log('🧪 TESTING: Loading Culture articles from optimized fallback only...')
  
  try {
    const fallbackArticles = await loadOptimizedFallback()
    console.log(`⚡ FALLBACK ONLY: Loaded ${fallbackArticles.length} articles from optimized fallback`)
    
    // Filter for culture articles
    return fallbackArticles.filter(article => {
    // Exclude specific articles that shouldn't be on the Culture page
    if (article.title?.toLowerCase().includes('edmonton folk music festival') ||
        article.title?.toLowerCase().includes('edmonton folk festival')) {
      return false
    }
    
    const hasCultureCategory = article.category?.toLowerCase().includes('culture') || 
                              article.category?.toLowerCase().includes('art') ||
                              article.category?.toLowerCase().includes('music') ||
                              article.category?.toLowerCase().includes('theater') ||
                              article.category?.toLowerCase().includes('museum') ||
                              article.category?.toLowerCase().includes('festival') ||
                              article.category?.toLowerCase().includes('heritage') ||
                              article.category?.toLowerCase().includes('indigenous') ||
                              article.category?.toLowerCase().includes('community')
    
    const hasCultureCategories = article.categories?.some(cat => 
      cat.toLowerCase().includes('culture') || 
      cat.toLowerCase().includes('art') ||
      cat.toLowerCase().includes('music') ||
      cat.toLowerCase().includes('theater') ||
      cat.toLowerCase().includes('museum') ||
      cat.toLowerCase().includes('festival') ||
      cat.toLowerCase().includes('heritage') ||
      cat.toLowerCase().includes('indigenous') ||
      cat.toLowerCase().includes('community')
    )
    
    const hasCultureTags = article.tags?.some(tag => 
      tag.toLowerCase().includes('culture') || 
      tag.toLowerCase().includes('art') ||
      tag.toLowerCase().includes('music') ||
      tag.toLowerCase().includes('theater') ||
      tag.toLowerCase().includes('museum') ||
      tag.toLowerCase().includes('festival') ||
      tag.toLowerCase().includes('heritage') ||
      tag.toLowerCase().includes('indigenous') ||
      tag.toLowerCase().includes('community')
    )
    
    return hasCultureCategory || hasCultureCategories || hasCultureTags
    })
  } catch (error) {
    console.error('❌ Failed to load Culture articles from fallback:', error)
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
