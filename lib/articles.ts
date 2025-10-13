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
  console.log('🚀 EMERGENCY FIX: Using optimized fallback directly due to Supabase timeouts...')
  
  try {
    // TEMPORARY FIX: Use fallback directly due to Supabase connection issues
    const fallbackArticles = await loadOptimizedFallback()
    console.log(`⚡ FALLBACK PRIMARY: Loaded ${fallbackArticles.length} articles from optimized fallback`)
    
    // Clear fast cache to ensure fresh data
    const { clearArticlesCache } = await import('./fast-articles')
    clearArticlesCache()
    console.log('🧹 Cleared fast cache to force fresh data load')
    
    return fallbackArticles
  } catch (fallbackError) {
    console.error('❌ Optimized fallback failed:', fallbackError)
    return []
  }
}

export async function getHomepageArticles(): Promise<Article[]> {
  console.log('🚀 EMERGENCY FIX: Using optimized fallback directly for homepage...')
  
  try {
    // TEMPORARY FIX: Use fallback directly due to Supabase connection issues
    const fallbackArticles = await loadOptimizedFallback()
    console.log(`⚡ FALLBACK PRIMARY: Loaded ${fallbackArticles.length} articles from optimized fallback`)
    
    // Clear fast cache to ensure fresh data
    try {
      const { clearArticlesCache } = await import('./fast-articles')
      clearArticlesCache()
      console.log('🧹 Cleared fast cache for homepage articles')
    } catch (cacheError) {
      console.warn('⚠️ Failed to clear fast cache:', cacheError)
    }
    
    // Return only recent articles for homepage
    return fallbackArticles.slice(0, 10)
  } catch (fallbackError) {
    console.error('❌ Optimized fallback failed:', fallbackError)
    return []
  }
}

export async function getCityArticles(city: string): Promise<Article[]> {
  try {
    console.log(`🔄 Fetching ${city} articles from Supabase...`)
    const articles = await getCityArticlesFromSupabase(city)
    
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
    // Filter by city from fallback
    return fallbackArticles.filter(article => 
      article.category === city || 
      (article.categories && article.categories.includes(city))
    )
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