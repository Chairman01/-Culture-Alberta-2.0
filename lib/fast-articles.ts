import { createSlug } from '@/lib/utils/slug'
import { loadOptimizedFallback } from '@/lib/optimized-fallback'
import fs from 'fs'
import path from 'path'

// Fast in-memory cache for articles
let articlesCache: any[] | null = null
let cacheTimestamp: number = 0
const CACHE_DURATION = 1 * 60 * 1000 // 1 minute - shorter cache for testing

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
      console.log(`🚀 FAST CACHE: Loaded ${articlesCache.length} articles from optimized fallback`)
      
      // DEBUG: Check content in first few articles
      const articlesWithContent = fallbackArticles.filter(article => 
        article.content && article.content.trim().length > 10
      )
      console.log(`🚀 FAST CACHE DEBUG: ${articlesWithContent.length} articles have content`)
      if (articlesWithContent.length > 0) {
        console.log(`🚀 FAST CACHE DEBUG: First article with content: ${articlesWithContent[0].title}`)
        console.log(`🚀 FAST CACHE DEBUG: Content length: ${articlesWithContent[0].content.length}`)
      }
      
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
    const articleSlug = createSlug(article.title)
    
    // Try multiple matching strategies
    const exactMatch = articleSlug.toLowerCase() === slug.toLowerCase()
    if (exactMatch) return true
    
    const partialMatch = articleSlug.toLowerCase().includes(slug.toLowerCase()) || 
                       slug.toLowerCase().includes(articleSlug.toLowerCase())
    if (partialMatch) return true
    
    const titleMatch = article.title.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-') === slug.toLowerCase()
    if (titleMatch) return true
    
    return false
  }) || null

  // DEBUG: Log the found article content status
  if (foundArticle) {
    console.log('=== FAST ARTICLES DEBUG ===')
    console.log('Found article:', foundArticle.title)
    console.log('Content field exists:', 'content' in foundArticle)
    console.log('Content type:', typeof foundArticle.content)
    console.log('Content length:', foundArticle.content ? foundArticle.content.length : 'NO CONTENT')
    console.log('Content preview:', foundArticle.content ? foundArticle.content.substring(0, 100) : 'NO CONTENT')
  }

  return foundArticle
}

export function clearArticlesCache(): void {
  articlesCache = null
  cacheTimestamp = 0
}
