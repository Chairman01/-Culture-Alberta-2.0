import { createSlug } from '@/lib/utils/slug'
import fs from 'fs'
import path from 'path'

// Fast in-memory cache for articles
let articlesCache: any[] | null = null
let cacheTimestamp: number = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export async function getFastArticles(): Promise<any[]> {
  const now = Date.now()
  
  // Return cached articles if still fresh
  if (articlesCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return articlesCache
  }
  
  try {
    // Try to read from local file first (fastest)
    const articlesPath = path.join(process.cwd(), 'lib', 'data', 'articles.json')
    if (fs.existsSync(articlesPath)) {
      const fileContent = fs.readFileSync(articlesPath, 'utf8')
      articlesCache = JSON.parse(fileContent)
      cacheTimestamp = now
      console.log(`🚀 FAST CACHE: Loaded ${articlesCache.length} articles from file`)
      return articlesCache
    }
  } catch (error) {
    console.log('⚠️ Fast cache file read failed:', error)
  }
  
  // Fallback to empty array
  articlesCache = []
  cacheTimestamp = now
  return articlesCache
}

export async function getFastArticleBySlug(slug: string): Promise<any | null> {
  const articles = await getFastArticles()
  
  return articles.find(article => {
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
}

export function clearArticlesCache(): void {
  articlesCache = null
  cacheTimestamp = 0
}
