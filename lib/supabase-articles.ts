import { supabase } from './supabase'
import { Article, CreateArticleInput, UpdateArticleInput } from './types/article'
// Conditional import for file system operations (server-side only)
let fileArticlesModule: any = null
if (typeof window === 'undefined') {
  try {
    fileArticlesModule = require('./file-articles')
  } catch (error) {
    console.warn('File articles module not available:', error)
  }
}
import { shouldUseFileSystem, shouldUseSupabaseForAdmin } from './build-config'
import { getProductionCacheSettings, handleProductionError, trackProductionPerformance } from './production-optimizations'
import { optimizeDataFetching, trackResourceUsage } from './vercel-optimizations'
import { deduplicateRequest, generateCacheKey } from './request-deduplication'
import { startBackgroundSyncIfNeeded } from './background-sync'
import { createSlug } from './utils/slug'
import { loadOptimizedFallback } from './optimized-fallback'

// Constants to prevent typos and ensure consistency
const IMAGE_FIELDS = {
  IMAGE_URL: 'image_url',
  IMAGE: 'image'
} as const

// Standard image fields that should always be included in queries
const STANDARD_IMAGE_FIELDS = `${IMAGE_FIELDS.IMAGE_URL}, ${IMAGE_FIELDS.IMAGE}`

// Helper function to ensure image fields are always included in select queries
function ensureImageFields(fields: string): string {
  // Check if both image fields are already included
  if (fields.includes(IMAGE_FIELDS.IMAGE_URL) && fields.includes(IMAGE_FIELDS.IMAGE)) {
    return fields
  }

  // If only one image field is missing, add it
  if (!fields.includes(IMAGE_FIELDS.IMAGE_URL)) {
    fields += `, ${IMAGE_FIELDS.IMAGE_URL}`
  }
  if (!fields.includes(IMAGE_FIELDS.IMAGE)) {
    fields += `, ${IMAGE_FIELDS.IMAGE}`
  }

  if (process.env.NODE_ENV === 'development') {
    console.warn('⚠️ Image fields were missing from query, automatically added them:', fields)
  }
  return fields
}

// Helper function to validate and clean image URLs
function validateImageUrl(imageUrl: any, articleTitle: string): string | undefined {
  // Return undefined for null, undefined, or empty strings
  if (!imageUrl || imageUrl === '' || imageUrl === 'null' || imageUrl === 'undefined') {
    // Only log missing images in development to avoid spam
    if (process.env.NODE_ENV === 'development') {
      console.warn(`⚠️ No image found for article: "${articleTitle}"`)
    }
    return undefined
  }

  // Check if it's a valid URL or data URI
  const isValidUrl = imageUrl.startsWith('http') || imageUrl.startsWith('data:') || imageUrl.startsWith('/')
  if (!isValidUrl) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`⚠️ Invalid image URL for article "${articleTitle}": ${imageUrl}`)
    }
    return undefined
  }

  // Optimize base64 images by truncating logging for performance
  if (imageUrl && process.env.NODE_ENV === 'development') {
    const truncatedUrl = imageUrl.startsWith('data:')
      ? `${imageUrl.substring(0, 30)}...${imageUrl.substring(imageUrl.length - 10)}`
      : imageUrl.substring(0, 50) + (imageUrl.length > 50 ? '...' : '')
    console.log(`✅ Found image for "${articleTitle}": ${truncatedUrl}`)
  }

  return imageUrl
}

function mapArticleRow(article: any): Article {
  return {
    ...article,
    imageUrl: validateImageUrl(article.image_url || article.image || article.imageUrl, article.title),
    date: article.created_at || article.createdAt || article.date,
    createdAt: article.created_at || article.createdAt,
    updatedAt: article.updated_at || article.updatedAt,
    trendingHome: article.trending_home || article.trendingHome || false,
    trendingEdmonton: article.trending_edmonton || article.trendingEdmonton || false,
    trendingCalgary: article.trending_calgary || article.trendingCalgary || false,
    featuredHome: article.featured_home || article.featuredHome || false,
    featuredEdmonton: article.featured_edmonton || article.featuredEdmonton || false,
    featuredCalgary: article.featured_calgary || article.featuredCalgary || false,
  }
}

function buildTitleSearchPattern(slug: string): string {
  const words = slug
    .toLowerCase()
    .split('-')
    .map(word => word.replace(/[%_]/g, ''))
    .filter(word => word.length > 1)
    .slice(0, 8)

  return words.length > 0 ? `%${words.join('%')}%` : `%${slug.replace(/[%_]/g, '')}%`
}

async function getArticleFromOptimizedFallbackBySlug(slug: string): Promise<Article | null> {
  try {
    const fallbackArticles = await loadOptimizedFallback()
    const normalizedSlug = slug.toLowerCase()
    const article = fallbackArticles.find(article => {
      if (article.type === 'event') return false
      if (createSlug(article.title) === normalizedSlug) return true
      if ((article as any).slug && String((article as any).slug).toLowerCase() === normalizedSlug) return true
      return false
    })

    return article ? mapArticleRow(article) : null
  } catch (error) {
    console.warn('⚠️ Optimized fallback slug lookup failed:', error instanceof Error ? error.message : error)
    return null
  }
}

// Enhanced cache for articles to prevent multiple API calls
let articlesCache: Article[] | null = null
let articleCache: Map<string, Article> = new Map()
let cityArticlesCache: Map<string, Article[]> = new Map()
let cacheTimestamp: number = 0
let cityCacheTimestamp: Map<string, number> = new Map()

// PRODUCTION FIX: Disabled all caching to ensure fresh data
const getCacheDuration = () => {
  // Keep production behavior unchanged, but cache briefly in development
  // to avoid repeated timeout waits on hot reload/navigation.
  if (process.env.NODE_ENV === 'development') {
    return 30 * 1000 // 30 seconds
  }
  return 0
}

// CRITICAL FIX: DISABLE FILE SYSTEM FALLBACK - Use Supabase + optimized fallback instead
const shouldUseFileSystemFirst = () => {
  // ALWAYS return false - the old file system is replaced by optimized-fallback.json
  // The file at lib/data/articles.ts is now just an empty placeholder
  console.log('🚀 Using Supabase with optimized fallback system')
  return false
}

// Test function to check if articles table exists
export async function checkArticlesTable(): Promise<boolean> {
  try {
    console.log('Checking if articles table exists...')

    if (!supabase) {
      console.error('Supabase client is not initialized')
      return false
    }

    // Try to query the table structure
    const { data, error } = await supabase
      .from('articles')
      .select('id')
      .limit(1)

    if (error) {
      console.error('Articles table check failed:', {
        message: error.message || 'Unknown error',
        details: error.details || 'No details',
        hint: error.hint || 'No hint',
        code: error.code || 'No code',
        fullError: error
      })

      // Check if it's a "relation does not exist" error
      if (error.message && error.message.includes('does not exist')) {
        console.error('Articles table does not exist in Supabase. Please run the create-articles-table.sql script.')
        return false
      }

      return false
    }

    console.log('Articles table exists and is accessible')
    return true
  } catch (error) {
    console.error('Articles table check error:', {
      error: error instanceof Error ? error.message : error,
      fullError: error
    })
    return false
  }
}

// Test function to check Supabase connection
export async function testSupabaseConnection(): Promise<boolean> {
  try {
    console.log('Testing Supabase connection...')
    console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL || 'Using fallback URL')
    console.log('Supabase client initialized:', !!supabase)

    if (!supabase) {
      console.error('Supabase client is not initialized')
      return false
    }

    // Test basic connection first
    console.log('Testing basic Supabase connection...')
    const { data: testData, error: testError } = await supabase
      .from('articles')
      .select('count')
      .limit(1)

    console.log('Basic connection test result:', { testData, testError })

    if (testError) {
      console.error('Supabase connection test failed:', {
        message: testError.message || 'Unknown error',
        details: testError.details || 'No details',
        hint: testError.hint || 'No hint',
        code: testError.code || 'No code',
        fullError: testError,
        errorType: typeof testError,
        errorKeys: Object.keys(testError)
      })
      return false
    }

    console.log('Supabase connection test successful')
    return true
  } catch (error) {
    console.error('Supabase connection test error:', {
      error: error instanceof Error ? error.message : error,
      fullError: error,
      errorType: typeof error,
      errorStack: error instanceof Error ? error.stack : 'No stack'
    })
    return false
  }
}

