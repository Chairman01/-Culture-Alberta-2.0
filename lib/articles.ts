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

// SUSTAINABLE FALLBACK SYSTEM
// Supabase is the primary source for live/fresh data.
// The optimized-fallback.json is used ONLY when Supabase fails or times out.
// With revalidate=300 on all pages, Supabase is hit at most once per 5 minutes
// per page across all visitors (Next.js ISR serves cached HTML to everyone else).
// This reduces DB requests from 128K/day to ~5K/day with no stale-content trade-off.
const useFastDevFallback = process.env.NODE_ENV === 'development' && process.env.USE_SUPABASE_IN_DEV !== '1'

export async function getAllArticles(): Promise<Article[]> {
  // In dev, skip Supabase to keep the local server fast
  if (useFastDevFallback) {
    const fallbackArticles = await loadOptimizedFallback()
    return fallbackArticles.filter(item => item.type !== 'event')
  }

  try {
    const supabaseArticles = await getAllArticlesFromSupabase()
    if (supabaseArticles && supabaseArticles.length > 0) {
      return supabaseArticles.filter(item => item.type !== 'event')
    }
    throw new Error('No articles from Supabase')
  } catch (supabaseError) {
    console.warn('⚠️ Supabase failed, using optimized fallback:', supabaseError)
    const fallbackArticles = await loadOptimizedFallback()
    return fallbackArticles.filter(item => item.type !== 'event')
  }
}

export async function getHomepageArticles(): Promise<Article[]> {
  if (useFastDevFallback) {
    const fallbackArticles = await loadOptimizedFallback()
    return fallbackArticles.filter(item => item.type !== 'event')
  }

  try {
    const supabaseArticles = await getHomepageArticlesFromSupabase()
    if (supabaseArticles && supabaseArticles.length > 0) {
      return supabaseArticles.filter(item => item.type !== 'event')
    }
    throw new Error('No articles from Supabase')
  } catch (supabaseError) {
    console.warn('⚠️ Supabase failed, using optimized fallback:', supabaseError)
    const fallbackArticles = await loadOptimizedFallback()
    return fallbackArticles.filter(item => item.type !== 'event')
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