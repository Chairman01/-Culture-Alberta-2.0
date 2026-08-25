import { Article } from './types/article'
import { createSlug } from './utils/slug'
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
  slug?: string
}

const OPTIMIZED_FALLBACK_PATH = path.join(process.cwd(), 'optimized-fallback.json')
const DEFAULT_ARTICLE_AUTHOR = 'Adam Harrison'
// NOTE: We do NOT truncate excerpts here - CSS line-clamp handles visual truncation on listings
// Article detail pages need full excerpts for proper display and SEO
const MAX_CONTENT_LENGTH = 1000000 // Increased limit to allow full articles (1MB)

/**
 * Convert full article to optimized version for fallback
 */
function optimizeArticle(article: Article): OptimizedArticle {
  return {
    id: article.id,
    title: article.title, // Full titles - CSS line-clamp handles visual truncation
    excerpt: article.excerpt || '', // Keep full excerpts - CSS line-clamp handles visual truncation on listings
    description: article.description || '',
    content: article.content || '', // Use full content without truncation
    category: article.category || 'General',
    categories: article.categories || [],
    status: article.status || 'published',
    created_at: article.createdAt,
    createdAt: article.createdAt,
    date: article.date || article.createdAt || new Date().toISOString(),
    type: article.type || 'article',
    author: article.author || DEFAULT_ARTICLE_AUTHOR,
    imageUrl: article.imageUrl || (article as any).image_url || (article as any).image || '/placeholder-image.jpg',
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
    slug: article.slug || createSlug(article.title),
  }
}

/**
 * A write this much smaller than what is already on disk is rejected.
 *
 * This file is the whole site's last resort when Supabase is unreachable, and
 * the write is a replace, not a merge — so one caller passing a filtered
 * subset silently destroys every article outside that subset. That happened:
 * a city page wrote its own city's rows here, and during `next build` (where,
 * unlike at runtime on Vercel, the filesystem is writable) it left a fallback
 * holding 172 Calgary articles and no Edmonton ones. The Edmonton page then
 * prerendered off it and shipped empty.
 *
 * The offending caller is gone, but a partial write is an easy mistake to make
 * again and its symptom — one city quietly blank — is a long way from its
 * cause. Half is well clear of the normal churn of a full refresh, where the
 * count moves by a handful of articles at a time.
 */
const MIN_KEEP_RATIO = 0.5

/**
 * Update the optimized fallback file with fresh articles
 */
export async function updateOptimizedFallback(articles: Article[]): Promise<void> {
  try {
    console.log(`🔄 Updating optimized fallback with ${articles.length} articles...`)

    let existingContentById = new Map<string, string>()
    let existingAuthorById = new Map<string, string>()
    if (fs.existsSync(OPTIMIZED_FALLBACK_PATH)) {
      try {
        const existingArticles = JSON.parse(fs.readFileSync(OPTIMIZED_FALLBACK_PATH, 'utf-8'))
        if (Array.isArray(existingArticles)) {
          if (articles.length < existingArticles.length * MIN_KEEP_RATIO) {
            console.warn(
              `⚠️ Refusing to shrink optimized fallback from ${existingArticles.length} to ` +
              `${articles.length} articles — this looks like a filtered subset, not a full refresh`
            )
            return
          }
          existingContentById = new Map(
            existingArticles
              .filter((article: any) => article?.id && typeof article.content === 'string' && article.content.trim().length > 0)
              .map((article: any) => [article.id, article.content])
          )
          existingAuthorById = new Map(
            existingArticles
              .filter((article: any) => article?.id && typeof article.author === 'string' && article.author.trim().length > 0)
              .map((article: any) => [article.id, article.author])
          )
        }
      } catch (readError) {
        console.warn('âš ï¸ Could not read existing fallback before update:', readError)
      }
    }

    // Convert to optimized format, preserving full content when a lightweight
    // listing query returns the same article with an empty content field.
    const optimizedArticles = articles.map(article => {
      const existingContent = existingContentById.get(article.id)
      const content = typeof article.content === 'string' && article.content.trim().length > 0
        ? article.content
        : existingContent || ''
      const author = typeof article.author === 'string' && article.author.trim().length > 0
        ? article.author
        : existingAuthorById.get(article.id) || DEFAULT_ARTICLE_AUTHOR

      return optimizeArticle({ ...article, content, author })
    })

    // Write optimized file
    fs.writeFileSync(OPTIMIZED_FALLBACK_PATH, JSON.stringify(optimizedArticles, null, 2))
    invalidateOptimizedFallbackCache()

    // Log file size
    const stats = fs.statSync(OPTIMIZED_FALLBACK_PATH)
    const sizeKB = Math.round(stats.size / 1024)

    console.log(`✅ Optimized fallback updated: ${sizeKB} KB (${articles.length} articles)`)

    // Warn if getting too big
    if (sizeKB > 500) {
      console.warn(`⚠️ Optimized fallback is ${sizeKB} KB - consider optimizing image URLs or content`)
    }
  } catch (error) {
    console.error('❌ Failed to update optimized fallback:', error)
  }
}

// Memoized parse of the fallback file. This is ~580 KB of JSON mapped over 500
// articles, and it had 41 call sites — several of them on the request path, and
// `getArticleBySlug` runs it first thing. Worse, `readFileSync` blocks the whole
// Node event loop, so it stalled every *other* request sharing the lambda too.
// On Vercel the file is baked into the deployment and cannot change under a
// running instance, so caching it for the process lifetime is safe; the TTL only
// exists so local dev picks up `updateOptimizedFallback` writes.
let fallbackCache: Article[] | null = null
let fallbackCacheAt = 0
let fallbackInFlight: Promise<Article[]> | null = null
const FALLBACK_CACHE_MS = process.env.NODE_ENV === 'production' ? Infinity : 10_000

/**
 * Load articles from optimized fallback file
 */
export async function loadOptimizedFallback(): Promise<Article[]> {
  if (fallbackCache && Date.now() - fallbackCacheAt < FALLBACK_CACHE_MS) {
    return fallbackCache
  }
  // Concurrent callers during a cold start share one read instead of each
  // doing their own 580 KB blocking parse.
  if (fallbackInFlight) return fallbackInFlight

  fallbackInFlight = (async (): Promise<Article[]> => {
    try {
      if (!fs.existsSync(OPTIMIZED_FALLBACK_PATH)) {
        console.log('📁 No optimized fallback file found')
        return []
      }

      // Async read: does not block the event loop for other in-flight requests.
      const fileContent = await fs.promises.readFile(OPTIMIZED_FALLBACK_PATH, 'utf-8')
      const optimizedArticles: OptimizedArticle[] = JSON.parse(fileContent)

      // Convert back to full Article format (with content if available)
      const articles: Article[] = optimizedArticles.map(opt => ({
        ...opt,
        content: opt.content || '', // Use content if available, otherwise empty
        slug: opt.slug || createSlug(opt.title),
        updatedAt: opt.createdAt, // Use createdAt as updatedAt fallback
      }))

      fallbackCache = articles
      fallbackCacheAt = Date.now()
      return articles
    } catch (error) {
      console.error('❌ Failed to load optimized fallback:', error)
      return []
    } finally {
      fallbackInFlight = null
    }
  })()

  return fallbackInFlight
}

/** Drop the memoized fallback so the next read re-parses (used after a rewrite). */
export function invalidateOptimizedFallbackCache(): void {
  fallbackCache = null
  fallbackCacheAt = 0
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