// SMART CACHE: Homepage articles with intelligent caching
export async function getHomepageArticles(): Promise<Article[]> {
  const startTime = Date.now()

  // DISABLED: Request deduplication was causing intermittent failures
  // Multiple requests should be allowed for homepage articles to ensure reliability
  // const cacheKey = generateCacheKey('getHomepageArticles')
  // return deduplicateRequest(cacheKey, async () => {
  try {
    console.log('=== getHomepageArticles called ===')

    // SMART CACHE: Check if we have recent cache (less than 10 seconds old)
    const now = Date.now()
    const cacheAge = now - cacheTimestamp
    const maxCacheAge = getCacheDuration() // Use the same cache duration as everywhere else

    if (articlesCache && cacheAge < maxCacheAge) {
      console.log('⚡ SPEED: Using recent cache (age:', Math.round(cacheAge / 1000), 'seconds)')
      return articlesCache!
    }

    // If cache is stale, fetch fresh data from Supabase
    console.log('🔄 UPDATING: Cache is stale, fetching fresh data from Supabase...')

    if (!supabase) {
      console.error('Supabase client is not initialized')
      console.log('Falling back to file system')
      return fileArticlesModule ? await fileArticlesModule.getAllArticlesFromFile() : []
    }

    // SPEED: Fail faster in development so fallback renders quickly
    const timeoutDuration = process.env.NODE_ENV === 'development' ? 1200 : 3000

    // SPEED OPTIMIZATION: Only fetch essential fields for homepage (NOT full content!)
    // Full content will be loaded on-demand when user clicks an article
    const fields = ensureImageFields('id, title, excerpt, category, categories, created_at, updated_at, trending_home, trending_edmonton, trending_calgary, featured_home, featured_edmonton, featured_calgary, type, status, author, location, tags')

    // RETRY LOGIC: Single attempt with shorter timeout for speed
    let data, error
    let attempts = 0
    const maxAttempts = 1 // Only 1 attempt for speed

    while (attempts < maxAttempts) {
      attempts++
      console.log(`🔄 Attempt ${attempts}/${maxAttempts} to fetch from Supabase...`)

      try {
        const supabasePromise = supabase
          .from('articles')
          .select(fields)
          .order('created_at', { ascending: false })
          .limit(500) // Fetch up to 500 articles to ensure all categories are populated

        const result = await Promise.race([
          supabasePromise,
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Supabase timeout')), timeoutDuration)
          )
        ]) as any

        data = result.data
        error = result.error

        if (!error) {
          console.log(`✅ Supabase query succeeded on attempt ${attempts}`)
          break
        } else {
          console.warn(`❌ Supabase attempt ${attempts} failed:`, error.message)
          if (attempts < maxAttempts) {
            console.log(`⏳ Waiting 2 seconds before retry...`)
            await new Promise(resolve => setTimeout(resolve, 2000))
          }
        }
      } catch (retryError) {
        console.warn(`❌ Supabase attempt ${attempts} threw error:`, retryError)
        if (attempts < maxAttempts) {
          console.log(`⏳ Waiting 2 seconds before retry...`)
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
      }
    }

    if (error || !data) {
      console.warn(`🚨 All ${maxAttempts} Supabase attempts failed, falling back to file system`)
      console.log('Falling back to file system')
      return fileArticlesModule ? await fileArticlesModule.getAllArticlesFromFile() : []
    }

    console.log('✅ SMART CACHE: Successfully fetched homepage articles from Supabase:', data?.length || 0, 'articles')

    // Map Supabase data to match our Article interface - optimized
    const mappedArticles = (data || []).map((article: any) => {
      // BANDWIDTH FIX: Only use image_url (Supabase Storage URLs), ignore base64 from image column
      let imageUrl = article.image_url

      // Skip base64 data URLs completely - only accept http/https URLs
      if (imageUrl && imageUrl.startsWith('data:')) {
        console.warn(`⚠️ Skipping base64 image for article: "${article.title}"`)
        imageUrl = undefined
      }

      return {
        ...article,
        imageUrl,
        date: article.created_at,
        trendingHome: article.trending_home || false,
        trendingEdmonton: article.trending_edmonton || false,
        trendingCalgary: article.trending_calgary || false,
        featuredHome: article.featured_home || false,
        featuredEdmonton: article.featured_edmonton || false,
        featuredCalgary: article.featured_calgary || false
      }
    })

    // Update cache with fresh data
    articlesCache = mappedArticles
    cacheTimestamp = now
    console.log('💾 CACHE: Updated homepage cache with fresh data')

    // Track resource usage
    trackResourceUsage('getHomepageArticles', startTime)

    return mappedArticles
  } catch (error) {
    console.warn('Supabase homepage connection failed:', error)
    console.log('Falling back to file system')
    return fileArticlesModule ? await fileArticlesModule.getAllArticlesFromFile() : []
  }
}

// Function to invalidate homepage cache when articles are modified
export function invalidateHomepageCache(): void {
  console.log('🗑️ CACHE: Invalidating homepage cache due to article changes')
  articlesCache = null
  cacheTimestamp = 0
}

// Optimized function for admin list that only fetches essential fields
export async function getAdminArticles(forceRefresh: boolean = false): Promise<Article[]> {
  try {
    console.log('=== getAdminArticles called ===', forceRefresh ? '(force refresh)' : '')

    // Admin operations always use Supabase for real-time data (ignore file system setting)
    console.log('Admin operation - using Supabase for real-time data')

    if (!supabase) {
      console.error('Supabase client is not initialized')
      console.log('Falling back to file system')
      return fileArticlesModule ? await fileArticlesModule.getAllArticlesFromFile() : []
    }

    console.log('Attempting to fetch admin articles from Supabase...')

    // For admin operations, always fetch fresh data to ensure accuracy
    // Add a cache-busting parameter to ensure we get fresh data
    const cacheBuster = forceRefresh ? `?t=${Date.now()}` : ''

    // Optimized query for admin - only essential fields for list view
    const supabasePromise = supabase
      .from('articles')
      .select('id, title, category, location, author, created_at, updated_at, status, type, featured_home, featured_edmonton, featured_calgary, date')
      .order('created_at', { ascending: false })
      .limit(500) // Fetch up to 500 most recent for admin

    const { data, error } = await Promise.race([
      supabasePromise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Supabase timeout')), getProductionCacheSettings().timeoutDuration * 1.5) // Dynamic timeout based on environment
      )
    ]) as any

    if (error) {
      console.warn('Supabase admin query failed:', error.message)
      console.log('Falling back to file system')
      return fileArticlesModule ? await fileArticlesModule.getAllArticlesFromFile() : []
    }

    console.log('Successfully fetched admin articles from Supabase:', data?.length || 0, 'articles')

    // Map Supabase data to match our Article interface
    const mappedArticles = (data || []).map((article: any) => ({
      ...article,
      date: article.date || article.created_at, // Use actual date field if available, fallback to created_at
      featuredHome: article.featured_home || false,
      featuredEdmonton: article.featured_edmonton || false,
      featuredCalgary: article.featured_calgary || false
    }))

    return mappedArticles
  } catch (error) {
    console.warn('Supabase admin connection failed:', error)
    console.log('Falling back to file system')
    return fileArticlesModule ? await fileArticlesModule.getAllArticlesFromFile() : []
  }
}

