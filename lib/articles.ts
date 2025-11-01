import { Article, CreateArticleInput, UpdateArticleInput } from './types/article'
import { 
  getAllArticles as getAllArticlesFromSupabase,
  getHomepageArticles as getHomepageArticlesFromSupabase,
  getAdminArticles as getAdminArticlesFromSupabase,
  getCityArticles as getCityArticlesFromSupabase,
  getEventsArticles as getEventsArticlesFromSupabase,
  getArticleById as getArticleByIdFromSupabase,
  getArticleBySlug as getArticleBySlugFromSupabase,
  createArticle as createArticleInSupabase,
  updateArticle as updateArticleInSupabase,
  deleteArticle as deleteArticleFromSupabase
} from './supabase-articles'
import { updateOptimizedFallback, loadOptimizedFallback } from './optimized-fallback'

// SUSTAINABLE FALLBACK SYSTEM - Works with unlimited articles
// These functions try Supabase first, then fall back to optimized backup

export async function getAllArticles(): Promise<Article[]> {
  console.log('🚀 Loading articles...')
  
  try {
    // Use optimized fallback as primary source (fastest and most reliable)
    const fallbackArticles = await loadOptimizedFallback()
    console.log(`⚡ Loaded ${fallbackArticles.length} articles from optimized fallback`)
    
    // Filter out events - only return articles
    const articlesOnly = fallbackArticles.filter(item => item.type !== 'event')
    console.log(`📰 Returning ${articlesOnly.length} articles`)
    
    return articlesOnly
  } catch (fallbackError) {
    console.error('❌ Optimized fallback failed:', fallbackError)
    return []
  }
}

export async function getHomepageArticles(): Promise<Article[]> {
  console.log('🚀 Loading homepage articles...')
  
  try {
    // Use optimized fallback as primary source
    const fallbackArticles = await loadOptimizedFallback()
    console.log(`⚡ Loaded ${fallbackArticles.length} articles from optimized fallback`)
    
    // Filter out events - only return articles
    const articlesOnly = fallbackArticles.filter(item => item.type !== 'event')
    console.log(`📰 Returning ${articlesOnly.length} articles for homepage`)
    
    return articlesOnly
  } catch (fallbackError) {
    console.error('❌ Optimized fallback failed:', fallbackError)
    return []
  }
}

export async function getCityArticles(city: string): Promise<Article[]> {
  try {
    console.log(`🔄 Fetching ${city} articles from Supabase...`)
    
    // Type guard to ensure we only pass valid city names to Supabase function
    const validCity = city.toLowerCase() as 'edmonton' | 'calgary'
    if (validCity !== 'edmonton' && validCity !== 'calgary') {
      console.warn(`⚠️ Invalid city name: ${city}. Falling back to optimized fallback.`)
      // Load all articles from fallback and filter by city (excluding events)
      const allFallbackArticles = await loadOptimizedFallback()
      return allFallbackArticles.filter(article => {
        // First filter out events
        if (article.type === 'event') return false
        
        const hasCityCategory = article.category?.toLowerCase().includes(city.toLowerCase())
        const hasCityLocation = article.location?.toLowerCase().includes(city.toLowerCase())
        const hasCityCategories = article.categories?.some((cat: string) => 
          cat.toLowerCase().includes(city.toLowerCase())
        )
        const hasCityTags = article.tags?.some((tag: string) => 
          tag.toLowerCase().includes(city.toLowerCase())
        )
        return hasCityCategory || hasCityLocation || hasCityCategories || hasCityTags
      })
    }
    
    const articles = await getCityArticlesFromSupabase(validCity)
    
    // Update optimized fallback with fresh data ONLY if we got articles
    if (articles.length > 0) {
      await updateOptimizedFallback(articles)
      console.log(`✅ Updated optimized fallback with ${articles.length} articles`)
    } else {
      console.log('⚠️ No articles from Supabase, skipping fallback update to preserve existing data')
    }
    
    console.log(`✅ Loaded ${articles.length} ${city} articles from Supabase`)
    return articles
  } catch (error) {
    console.warn('⚠️ Supabase failed, using optimized fallback:', error)
    const fallbackArticles = await loadOptimizedFallback()
    // Filter by city from fallback (excluding events)
    return fallbackArticles.filter(article => {
      // First filter out events
      if (article.type === 'event') return false
      
      return article.category === city || 
        (article.categories && article.categories.includes(city))
    })
  }
}

export async function getEventsArticles(): Promise<Article[]> {
  try {
    console.log('🔄 Fetching events from Supabase...')
    const articles = await getEventsArticlesFromSupabase()
    
    // Update optimized fallback with fresh data ONLY if we got articles
    if (articles.length > 0) {
      await updateOptimizedFallback(articles)
      console.log(`✅ Updated optimized fallback with ${articles.length} articles`)
    } else {
      console.log('⚠️ No articles from Supabase, skipping fallback update to preserve existing data')
    }
    
    console.log(`✅ Loaded ${articles.length} events from Supabase`)
    return articles
  } catch (error) {
    console.warn('⚠️ Supabase failed, using optimized fallback:', error)
    const fallbackArticles = await loadOptimizedFallback()
    // Filter events from fallback
    return fallbackArticles.filter(article => article.type === 'event')
  }
}

export const getArticleById = getArticleByIdFromSupabase
export const getArticleBySlug = getArticleBySlugFromSupabase

// Admin functions always use Supabase for write operations
export const getAdminArticles = getAdminArticlesFromSupabase
export const createArticle = createArticleInSupabase
export const updateArticle = updateArticleInSupabase
export const deleteArticle = deleteArticleFromSupabase 