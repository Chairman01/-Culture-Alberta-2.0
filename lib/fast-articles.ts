import { createSlug } from '@/lib/utils/slug'
import { loadOptimizedFallback } from '@/lib/optimized-fallback'
import fs from 'fs'
import path from 'path'

// Fast in-memory cache for articles
let articlesCache: any[] | null = null
let cacheTimestamp: number = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes - matches ISR revalidate interval

export async function getFastArticles(): Promise<any[]> {
  const now = Date.now()
  
  // Return cached articles if still fresh
  if (articlesCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return articlesCache
  }
  
  try {
    // Try to read from optimized fallback first (fastest)
    const fallbackArticles = await loadOptimizedFallback()
    if (fallbackArticles && fallbackArticles.length > 0) {
      articlesCache = fallbackArticles
      cacheTimestamp = now
      return articlesCache
    }
  } catch (error) {
    console.log('⚠️ Optimized fallback read failed:', error)
  }
  
  // REMOVED: No longer using lib/data/articles.json as backup
  // This was causing mixed data sources (30 articles vs 27 articles)
  console.log('🚀 FAST CACHE: Skipping lib/data/articles.json backup - using only optimized fallback')
  
  // Fallback to empty array
  articlesCache = []
  cacheTimestamp = now
  return articlesCache
}

export async function getFastArticleBySlug(slug: string): Promise<any | null> {
  const articles = await getFastArticles()
  
  const foundArticle = articles.find(article => {
    if (article.slug && String(article.slug).toLowerCase() === slug.toLowerCase()) {
      return true
    }

    const articleSlug = createSlug(article.title)
    
    // Try multiple matching strategies
    const exactMatch = articleSlug.toLowerCase() === slug.toLowerCase()
    if (exactMatch) return true
    
    // Only match if the requested slug contains the article's slug (not the reverse)
    // Prevents "...-gale-again" from matching when looking for "...-gale"
    const partialMatch = slug.toLowerCase().includes(articleSlug.toLowerCase())
    if (partialMatch) return true
    
    const titleMatch = article.title.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-') === slug.toLowerCase()
    if (titleMatch) return true
    
    return false
  }) || null

  return foundArticle
}

export function clearArticlesCache(): void {
  articlesCache = null
  cacheTimestamp = 0
}