// Optimized function for events page
export async function getEventsArticles(): Promise<Article[]> {
  try {
    console.log('=== getEventsArticles called ===')

    // Check cache first
    const now = Date.now()
    const eventsCacheTime = cityCacheTimestamp.get('events') || 0
    if (cityArticlesCache.has('events') && (now - eventsCacheTime) < getCacheDuration()) {
      console.log('Returning cached events articles:', cityArticlesCache.get('events')?.length || 0, 'articles')
      return cityArticlesCache.get('events') || []
    }

    // During build time, always use file system for reliability
    if (shouldUseFileSystem()) {
      console.log('Build time detected, using file system for events')
      const fileArticles = await fileArticlesModule ? await fileArticlesModule.getAllArticlesFromFile() : []

      // Filter file articles for events only
      const filteredFileArticles = fileArticles.filter((article: any) =>
        article.categories && article.categories.includes('Events')
      );

      if (filteredFileArticles.length > 0) {
        console.log(`Found ${filteredFileArticles.length} events in file system out of ${fileArticles.length} total`)
        // Cache the filtered results
        cityArticlesCache.set('events', filteredFileArticles)
        cityCacheTimestamp.set('events', now)
        return filteredFileArticles
      }
    }


    if (!supabase) {
      console.error('Supabase client is not initialized')
      console.log('Falling back to file system')
      const fileArticles = await fileArticlesModule ? await fileArticlesModule.getAllArticlesFromFile() : []

      // Filter file articles for events only
      const filteredFileArticles = fileArticles.filter((article: any) =>
        article.categories && article.categories.includes('Events')
      );

      console.log(`Supabase fallback: Found ${filteredFileArticles.length} events out of ${fileArticles.length} total`)
      return filteredFileArticles
    }

    console.log('Attempting to fetch events articles from Supabase...')

    // Optimized query for events - only essential fields for display
    const fields = ensureImageFields('id, title, excerpt, category, categories, location, created_at, trending_home, trending_edmonton, trending_calgary, featured_home, featured_edmonton, featured_calgary')

    const supabasePromise = supabase
      .from('articles')
      .select(fields)
      .contains('categories', ['Events'])
      .order('created_at', { ascending: false })
      .limit(30) // Reduced limit for faster loading

    const { data, error } = await Promise.race([
      supabasePromise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Supabase timeout')), getProductionCacheSettings().timeoutDuration) // Dynamic timeout based on environment
      )
    ]) as any

    if (error) {
      console.warn('Supabase events query failed:', error.message)
      console.log('Falling back to file system')
      const fileArticles = await fileArticlesModule ? await fileArticlesModule.getAllArticlesFromFile() : []

      // Filter file articles for events only
      const filteredFileArticles = fileArticles.filter((article: any) =>
        article.categories && article.categories.includes('Events')
      );

      return filteredFileArticles
    }

    console.log('Successfully fetched events articles from Supabase:', data?.length || 0, 'articles')

    // Map Supabase data to match our Article interface
    const mappedArticles = (data || []).map((article: any) => {
      // BANDWIDTH FIX: Only use image_url, skip base64 data
      let imageUrl = article.image_url
      if (imageUrl && imageUrl.startsWith('data:')) {
        console.warn(`⚠️ Skipping base64 image for event: "${article.title}"`)
        imageUrl = undefined
      }

      return {
        ...article,
        imageUrl,
        date: article.created_at,
        trendingHome: article.trending_home || false,
        trendingEdmonton: article.trending_edmonton || false,
        trendingCalgary: article.trending_calgary || false,
        featuredHome: article.featured_home || false,
        featuredEdmonton: article.featured_edmonton || false,
        featuredCalgary: article.featured_calgary || false
      }
    })

    // Update cache
    cityArticlesCache.set('events', mappedArticles)
    cityCacheTimestamp.set('events', now)
    console.log('Updated events articles cache')

    return mappedArticles
  } catch (error) {
    console.warn('Supabase events connection failed:', error)
    console.log('Falling back to file system')
    const fileArticles = await fileArticlesModule ? await fileArticlesModule.getAllArticlesFromFile() : []

    // Filter file articles for events only
    const filteredFileArticles = fileArticles.filter((article: any) =>
      article.categories && article.categories.includes('Events')
    );

    console.log(`File system fallback: Found ${filteredFileArticles.length} events out of ${fileArticles.length} total`)
    return filteredFileArticles
  }
}

