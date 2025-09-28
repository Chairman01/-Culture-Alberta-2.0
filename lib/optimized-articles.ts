// Optimized article loading functions for better performance
import { Article } from './types/article'
import fs from 'fs'
import path from 'path'

// Cache for in-memory performance
let articlesCache: Article[] | null = null
let homepageCache: Article[] | null = null
let cityCache: { [key: string]: Article[] } = {}
let slugsIndex: { [key: string]: string } = {}
let cacheTimestamp = 0

const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

// Load data from optimized JSON files
function loadFromFile(filename: string): any {
  try {
    const filePath = path.join(process.cwd(), 'lib', 'data', filename)
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8')
      return JSON.parse(data)
    }
  } catch (error) {
    console.error(`Error loading ${filename}:`, error)
  }
  return null
}

// Get homepage articles (lightweight, fast)
export async function getOptimizedHomepageArticles(): Promise<Article[]> {
  const now = Date.now()
  
  // Check cache first
  if (homepageCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return homepageCache
  }
  
  // Load from optimized file
  const articles = loadFromFile('homepage-articles.json')
  if (articles) {
    homepageCache = articles
    cacheTimestamp = now
    return articles
  }
  
  // Fallback to full articles
  const allArticles = await getOptimizedAllArticles()
  homepageCache = allArticles.slice(0, 20).map(article => ({
    id: article.id,
    title: article.title,
    excerpt: article.excerpt,
    category: article.category,
    location: article.location,
    imageUrl: article.imageUrl,
    date: article.date,
    slug: article.slug,
    trendingHome: article.trendingHome,
    featuredHome: article.featuredHome
  }))
  
  return homepageCache
}

// Get all articles (with caching)
export async function getOptimizedAllArticles(): Promise<Article[]> {
  const now = Date.now()
  
  // Check cache first
  if (articlesCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return articlesCache
  }
  
  // Load from optimized file
  const articles = loadFromFile('articles.json')
  if (articles) {
    articlesCache = articles
    cacheTimestamp = now
    return articles
  }
  
  // Fallback to empty array
  return []
}

// Get article by slug (optimized with index)
export async function getOptimizedArticleBySlug(slug: string): Promise<Article | null> {
  // Load slugs index if not cached
  if (Object.keys(slugsIndex).length === 0) {
    slugsIndex = loadFromFile('article-slugs.json') || {}
  }
  
  // Get article ID from index
  const articleId = slugsIndex[slug.toLowerCase()]
  if (!articleId) {
    return null
  }
  
  // Get all articles and find by ID
  const articles = await getOptimizedAllArticles()
  return articles.find(article => article.id === articleId) || null
}

// Get city articles (optimized)
export async function getOptimizedCityArticles(city: 'edmonton' | 'calgary'): Promise<Article[]> {
  const now = Date.now()
  
  // Check cache first
  if (cityCache[city] && (now - cacheTimestamp) < CACHE_DURATION) {
    return cityCache[city]
  }
  
  // Load from optimized file
  const articles = loadFromFile(`${city}-articles.json`)
  if (articles) {
    cityCache[city] = articles
    return articles
  }
  
  // Fallback to filtering all articles
  const allArticles = await getOptimizedAllArticles()
  const filtered = allArticles.filter(article => 
    article.location?.toLowerCase().includes(city) ||
    article.category?.toLowerCase().includes(city)
  )
  
  cityCache[city] = filtered
  return filtered
}

// Get article by ID (optimized)
export async function getOptimizedArticleById(id: string): Promise<Article | null> {
  const articles = await getOptimizedAllArticles()
  return articles.find(article => article.id === id) || null
}

// Clear all caches
export function clearOptimizedCache(): void {
  articlesCache = null
  homepageCache = null
  cityCache = {}
  slugsIndex = {}
  cacheTimestamp = 0
}

// Get cache status
export function getCacheStatus() {
  return {
    articlesCached: !!articlesCache,
    homepageCached: !!homepageCache,
    cityCacheKeys: Object.keys(cityCache),
    slugsIndexSize: Object.keys(slugsIndex).length,
    cacheAge: Date.now() - cacheTimestamp
  }
}
