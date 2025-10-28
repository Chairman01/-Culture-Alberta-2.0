import { Article } from './types/article'
import fs from 'fs'
import path from 'path'

// OPTIMIZED FALLBACK SYSTEM - Sustainable for unlimited articles
// This creates a lightweight backup that only stores homepage essentials

interface OptimizedArticle {
  id: string
  title: string
  excerpt: string
  description: string
  content: string // Added for full article content
  category: string
  categories: string[]
  status: string
  created_at: string
  createdAt: string
  date: string
  type: string
  author: string
  imageUrl: string
  trendingHome: boolean
  trendingEdmonton: boolean
  trendingCalgary: boolean
  featuredHome: boolean
  featuredEdmonton: boolean
  featuredCalgary: boolean
  // Event-specific fields
  event_date?: string
  event_end_date?: string
  location?: string
  organizer?: string
  organizer_contact?: string
  website_url?: string
}

const OPTIMIZED_FALLBACK_PATH = path.join(process.cwd(), 'optimized-fallback.json')
const MAX_EXCERPT_LENGTH = 150 // Keep excerpts short for performance
const MAX_TITLE_LENGTH = 80 // Keep titles reasonable
const MAX_CONTENT_LENGTH = 1000000 // Increased limit to allow full articles (1MB)

/**
 * Convert full article to optimized version for fallback
 */
function optimizeArticle(article: Article): OptimizedArticle {
  return {
    id: article.id,
    title: article.title.length > MAX_TITLE_LENGTH 
      ? article.title.substring(0, MAX_TITLE_LENGTH) + '...'
      : article.title,
    excerpt: article.excerpt && article.excerpt.length > MAX_EXCERPT_LENGTH
      ? article.excerpt.substring(0, MAX_EXCERPT_LENGTH) + '...'
      : (article.excerpt || ''),
    description: article.description || '',
    content: article.content && article.content.length > MAX_CONTENT_LENGTH
      ? article.content.substring(0, MAX_CONTENT_LENGTH) + '...'
      : (article.content || ''), // Limit content for performance
    category: article.category || 'General',
    categories: article.categories || [],
    status: article.status || 'published',
    created_at: article.createdAt,
    createdAt: article.createdAt,
    date: article.date || article.createdAt || new Date().toISOString(),
    type: article.type || 'article',
    author: article.author || 'Culture Alberta',
    imageUrl: article.imageUrl || '/placeholder-image.jpg',
    trendingHome: article.trendingHome || false,
    trendingEdmonton: article.trendingEdmonton || false,
    trendingCalgary: article.trendingCalgary || false,
    featuredHome: article.featuredHome || false,
    featuredEdmonton: article.featuredEdmonton || false,
    featuredCalgary: article.featuredCalgary || false,
    // Event-specific fields
    event_date: (article as any).event_date || undefined,
    event_end_date: (article as any).event_end_date || undefined,
    location: article.location || undefined,
    organizer: (article as any).organizer || undefined,
    organizer_contact: (article as any).organizer_contact || undefined,
    website_url: (article as any).website_url || undefined,
  }
}

/**
 * Update the optimized fallback file with fresh articles
 */
export async function updateOptimizedFallback(articles: Article[]): Promise<void> {
  try {
    console.log(`🔄 Updating optimized fallback with ${articles.length} articles...`)
    
    // Convert to optimized format
    const optimizedArticles = articles.map(optimizeArticle)
    
    // Write optimized file
    fs.writeFileSync(OPTIMIZED_FALLBACK_PATH, JSON.stringify(optimizedArticles, null, 2))
    
    // Log file size
    const stats = fs.statSync(OPTIMIZED_FALLBACK_PATH)
    const sizeKB = Math.round(stats.size / 1024)
    
    console.log(`✅ Optimized fallback updated: ${sizeKB} KB (${articles.length} articles)`)
    
    // Warn if getting too big
    if (sizeKB > 500) {
      console.warn(`⚠️ Optimized fallback is ${sizeKB} KB - consider reducing excerpt lengths`)
    }
  } catch (error) {
    console.error('❌ Failed to update optimized fallback:', error)
  }
}

/**
 * Load articles from optimized fallback file
 */
export async function loadOptimizedFallback(): Promise<Article[]> {
  try {
    if (!fs.existsSync(OPTIMIZED_FALLBACK_PATH)) {
      console.log('📁 No optimized fallback file found')
      return []
    }
    
    const fileContent = fs.readFileSync(OPTIMIZED_FALLBACK_PATH, 'utf-8')
    const optimizedArticles: OptimizedArticle[] = JSON.parse(fileContent)
    
    // Convert back to full Article format (with content if available)
    const articles: Article[] = optimizedArticles.map(opt => ({
      ...opt,
      content: opt.content || '', // Use content if available, otherwise empty
      slug: opt.id, // Use ID as slug
      updatedAt: opt.createdAt, // Use createdAt as updatedAt fallback
    }))
    
    // DEBUG: Check how many articles have content
    const articlesWithContent = articles.filter(article => 
      article.content && article.content.trim().length > 10
    )
    console.log(`✅ Loaded ${articles.length} articles from optimized fallback, ${articlesWithContent.length} have content`)
    
    return articles
  } catch (error) {
    console.error('❌ Failed to load optimized fallback:', error)
    return []
  }
}

/**
 * Get fallback file stats
 */
export function getFallbackStats() {
  try {
    if (!fs.existsSync(OPTIMIZED_FALLBACK_PATH)) {
      return { exists: false, sizeKB: 0, articleCount: 0 }
    }
    
    const stats = fs.statSync(OPTIMIZED_FALLBACK_PATH)
    const fileContent = fs.readFileSync(OPTIMIZED_FALLBACK_PATH, 'utf-8')
    const articles = JSON.parse(fileContent)
    
    return {
      exists: true,
      sizeKB: Math.round(stats.size / 1024),
      articleCount: articles.length,
      lastModified: stats.mtime.toISOString()
    }
  } catch (error) {
    return { exists: false, sizeKB: 0, articleCount: 0, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}