// SPEED OPTIMIZED: City articles with file system priority
export async function getCityArticles(city: 'edmonton' | 'calgary'): Promise<Article[]> {
  try {
    console.log(`=== getCityArticles called for ${city} ===`)

    // SPEED OPTIMIZATION: Check cache first with longer duration
    const now = Date.now()
    const cityCacheTime = cityCacheTimestamp.get(city) || 0
    if (cityArticlesCache.has(city) && (now - cityCacheTime) < getCacheDuration()) {
      console.log(`✅ Returning cached ${city} articles:`, cityArticlesCache.get(city)?.length || 0, 'articles')
      return cityArticlesCache.get(city) || []
    }

    // SPEED OPTIMIZATION: Always try file system first (not just build time)
    if (shouldUseFileSystemFirst() && fileArticlesModule) {
      console.log(`🚀 SPEED: Using file system as primary source for ${city} articles`)
      try {
        const fileArticles = await fileArticlesModule.getAllArticlesFromFile()

        // Filter file articles by city
        const filteredFileArticles = fileArticles.filter((article: any) => {
          const hasCityCategory = article.category?.toLowerCase().includes(city);
          const hasCityLocation = article.location?.toLowerCase().includes(city);
          const hasCityCategories = article.categories?.some((cat: string) =>
            cat.toLowerCase().includes(city)
          );
          const hasCityTags = article.tags?.some((tag: string) =>
            tag.toLowerCase().includes(city)
          );

          return hasCityCategory || hasCityLocation || hasCityCategories || hasCityTags;
        });

        if (filteredFileArticles.length > 0) {
          console.log(`✅ Found ${filteredFileArticles.length} ${city} articles in file system`)
          // Cache the filtered results
          cityArticlesCache.set(city, filteredFileArticles)
          cityCacheTimestamp.set(city, now)
          return filteredFileArticles
        }
      } catch (fileError) {
        console.warn(`⚠️ File system failed for ${city}, falling back to Supabase:`, fileError)
      }
    }

    // During build time, always use file system for reliability
    if (shouldUseFileSystem()) {
      console.log(`Build time detected, using file system for ${city} articles`)
      const fileArticles = await fileArticlesModule ? await fileArticlesModule.getAllArticlesFromFile() : []

      // Filter file articles by city
      const filteredFileArticles = fileArticles.filter((article: any) => {
        const hasCityCategory = article.category?.toLowerCase().includes(city);
        const hasCityLocation = article.location?.toLowerCase().includes(city);
        const hasCityCategories = article.categories?.some((cat: string) =>
          cat.toLowerCase().includes(city)
        );
        const hasCityTags = article.tags?.some((tag: string) =>
          tag.toLowerCase().includes(city)
        );

        return hasCityCategory || hasCityLocation || hasCityCategories || hasCityTags;
      });

      if (filteredFileArticles.length > 0) {
        console.log(`Found ${filteredFileArticles.length} ${city} articles in file system`)
        // Cache the filtered results
        cityArticlesCache.set(city, filteredFileArticles)
        cityCacheTimestamp.set(city, now)
        return filteredFileArticles
      }
    }

    // Try to use homepage cache as fallback
    if (articlesCache && (now - cacheTimestamp) < getCacheDuration()) {
      console.log(`Using homepage cache to filter ${city} articles`)
      const filteredFromHomepage = articlesCache.filter((article: any) => {
        const hasCityCategory = article.category?.toLowerCase().includes(city);
        const hasCityLocation = article.location?.toLowerCase().includes(city);
        const hasCityCategories = article.categories?.some((cat: string) =>
          cat.toLowerCase().includes(city)
        );
        const hasCityTags = article.tags?.some((tag: string) =>
          tag.toLowerCase().includes(city)
        );

        return hasCityCategory || hasCityLocation || hasCityCategories || hasCityTags;
      });

      if (filteredFromHomepage.length > 0) {
        console.log(`Found ${filteredFromHomepage.length} ${city} articles from homepage cache`)
        // Cache the filtered results
        cityArticlesCache.set(city, filteredFromHomepage)
        cityCacheTimestamp.set(city, now)
        return filteredFromHomepage
      }
    }

    console.log('Environment check:', {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      VERCEL_ENV: process.env.VERCEL_ENV,
      shouldUseFileSystem: shouldUseFileSystem(),
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'using fallback',
      supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'set' : 'using fallback'
    })

    if (!supabase) {
      console.error('Supabase client is not initialized')
      console.log('Falling back to file system')
      const fileArticles = await fileArticlesModule ? await fileArticlesModule.getAllArticlesFromFile() : []

      // Filter file articles by city
      const filteredFileArticles = fileArticles.filter((article: any) => {
        const hasCityCategory = article.category?.toLowerCase().includes(city);
        const hasCityLocation = article.location?.toLowerCase().includes(city);
        const hasCityCategories = article.categories?.some((cat: string) =>
          cat.toLowerCase().includes(city)
        );
        const hasCityTags = article.tags?.some((tag: string) =>
          tag.toLowerCase().includes(city)
        );

        return hasCityCategory || hasCityLocation || hasCityCategories || hasCityTags;
      });

      console.log(`Supabase fallback: Found ${filteredFileArticles.length} ${city} articles out of ${fileArticles.length} total`)
      return filteredFileArticles
    }

    console.log(`Attempting to fetch ${city} articles from Supabase...`)

    // Optimized query for city pages - only essential fields for display
    const fields = ensureImageFields('id, title, excerpt, category, categories, tags, type, location, created_at, trending_home, trending_edmonton, trending_calgary, featured_home, featured_edmonton, featured_calgary')

    const supabasePromise = supabase
      .from('articles')
      .select(fields)
      .or(`category.ilike.%${city}%,location.ilike.%${city}%,title.ilike.%${city}%`)
      .order('created_at', { ascending: false })
      .limit(500) // All articles for city pages

    const { data, error } = await Promise.race([
      supabasePromise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Supabase timeout')), getProductionCacheSettings().timeoutDuration * 1.5) // Dynamic timeout based on environment
      )
    ]) as any

    if (error) {
      console.warn(`Supabase ${city} query failed:`, error.message)
      console.log('Falling back to file system')
      return fileArticlesModule ? await fileArticlesModule.getAllArticlesFromFile() : []
    }

    console.log(`Successfully fetched ${city} articles from Supabase:`, data?.length || 0, 'articles')

    // Map Supabase data to match our Article interface
    const mappedArticles = (data || []).map((article: any) => {
      // BANDWIDTH FIX: Only use image_url, skip base64 data
      let imageUrl = article.image_url
      if (imageUrl && imageUrl.startsWith('data:')) {
        console.warn(`⚠️ Skipping base64 image for ${city} article: "${article.title}"`)
        imageUrl = undefined
      }

      return {
        ...article,
        imageUrl,
        date: article.created_at,
        trendingHome: article.trending_home || false,
        trendingEdmonton: article.trending_edmonton || false,
        trendingCalgary: article.trending_calgary || false,
        featuredHome: article.featured_home || false,
        featuredEdmonton: article.featured_edmonton || false,
        featuredCalgary: article.featured_calgary || false
      }
    })

    // Additional client-side filtering to ensure we get the right city articles
    const filteredArticles = mappedArticles.filter((article: any) => {
      const hasCityCategory = article.category?.toLowerCase().includes(city);
      const hasCityLocation = article.location?.toLowerCase().includes(city);
      const hasCityCategories = article.categories?.some((cat: string) =>
        cat.toLowerCase().includes(city)
      );
      const hasCityTags = article.tags?.some((tag: string) =>
        tag.toLowerCase().includes(city)
      );

      return hasCityCategory || hasCityLocation || hasCityCategories || hasCityTags;
    });

    console.log(`Filtered ${city} articles:`, filteredArticles.length, 'out of', mappedArticles.length, 'total articles')

    // Update cache
    cityArticlesCache.set(city, filteredArticles)
    cityCacheTimestamp.set(city, now)
    console.log(`Updated ${city} articles cache`)

    return filteredArticles
  } catch (error) {
    console.warn(`Supabase ${city} connection failed:`, error)
    console.log('Falling back to file system')
    const fileArticles = await fileArticlesModule ? await fileArticlesModule.getAllArticlesFromFile() : []

    // Filter file articles by city as well
    const filteredFileArticles = fileArticles.filter((article: any) => {
      const hasCityCategory = article.category?.toLowerCase().includes(city);
      const hasCityLocation = article.location?.toLowerCase().includes(city);
      const hasCityCategories = article.categories?.some((cat: string) =>
        cat.toLowerCase().includes(city)
      );
      const hasCityTags = article.tags?.some((tag: string) =>
        tag.toLowerCase().includes(city)
      );

      return hasCityCategory || hasCityLocation || hasCityCategories || hasCityTags;
    });

    console.log(`File system fallback: Found ${filteredFileArticles.length} ${city} articles out of ${fileArticles.length} total`)
    return filteredFileArticles
  }
}

// SPEED OPTIMIZED: All articles with file system priority
export async function getAllArticles(): Promise<Article[]> {
  try {
    console.log('=== getAllArticles called ===')

    const now = Date.now()
    if (articlesCache && (now - cacheTimestamp) < getCacheDuration()) {
      return articlesCache
    }

    // SPEED OPTIMIZATION: Always try file system first (not just build time)
    if (shouldUseFileSystemFirst() && fileArticlesModule) {
      console.log('🚀 SPEED: Using file system as primary source')
      try {
        const fileArticles = await fileArticlesModule.getAllArticlesFromFile()
        console.log('✅ Found articles in file system:', fileArticles.length, 'articles')

        // Update cache with file system data
        articlesCache = fileArticles
        cacheTimestamp = now
        return fileArticles
      } catch (fileError) {
        console.warn('⚠️ File system failed, falling back to Supabase:', fileError)
      }
    }

    // During build time, always use file system for reliability
    if (shouldUseFileSystem()) {
      console.log('Build time detected, using file system')
      const fileArticles = await fileArticlesModule ? await fileArticlesModule.getAllArticlesFromFile() : []
      console.log('Found articles in file system:', fileArticles.length, 'articles')

      // Update cache with file system data
      articlesCache = fileArticles
      cacheTimestamp = now
      return fileArticles
    }

    if (!supabase) {
      console.error('Supabase client is not initialized')
      console.log('Falling back to file system')
      return fileArticlesModule ? await fileArticlesModule.getAllArticlesFromFile() : []
    }

    console.log('⚡ FAST: Attempting to fetch articles from Supabase (NO CONTENT)...')

    const timeoutDuration = process.env.NODE_ENV === 'development' ? 1500 : 5000
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Supabase timeout')), timeoutDuration)
    )

    // SPEED: Don't fetch 'content' field - only metadata for listing pages
    const fields = ensureImageFields('id, title, excerpt, category, categories, location, author, tags, type, status, created_at, updated_at, trending_home, trending_edmonton, trending_calgary, featured_home, featured_edmonton, featured_calgary')

    const supabasePromise = supabase
      .from('articles')
      .select(fields)
      .order('created_at', { ascending: false })
      .limit(500) // Raised cap to accommodate growth beyond 200 articles

    const { data, error } = await Promise.race([
      supabasePromise,
      timeoutPromise
    ]) as any

    if (error) {
      console.warn('Supabase query failed:', error.message)

      // If we have cached data, return it instead of falling back to file system
      if (articlesCache) {
        console.log('Using cached articles due to Supabase error')
        return articlesCache!
      }

      console.log('No cache available, falling back to file system')
      return fileArticlesModule ? await fileArticlesModule.getAllArticlesFromFile() : []
    }

    console.log('Successfully fetched articles from Supabase:', data?.length || 0, 'articles')
    console.log('Sample article from Supabase:', data?.[0] ? {
      id: data[0].id,
      title: data[0].title,
      featured_home: data[0].featured_home,
      featured_edmonton: data[0].featured_edmonton,
      featured_calgary: data[0].featured_calgary
    } : 'No articles')

    // Normalize categories: Supabase may return string, JSON string, or array
    const normalizeCategories = (val: unknown): string[] => {
      if (Array.isArray(val)) return val.map((c) => String(c || '').trim()).filter(Boolean)
      if (typeof val === 'string') {
        try {
          const parsed = JSON.parse(val)
          return Array.isArray(parsed) ? parsed.map((c: unknown) => String(c || '').trim()).filter(Boolean) : [val.trim()].filter(Boolean)
        } catch {
          return val.trim() ? [val.trim()] : []
        }
      }
      return []
    }

    // Map Supabase data to match our Article interface
    const mappedArticles = (data || []).map((article: any) => {
      // REMOVED: Content size limit that was truncating articles
      // Articles should show full content, not be artificially limited
      let content = article.content || ''
      const categories = normalizeCategories(article.categories)

      return {
        ...article,
        category: article.category || (categories[0] ?? ''),
        categories: categories.length > 0 ? categories : (article.category ? [article.category] : []),
        content: content, // Use full content without truncation
        imageUrl: validateImageUrl(article.image_url || article.image, article.title), // Map 'image_url' or 'image' column to 'imageUrl'
        date: article.created_at, // Map 'created_at' to 'date' for compatibility
        // Map trending flags from database columns to interface properties
        trendingHome: article.trending_home || false,
        trendingEdmonton: article.trending_edmonton || false,
        trendingCalgary: article.trending_calgary || false,
        featuredHome: article.featured_home || false,
        featuredEdmonton: article.featured_edmonton || false,
        featuredCalgary: article.featured_calgary || false
      }
    })

    console.log('Mapped articles with featured flags:', mappedArticles.map((a: any) => ({
      id: a.id,
      title: a.title,
      featuredEdmonton: a.featuredEdmonton
    })))

    articlesCache = mappedArticles
    cacheTimestamp = now

    return mappedArticles
  } catch (error) {
    console.warn('Supabase connection failed:', error)

    // If we have cached data, return it instead of falling back to file system
    if (articlesCache) {
      console.log('Using cached articles due to connection error')
      return articlesCache
    }

    console.log('No cache available, falling back to file system')
    return fileArticlesModule ? await fileArticlesModule.getAllArticlesFromFile() : []
  }
}

