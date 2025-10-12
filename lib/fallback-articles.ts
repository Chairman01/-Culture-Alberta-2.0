import 'server-only'
import { Article } from './types/article'
import { getAllArticles as getSupabaseArticles } from './supabase-articles'
import fs from 'fs'
import path from 'path'

// Cache for articles.json data
let articlesJsonCache: Article[] | null = null
let articlesJsonCacheTimestamp: number = 0
const ARTICLES_JSON_CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

/**
 * Load articles from articles.json file as fallback
 */
async function loadArticlesFromJson(): Promise<Article[]> {
  // Check cache first
  const now = Date.now()
  if (articlesJsonCache && (now - articlesJsonCacheTimestamp) < ARTICLES_JSON_CACHE_DURATION) {
    return articlesJsonCache
  }

  try {
    const articlesJsonPath = path.join(process.cwd(), 'lib', 'data', 'articles.json')
    
    if (!fs.existsSync(articlesJsonPath)) {
      console.warn('⚠️ articles.json file not found at', articlesJsonPath)
      return []
    }

    const fileContent = fs.readFileSync(articlesJsonPath, 'utf-8')
    const articles = JSON.parse(fileContent)
    
    // Cache the result
    articlesJsonCache = articles
    articlesJsonCacheTimestamp = now
    
    console.log(`✅ Loaded ${articles.length} articles from articles.json fallback`)
    return articles
  } catch (error) {
    console.error('❌ Error loading articles from JSON:', error)
    return []
  }
}

/**
 * Load articles with Supabase as primary source and articles.json as fallback
 * This function tries Supabase first, and if it fails or takes too long, falls back to articles.json
 */
export async function getArticlesWithFallback(timeoutMs: number = 5000): Promise<Article[]> {
  console.log('🔄 Loading articles with fallback system...')
  
  // FORCE BOTH DEVELOPMENT AND PRODUCTION TO USE SAME LOGIC
  // Use articles.json FIRST (which has the correct data) for both environments
  console.log('🚀 Loading from articles.json first (both dev and production)')
  try {
    const jsonArticles = await loadArticlesFromJson()
    if (jsonArticles.length > 0) {
      console.log(`✅ Loaded ${jsonArticles.length} articles from articles.json (unified logic)`)
      return jsonArticles
    }
  } catch (jsonError) {
    console.warn('⚠️ articles.json failed, falling back to Supabase:', jsonError)
  }
  
  // Fallback: Use Supabase with timeout
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
    return articles
  } catch (error) {
    console.warn('⚠️ Supabase failed or timed out, using articles.json fallback:', error)
    
    try {
      const fallbackArticles = await loadArticlesFromJson()
      if (fallbackArticles.length > 0) {
        console.log(`✅ Fallback successful: ${fallbackArticles.length} articles from JSON`)
        return fallbackArticles
      } else {
        console.warn('⚠️ No fallback articles available')
        return []
      }
    } catch (fallbackError) {
      console.error('❌ Fallback also failed:', fallbackError)
      return []
    }
  }
}

/**
 * Load articles for homepage with optimized fallback
 */
export async function getHomepageArticlesWithFallback(): Promise<Article[]> {
  return getArticlesWithFallback(3000) // 3 second timeout for homepage
}

/**
 * Load articles for city pages with fallback
 */
export async function getCityArticlesWithFallback(city: string): Promise<Article[]> {
  const allArticles = await getArticlesWithFallback(5000) // 5 second timeout for city pages
  
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
  const allArticles = await getArticlesWithFallback(5000)
  
  return allArticles.filter(article => {
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
}

/**
 * Load articles for culture page with fallback
 */
export async function getCultureArticlesWithFallback(): Promise<Article[]> {
  const allArticles = await getArticlesWithFallback(5000)
  
  return allArticles.filter(article => {
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
}

/**
 * Clear the articles.json cache (useful for development)
 */
export function clearArticlesJsonCache(): void {
  articlesJsonCache = null
  articlesJsonCacheTimestamp = 0
}