// Function to clear cache (useful for admin operations)
export function clearArticlesCache() {
  articlesCache = null
  cacheTimestamp = 0
  cityArticlesCache.clear()
  cityCacheTimestamp.clear()

  // Also clear any Next.js cache for the homepage
  if (typeof window === 'undefined') {
    try {
      // Clear Next.js cache for homepage
      const { revalidatePath } = require('next/cache')
      revalidatePath('/')
      console.log('✅ Cleared Next.js cache for homepage')
    } catch (error) {
      console.log('⚠️ Could not clear Next.js cache:', error)
    }
  }

  console.log('Articles cache cleared (including city cache)')
}

// Development helper to test image field safeguards
export function testImageFieldSafeguards() {
  if (process.env.NODE_ENV !== 'development') {
    console.log('Image field safeguards test only available in development')
    return
  }

  console.log('🧪 Testing image field safeguards...')

  // Test ensureImageFields function
  const testFields1 = 'id, title, excerpt'
  const result1 = ensureImageFields(testFields1)
  console.log('Test 1 - Missing both fields:', result1)

  const testFields2 = 'id, title, image_url, excerpt'
  const result2 = ensureImageFields(testFields2)
  console.log('Test 2 - Missing image field:', result2)

  const testFields3 = 'id, title, image_url, image, excerpt'
  const result3 = ensureImageFields(testFields3)
  console.log('Test 3 - Both fields present:', result3)

  // Test validateImageUrl function
  console.log('Test 4 - Valid image URL:', validateImageUrl('data:image/jpeg;base64,/9j/4AAQ...', 'Test Article'))
  console.log('Test 5 - Null image URL:', validateImageUrl(null, 'Test Article'))
  console.log('Test 6 - Empty image URL:', validateImageUrl('', 'Test Article'))

  console.log('✅ Image field safeguards test completed')
}


// New optimized function to get article by slug (title-based URL)
export async function getArticleBySlug(slug: string): Promise<Article | null> {
  try {
    console.log('=== getArticleBySlug called for:', slug)

    // The optimized fallback is bundled with the deployment and covers recent/live article URLs.
    // Checking it first prevents public article pages from depending entirely on Supabase slug state.
    const fallbackArticle = await getArticleFromOptimizedFallbackBySlug(slug)
    if (fallbackArticle) {
      console.log('✅ OPTIMIZED FALLBACK: Found article by generated title slug:', fallbackArticle.title)
      return fallbackArticle
    }

    // FAST PATH: Direct indexed slug lookup — single row, no scanning
    if (supabase) {
      try {
        const fields = ensureImageFields('id, title, excerpt, category, categories, location, author, tags, type, status, created_at, updated_at, trending_home, trending_edmonton, trending_calgary, featured_home, featured_edmonton, featured_calgary, slug')
        const { data, error } = await Promise.race([
          supabase.from('articles').select(fields).eq('slug', slug).single(),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
        ]) as any

        if (!error && data) {
          console.log('✅ FAST PATH: Found article by slug index:', data.title)
          return {
            ...data,
            imageUrl: validateImageUrl(data.image_url || data.image, data.title),
            date: data.created_at,
            trendingHome: data.trending_home || false,
            trendingEdmonton: data.trending_edmonton || false,
            trendingCalgary: data.trending_calgary || false,
            featuredHome: data.featured_home || false,
            featuredEdmonton: data.featured_edmonton || false,
            featuredCalgary: data.featured_calgary || false,
          }
        }
        if (error && error.code !== 'PGRST116') {
          // PGRST116 = no rows found, which is expected — anything else log it
          console.warn('⚠️ Slug index lookup error:', error.message)
        }
        if (!data) {
          console.log('ℹ️ Article not found by slug index, trying legacy scan...')
        }
      } catch (fastErr) {
        console.warn('⚠️ Fast slug lookup failed, falling back:', fastErr instanceof Error ? fastErr.message : fastErr)
      }
    }

    // Some older articles were published before the slug column was reliably populated.
    // Search by the words in the title-derived URL before falling back to capped scans.
    if (supabase) {
      try {
        const fields = ensureImageFields('id, title, excerpt, category, categories, location, author, tags, type, status, created_at, updated_at, trending_home, trending_edmonton, trending_calgary, featured_home, featured_edmonton, featured_calgary, slug')
        const titlePattern = buildTitleSearchPattern(slug)
        const { data, error } = await Promise.race([
          supabase
            .from('articles')
            .select(fields)
            .ilike('title', titlePattern)
            .limit(25),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
        ]) as any

        if (!error && data && data.length > 0) {
          const exactTitleSlugMatch = data.find((article: any) => createSlug(article.title) === slug.toLowerCase())
          if (exactTitleSlugMatch) {
            console.log('✅ TITLE SEARCH: Found article by generated title slug:', exactTitleSlugMatch.title)
            return mapArticleRow(exactTitleSlugMatch)
          }
        } else if (error) {
          console.warn('⚠️ Title search lookup error:', error.message)
        }
      } catch (titleSearchErr) {
        console.warn('⚠️ Title search lookup failed, falling back:', titleSearchErr instanceof Error ? titleSearchErr.message : titleSearchErr)
      }
    }

    // LEGACY FALLBACK: full-table scan (kept for safety during transition)
    console.log('🔄 CACHE BUST: Forcing fresh lookup for slug:', slug)
    console.log('🌍 Environment:', process.env.NODE_ENV)
    console.log('🔗 Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT SET')
    console.log('🔑 Supabase Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET')
    console.log('📡 Supabase client:', supabase ? 'INITIALIZED' : 'NOT INITIALIZED')

    // CRITICAL FIX: For article lookups, prioritize Supabase over file system
    // because file system might not have the latest articles
    if (!supabase) {
      console.error('❌ CRITICAL ERROR: Supabase client is not initialized')
      console.error('Environment variables check:')
      console.error('- NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
      console.error('- NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET')

      // EMERGENCY FALLBACK: Create Supabase client directly
      console.log('🚨 EMERGENCY FALLBACK: Creating Supabase client directly')
      try {
        const { createClient } = await import('@supabase/supabase-js')
        const emergencySupabase = createClient(
          'https://itdmwpbsnviassgqfhxk.supabase.co',
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0ZG13cGJzbnZpYXNzZ3FmaHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0ODU5NjUsImV4cCI6MjA2OTA2MTk2NX0.pxAXREQJrXJFZEBB3s7iwfm3rV_C383EbWCwf6ayPQo'
        )

        console.log('✅ Emergency Supabase client created successfully')

        // Use emergency client to fetch articles (exclude content to avoid timeout)
        const { data, error } = await emergencySupabase
          .from('articles')
          .select('id, title, excerpt, category, categories, location, author, tags, type, status, created_at, updated_at, trending_home, trending_edmonton, trending_calgary, featured_home, featured_edmonton, featured_calgary, image_url, image')
          .order('created_at', { ascending: false })
          .limit(500)

        if (error) {
          console.error('Emergency Supabase query failed:', error)
          throw error
        }

        if (!data || data.length === 0) {
          console.log('No articles found in emergency query')
          return null
        }

        // Find exact match by converting article titles to slugs
        const exactMatch = data.find((article: any) => {
          const articleUrlTitle = article.title
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '')
            .substring(0, 100)

          const isMatch = articleUrlTitle === slug.toLowerCase()
          if (isMatch) {
            console.log(`✅ EMERGENCY: Found exact match for slug "${slug}": "${article.title}" -> "${articleUrlTitle}"`)
          }
          return isMatch
        })

        if (exactMatch) {
          console.log('✅ EMERGENCY: Successfully fetched article using emergency client')
          return {
            ...exactMatch,
            imageUrl: exactMatch.image_url || exactMatch.image,
            date: exactMatch.created_at,
            trendingHome: exactMatch.trending_home || false,
            trendingEdmonton: exactMatch.trending_edmonton || false,
            trendingCalgary: exactMatch.trending_calgary || false,
            featuredHome: exactMatch.featured_home || false,
            featuredEdmonton: exactMatch.featured_edmonton || false,
            featuredCalgary: exactMatch.featured_calgary || false,
          }
        }

        console.log('No exact match found in emergency query')
        return null

      } catch (emergencyError) {
        console.error('Emergency Supabase client creation failed:', emergencyError)
        console.log('Falling back to file system')
        const fileArticles = await fileArticlesModule ? await fileArticlesModule.getAllArticlesFromFile() : []
        return fileArticles.find((article: any) => {
          const articleUrlTitle = article.title
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '')
            .substring(0, 100)

          return articleUrlTitle === slug.toLowerCase()
        }) || null
      }
    }

    console.log('Attempting to fetch article by slug from Supabase...')

    // SMART FALLBACK: Try Supabase first, fallback to file system if slow
    const timeoutDuration = 5000 // 5 seconds - allow time to fetch full article list

    console.log('🚀 SMART FALLBACK: Trying Supabase first, file system fallback if slow')

    // Try Supabase with timeout
    try {
      // Exclude content column to avoid statement timeout (content is lazily fetched by ID later)
      const fields = ensureImageFields('id, title, excerpt, category, categories, location, author, tags, type, status, created_at, updated_at, trending_home, trending_edmonton, trending_calgary, featured_home, featured_edmonton, featured_calgary')

      const supabasePromise = supabase
        .from('articles')
        .select(fields)
        .order('created_at', { ascending: false })
        .limit(500)

      const { data, error } = await Promise.race([
        supabasePromise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Supabase timeout')), timeoutDuration)
        )
      ]) as any

      if (error) {
        throw new Error(`Supabase error: ${error.message}`)
      }

      if (!data || data.length === 0) {
        throw new Error('No articles found in Supabase')
      }

      // Find exact match by converting article titles to slugs
      const exactMatch = data.find((article: any) => {
        const articleUrlTitle = article.title
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '')
          .substring(0, 100)

        const isMatch = articleUrlTitle === slug.toLowerCase()
        if (isMatch) {
          console.log(`✅ SUPABASE: Found exact match for slug "${slug}": "${article.title}"`)
        }
        return isMatch
      })

      // If no exact match, try slug-based partial matching for better compatibility
      if (!exactMatch) {
        console.log(`⚠️ SUPABASE: No exact match found, trying partial matching for slug: "${slug}"`)
        const partialMatch = data.find((article: any) => {
          const articleGeneratedSlug = article.title
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '')
            .substring(0, 100)

          // Only match if the requested slug contains the article's slug (not the reverse)
          // This prevents "...-gale-again" from matching when looking for "...-gale"
          const isPartialMatch = slug.toLowerCase().includes(articleGeneratedSlug.toLowerCase()) &&
            articleGeneratedSlug.length >= slug.length * 0.8

          if (isPartialMatch) {
            console.log(`✅ SUPABASE: Found partial match for slug "${slug}": "${article.title}"`)
          }

          return isPartialMatch
        })

        if (partialMatch) {
          console.log(`✅ SUPABASE: Using partial match for slug "${slug}"`)
          return {
            ...partialMatch,
            imageUrl: validateImageUrl(partialMatch.image_url || partialMatch.image, partialMatch.title),
            date: partialMatch.created_at,
            trendingHome: partialMatch.trending_home || false,
            trendingEdmonton: partialMatch.trending_edmonton || false,
            trendingCalgary: partialMatch.trending_calgary || false,
            featuredHome: partialMatch.featured_home || false,
            featuredEdmonton: partialMatch.featured_edmonton || false,
            featuredCalgary: partialMatch.featured_calgary || false,
          }
        }
      }

      if (exactMatch) {
        console.log('✅ SUPABASE: Successfully fetched article from Supabase')
        return {
          ...exactMatch,
          imageUrl: validateImageUrl(exactMatch.image_url || exactMatch.image, exactMatch.title),
          date: exactMatch.created_at,
          trendingHome: exactMatch.trending_home || false,
          trendingEdmonton: exactMatch.trending_edmonton || false,
          trendingCalgary: exactMatch.trending_calgary || false,
          featuredHome: exactMatch.featured_home || false,
          featuredEdmonton: exactMatch.featured_edmonton || false,
          featuredCalgary: exactMatch.featured_calgary || false,
        }
      }

      throw new Error('Article not found in Supabase')

    } catch (supabaseError) {
      console.log('⚠️ SUPABASE: Failed or slow, falling back to file system:', supabaseError instanceof Error ? supabaseError.message : String(supabaseError))

      // FALLBACK: Try file system
      try {
        const fileArticles = await fileArticlesModule ? await fileArticlesModule.getAllArticlesFromFile() : []
        // First try exact match
        let fileArticle = fileArticles.find((article: any) => {
          const articleUrlTitle = article.title
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '')
            .substring(0, 100)

          return articleUrlTitle === slug.toLowerCase()
        })

        // If no exact match, try partial matching
        if (!fileArticle) {
          console.log(`⚠️ FILE SYSTEM: No exact match found, trying partial matching for slug: "${slug}"`)
          fileArticle = fileArticles.find((article: any) => {
            const articleTitle = article.title.toLowerCase()
            const slugWords = slug.toLowerCase().split('-')

            // Check if most words from the slug appear in the title
            const matchingWords = slugWords.filter(word =>
              articleTitle.includes(word) ||
              articleTitle.includes(word.replace(/s$/, '')) // Handle plurals
            )

            const matchPercentage = matchingWords.length / slugWords.length
            const isPartialMatch = matchPercentage >= 0.7 // 70% word match

            if (isPartialMatch) {
              console.log(`✅ FILE SYSTEM: Found partial match (${Math.round(matchPercentage * 100)}%) for slug "${slug}": "${article.title}"`)
            }

            return isPartialMatch
          })
        }

        if (fileArticle) {
          console.log(`✅ FILE SYSTEM: Found article in file system for slug "${slug}": "${fileArticle.title}"`)
          return {
            ...fileArticle,
            imageUrl: fileArticle.image_url || fileArticle.image,
            date: fileArticle.created_at,
            trendingHome: fileArticle.trending_home || false,
            trendingEdmonton: fileArticle.trending_edmonton || false,
            trendingCalgary: fileArticle.trending_calgary || false,
            featuredHome: fileArticle.featured_home || false,
            featuredEdmonton: fileArticle.featured_edmonton || false,
            featuredCalgary: fileArticle.featured_calgary || false,
          }
        }

        console.log('❌ FILE SYSTEM: Article not found in file system either')
        return null

      } catch (fileError) {
        console.error('❌ FILE SYSTEM: Error reading file system:', fileError)
        return null
      }
    }
  } catch (error) {
    console.error('❌ CRITICAL ERROR in getArticleBySlug:', error)
    return null
  }
}

// SPEED OPTIMIZED: Get article by ID with file system priority
export async function getArticleById(id: string): Promise<Article | null> {
  try {
    console.log('=== getArticleById called for:', id)
    console.log('🔍 Environment check:', {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      window: typeof window !== 'undefined',
      shouldUseFileSystemFirst: shouldUseFileSystemFirst(),
      fileArticlesModule: !!fileArticlesModule
    })

    // SPEED OPTIMIZATION: Check individual article cache first
    if (articleCache.has(id)) {
      console.log('✅ Returning cached article:', id)
      return articleCache.get(id) || null
    }

    // SPEED OPTIMIZATION: Always try file system first (not just build time)
    if (shouldUseFileSystemFirst() && fileArticlesModule) {
      console.log('🚀 SPEED: Using file system as primary source for article by ID')
      try {
        const fileArticle = await fileArticlesModule.getArticleByIdFromFile(id)
        if (fileArticle) {
          console.log('✅ Found article in file system:', id)
          articleCache.set(id, fileArticle)
          return fileArticle
        } else {
          console.log('❌ Article not found in file system:', id)
        }
      } catch (fileError) {
        console.warn('⚠️ File system failed for article by ID, falling back to Supabase:', fileError)
      }
    } else {
      console.log('⚠️ Skipping file system check:', {
        shouldUseFileSystemFirst: shouldUseFileSystemFirst(),
        fileArticlesModule: !!fileArticlesModule
      })
    }

    // During build time, always use file system for reliability
    if (shouldUseFileSystem()) {
      console.log('Build time detected, using file system')
      return fileArticlesModule?.getArticleByIdFromFile(id)
    }

    if (!supabase) {
      console.error('Supabase client is not initialized')
      console.log('Falling back to file system')
      return fileArticlesModule?.getArticleByIdFromFile(id)
    }

    console.log('Attempting to fetch article from Supabase...')

    // Use a longer timeout in development for full-article content fetches.
    const timeoutDuration = process.env.NODE_ENV === 'development' ? 4500 : 2000
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Supabase timeout')), timeoutDuration)
    )

    const supabasePromise = supabase
      .from('articles')
      .select('*')
      .eq('id', id)
      .limit(1)

    const { data, error } = await Promise.race([
      supabasePromise,
      timeoutPromise
    ]) as any

    if (error) {
      console.warn('Supabase query failed for article:', id, error.message)

      // Try to get from all articles cache first
      if (articlesCache) {
        const cachedArticle = articlesCache.find(a => a.id === id)
        if (cachedArticle) {
          console.log('Found article in all articles cache:', id)
          articleCache.set(id, cachedArticle)
          return cachedArticle
        }
      }

      console.log('Falling back to file system')
      return fileArticlesModule?.getArticleByIdFromFile(id)
    }

    if (!data || data.length === 0) {
      console.log('Article not found in Supabase:', id)
      return null
    }

    // Get the first article (in case of duplicates)
    const articleData = Array.isArray(data) ? data[0] : data

    console.log('Successfully fetched article from Supabase:', id)

    // Map Supabase data to match our Article interface
    const mappedArticle = {
      ...articleData,
      imageUrl: validateImageUrl(articleData.image_url || articleData.image, articleData.title),
      date: articleData.created_at,
      trendingHome: articleData.trending_home || false,
      trendingEdmonton: articleData.trending_edmonton || false,
      trendingCalgary: articleData.trending_calgary || false,
      featuredHome: articleData.featured_home || false,
      featuredEdmonton: articleData.featured_edmonton || false,
      featuredCalgary: articleData.featured_calgary || false
    }

    // Cache the individual article
    articleCache.set(id, mappedArticle)
    console.log('Cached individual article:', id)

    return mappedArticle
  } catch (error) {
    console.warn('Supabase connection failed for article:', id, error)

    // Try to get from all articles cache first
    if (articlesCache) {
      const cachedArticle = articlesCache.find(a => a.id === id)
      if (cachedArticle) {
        console.log('Found article in all articles cache:', id)
        articleCache.set(id, cachedArticle)
        return cachedArticle
      }
    }

    console.log('Falling back to file system')
    return fileArticlesModule?.getArticleByIdFromFile(id)
  }
}

export async function createArticle(article: CreateArticleInput): Promise<Article> {
  console.log('=== createArticle called ===')
  console.log('Supabase client:', !!supabase)
  console.log('Article input:', article)

  try {
    // Admin operations should always use Supabase
    if (shouldUseSupabaseForAdmin()) {
      console.log('Admin create operation detected, using Supabase')
    }

    if (!supabase) {
      console.error('Supabase client is not initialized, using file fallback')
      return fileArticlesModule?.createArticleInFile(article)
    }

    console.log('Creating article in Supabase:', { title: article.title, category: article.category })

    // Generate a unique ID for the article and map fields to match Supabase schema
    const articleWithId = {
      id: `article-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: article.title,
      content: article.content,
      excerpt: article.excerpt,
      category: article.category,
      categories: article.categories || [article.category], // Add support for multiple categories
      location: article.location,
      author: article.author,
      tags: article.tags || [], // Add tags field
      type: article.type || 'article',
      status: article.status || 'published',
      image_url: article.imageUrl, // Map imageUrl to image_url column
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      // Add trending flags
      trending_home: article.trendingHome || false,
      trending_edmonton: article.trendingEdmonton || false,
      trending_calgary: article.trendingCalgary || false,
      featured_home: article.featuredHome || false,
      featured_edmonton: article.featuredEdmonton || false,
      featured_calgary: article.featuredCalgary || false
    }

    console.log('Article with ID:', articleWithId)

    let data, error: any
    try {
      console.log('Making Supabase insert request...')
      const result = await supabase
        .from('articles')
        .insert([articleWithId])
        .select()
        .single()

      console.log('Supabase insert result:', result)
      data = result.data
      error = result.error
    } catch (supabaseError) {
      console.error('Supabase insert threw an exception:', supabaseError)
      error = supabaseError
    }

    if (error) {
      console.error('Error creating article in Supabase:', {
        message: error.message || 'Unknown error',
        details: error.details || 'No details',
        hint: error.hint || 'No hint',
        code: error.code || 'No code',
        fullError: error,
        errorType: typeof error,
        errorKeys: Object.keys(error),
        errorStringified: JSON.stringify(error, null, 2)
      })
      console.log('Falling back to file system...')
      return fileArticlesModule?.createArticleInFile(article)
    }

    console.log('Article created successfully in Supabase:', data)
    // Clear cache to ensure fresh data
    clearArticlesCache()
    // Force immediate cache refresh for admin
    articlesCache = null
    cacheTimestamp = 0
    // Invalidate homepage cache so it shows the new article immediately
    invalidateHomepageCache()

    // Update optimized fallback with the new article
    try {
      console.log('🔄 Updating optimized fallback with new article...')
      const { updateOptimizedFallback } = await import('./optimized-fallback')
      const { loadOptimizedFallback } = await import('./optimized-fallback')

      // Load current fallback articles
      const currentArticles = await loadOptimizedFallback()

      // Add the new article to the beginning
      const newArticle = {
        ...data,
        imageUrl: data.image_url,
        date: data.created_at,
        trendingHome: data.trending_home || false,
        trendingEdmonton: data.trending_edmonton || false,
        trendingCalgary: data.trending_calgary || false,
        featuredHome: data.featured_home || false,
        featuredEdmonton: data.featured_edmonton || false,
        featuredCalgary: data.featured_calgary || false,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      }

      // Add new article to beginning and update fallback
      const updatedArticles = [newArticle, ...currentArticles]
      await updateOptimizedFallback(updatedArticles)
      console.log('✅ Optimized fallback updated with new article')
    } catch (fallbackError) {
      console.warn('⚠️ Failed to update optimized fallback:', fallbackError)
      // Don't fail the creation if fallback update fails
    }

    // Automatically sync to local file after successful creation
    try {
      console.log('🔄 Auto-syncing to local file after creation...')
      await fetch('/api/sync-articles', { method: 'POST' })
      console.log('✅ Auto-sync completed successfully')
    } catch (syncError) {
      console.warn('⚠️ Auto-sync failed, but Supabase creation was successful:', syncError)
      // Don't fail the creation if sync fails
    }

    return data
  } catch (error) {
    console.error('Supabase insert failed, using file fallback:', error)
    return fileArticlesModule?.createArticleInFile(article)
  }
}

export async function updateArticle(id: string, article: UpdateArticleInput): Promise<Article> {
  try {
    console.log('=== updateArticle called ===')
    console.log('Article ID:', id)
    console.log('Update data:', article)

    // Admin operations should always use Supabase
    if (shouldUseSupabaseForAdmin()) {
      console.log('Admin update operation detected, using Supabase')
    }

    if (!supabase) {
      console.error('Supabase client is not initialized, using file fallback')
      return fileArticlesModule?.updateArticleInFile(id, article)
    }

    // Map fields to match Supabase schema
    const updateData = {
      title: article.title,
      content: article.content,
      excerpt: article.excerpt,
      category: article.category,
      categories: article.categories, // Add support for multiple categories
      location: article.location,
      author: article.author,
      tags: article.tags, // Add tags field
      type: article.type,
      status: article.status,
      image_url: article.imageUrl, // Map imageUrl to image_url column
      updated_at: new Date().toISOString(),
      // Add trending flags
      trending_home: article.trendingHome,
      trending_edmonton: article.trendingEdmonton,
      trending_calgary: article.trendingCalgary,
      featured_home: article.featuredHome,
      featured_edmonton: article.featuredEdmonton,
      featured_calgary: article.featuredCalgary
    }

    console.log('Mapped update data for Supabase:', updateData)

    const { data, error } = await supabase
      .from('articles')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    console.log('Supabase update result:', { data, error })

    if (error) {
      console.error('Error updating article in Supabase:', {
        message: error?.message || 'Unknown error',
        details: error?.details || 'No details',
        hint: error?.hint || 'No hint',
        code: error?.code || 'No code',
        fullError: error || 'No error object',
        errorType: typeof error
      })
      return fileArticlesModule?.updateArticleInFile(id, article)
    }

    console.log('Article updated successfully in Supabase:', data)
    // Clear cache to ensure fresh data
    clearArticlesCache()
    // Force immediate cache refresh for admin
    articlesCache = null
    cacheTimestamp = 0
    // Invalidate homepage cache so it shows the updated article immediately
    invalidateHomepageCache()

    // Automatically sync to local file after successful update
    try {
      console.log('🔄 Auto-syncing to local file after update...')
      await fetch('/api/sync-articles', { method: 'POST' })
      console.log('✅ Auto-sync completed successfully')
    } catch (syncError) {
      console.warn('⚠️ Auto-sync failed, but Supabase update was successful:', syncError)
      // Don't fail the update if sync fails
    }

    return data
  } catch (error) {
    console.error('Supabase update failed, using file fallback:', {
      error: error instanceof Error ? error.message : error,
      fullError: error
    })
    return fileArticlesModule?.updateArticleInFile(id, article)
  }
}

export async function deleteArticle(id: string): Promise<void> {
  console.log('🗑️ Starting delete process for article:', {
    id,
    type: typeof id,
    length: id?.length,
    environment: process.env.NODE_ENV,
    vercel: process.env.VERCEL
  })

  // Admin operations should always use Supabase
  if (shouldUseSupabaseForAdmin()) {
    console.log('Admin delete operation detected, using Supabase')
  }

  // Check if we're in production (Vercel) or development
  const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1'
  console.log('🏗️ Environment check:', { isProduction, NODE_ENV: process.env.NODE_ENV, VERCEL: process.env.VERCEL })

  // Always try to delete from Supabase first (if available)
  if (supabase) {
    try {
      console.log('📡 Attempting to delete from Supabase...')
      console.log('📡 Supabase client available:', !!supabase)

      // First, let's check if the article exists
      console.log('🔍 Checking if article exists before deletion...')
      const { data: checkData, error: checkError } = await supabase
        .from('articles')
        .select('id, title')
        .eq('id', id)
        .limit(1)

      console.log('🔍 Article check result:', { checkData, checkError })

      if (!checkData || checkData.length === 0) {
        console.log('❌ Article not found in database:', id)
        throw new Error(`Article with ID ${id} not found in database`)
      }

      console.log('✅ Article found, proceeding with deletion:', checkData[0])

      const { data, error } = await supabase
        .from('articles')
        .delete()
        .eq('id', id)
        .select() // Add select to see what was deleted

      console.log('📡 Supabase delete response:', { data, error })

      if (error) {
        console.error('❌ Error deleting article from Supabase:', error)
        console.error('❌ Full Supabase error:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        throw error
      }

      console.log('✅ Successfully deleted from Supabase:', data)
      console.log('✅ Deleted records count:', data?.length || 0)

      // Clear cache to ensure fresh data
      clearArticlesCache()
      console.log('🧹 Cleared articles cache')
      // Invalidate homepage cache so it removes the deleted article immediately
      invalidateHomepageCache()

      if (isProduction) {
        // In production, trigger revalidation instead of file sync
        console.log('🚀 Production environment - triggering page revalidation')
        try {
          await fetch(`${process.env.VERCEL_URL || 'https://culturealberta.com'}/api/revalidate`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              paths: ['/', '/edmonton', '/calgary', '/food-drink', '/events']
            })
          })
          console.log('✅ Triggered revalidation for static pages')
        } catch (revalidateError) {
          console.warn('⚠️ Revalidation failed, but Supabase deletion was successful:', revalidateError)
        }
      } else {
        // In development, sync to local file
        try {
          console.log('🔄 Auto-syncing to local file after deletion...')
          // Use absolute URL for server-side fetch
          const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'
          await fetch(`${baseUrl}/api/sync-articles`, { method: 'POST' })
          console.log('✅ Auto-sync completed successfully')
        } catch (syncError) {
          console.warn('⚠️ Auto-sync failed, but Supabase deletion was successful:', syncError)
        }
      }

      return // Successfully deleted from Supabase
    } catch (error) {
      console.error('❌ Supabase deletion failed:', error)
      console.error('❌ Full deletion error:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack',
        error: error
      })
      console.log('🔄 Falling back to file deletion...')
    }
  } else {
    console.log('📡 Supabase not available, using file deletion')
    console.log('📡 Supabase client status:', !!supabase)
  }

  // Fallback to file deletion if Supabase is not available or failed (development only)
  if (!isProduction) {
    console.log('🔄 Using file deletion fallback')
    return fileArticlesModule?.deleteArticleFromFile(id)
  } else {
    console.error('❌ Cannot delete article: Supabase not available and file system is read-only in production')
    throw new Error('Cannot delete article: Supabase not available and file system is read-only in production')
  }
}

