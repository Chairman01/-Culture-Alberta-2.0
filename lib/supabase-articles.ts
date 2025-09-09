import { supabase } from './supabase'
import { Article, CreateArticleInput, UpdateArticleInput } from './types/article'
import { 
  getAllArticlesFromFile,
  getArticleByIdFromFile,
  createArticleInFile,
  updateArticleInFile,
  deleteArticleFromFile
} from './file-articles'
import { shouldUseFileSystem } from './build-config'
import { createSlug, generateUniqueSlug } from './utils/slug'

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
  
  console.warn('⚠️ Image fields were missing from query, automatically added them:', fields)
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
  
  // Log if we found an image URL for debugging (only in development)
  if (imageUrl && process.env.NODE_ENV === 'development') {
    console.log(`✅ Found image for "${articleTitle}": ${imageUrl.substring(0, 50)}${imageUrl.length > 50 ? '...' : ''}`)
  }
  
  return imageUrl
}

// Enhanced cache for articles to prevent multiple API calls
let articlesCache: Article[] | null = null
let articleCache: Map<string, Article> = new Map()
let cityArticlesCache: Map<string, Article[]> = new Map()
let cacheTimestamp: number = 0
let cityCacheTimestamp: Map<string, number> = new Map()
const CACHE_DURATION = 2 * 60 * 1000 // 2 minutes for faster updates

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

// Optimized function for homepage that only fetches essential fields
export async function getHomepageArticles(): Promise<Article[]> {
  try {
    console.log('=== getHomepageArticles called ===')
    
    // Check cache first
    const now = Date.now()
    if (articlesCache && (now - cacheTimestamp) < CACHE_DURATION) {
      console.log('Returning cached articles for homepage:', articlesCache.length, 'articles')
      return articlesCache
    }
    
    // During build time, always use file system for reliability
    if (shouldUseFileSystem()) {
      console.log('Build time detected, using file system')
      return getAllArticlesFromFile()
    }
    
    if (!supabase) {
      console.error('Supabase client is not initialized')
      console.log('Falling back to file system')
      return getAllArticlesFromFile()
    }

    console.log('Attempting to fetch homepage articles from Supabase...')
    
    // Optimized query for homepage - only essential fields
    const fields = ensureImageFields('id, title, slug, excerpt, category, created_at, trending_home, trending_edmonton, trending_calgary, featured_home, featured_edmonton, featured_calgary, type')
    
    const supabasePromise = supabase
      .from('articles')
      .select(fields)
      .order('created_at', { ascending: false })
      .limit(20) // Only fetch 20 most recent for homepage

    const { data, error } = await Promise.race([
      supabasePromise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Supabase timeout')), 2000) // Shorter timeout for homepage
      )
    ]) as any

    if (error) {
      console.warn('Supabase homepage query failed:', error.message)
      
      if (articlesCache) {
        console.log('Using cached articles for homepage due to Supabase error')
        return articlesCache
      }
      
      console.log('No cache available, falling back to file system')
      return getAllArticlesFromFile()
    }

    console.log('Successfully fetched homepage articles from Supabase:', data?.length || 0, 'articles')

    // Map Supabase data to match our Article interface
    const mappedArticles = (data || []).map((article: any) => ({
      ...article,
      imageUrl: validateImageUrl(article.image_url || article.image, article.title),
      date: article.created_at,
      trendingHome: article.trending_home || false,
      trendingEdmonton: article.trending_edmonton || false,
      trendingCalgary: article.trending_calgary || false,
      featuredHome: article.featured_home || false,
      featuredEdmonton: article.featured_edmonton || false,
      featuredCalgary: article.featured_calgary || false
    }))

    // Update cache
    articlesCache = mappedArticles
    cacheTimestamp = now
    console.log('Updated homepage articles cache')

    return mappedArticles
  } catch (error) {
    console.warn('Supabase homepage connection failed:', error)
    
    if (articlesCache) {
      console.log('Using cached articles for homepage due to connection error')
      return articlesCache
    }
    
    console.log('No cache available, falling back to file system')
    return getAllArticlesFromFile()
  }
}

// Optimized function for admin list that only fetches essential fields
export async function getAdminArticles(): Promise<Article[]> {
  try {
    console.log('=== getAdminArticles called ===')
    
    // During build time, always use file system for reliability
    if (shouldUseFileSystem()) {
      console.log('Build time detected, using file system')
      return getAllArticlesFromFile()
    }
    
    if (!supabase) {
      console.error('Supabase client is not initialized')
      console.log('Falling back to file system')
      return getAllArticlesFromFile()
    }

    console.log('Attempting to fetch admin articles from Supabase...')
    
    // Optimized query for admin - only essential fields for list view
    const supabasePromise = supabase
      .from('articles')
      .select('id, title, category, location, author, created_at, updated_at, status, type, featured_home, featured_edmonton, featured_calgary')
      .order('created_at', { ascending: false })
      .limit(100) // Limit to 100 most recent for admin

    const { data, error } = await Promise.race([
      supabasePromise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Supabase timeout')), 3000)
      )
    ]) as any

    if (error) {
      console.warn('Supabase admin query failed:', error.message)
      console.log('Falling back to file system')
      return getAllArticlesFromFile()
    }

    console.log('Successfully fetched admin articles from Supabase:', data?.length || 0, 'articles')

    // Map Supabase data to match our Article interface
    const mappedArticles = (data || []).map((article: any) => ({
      ...article,
      date: article.created_at,
      featuredHome: article.featured_home || false,
      featuredEdmonton: article.featured_edmonton || false,
      featuredCalgary: article.featured_calgary || false
    }))

    return mappedArticles
  } catch (error) {
    console.warn('Supabase admin connection failed:', error)
    console.log('Falling back to file system')
    return getAllArticlesFromFile()
  }
}

// Optimized function for events page
export async function getEventsArticles(): Promise<Article[]> {
  try {
    console.log('=== getEventsArticles called ===')
    
    // Check cache first
    const now = Date.now()
    const eventsCacheTime = cityCacheTimestamp.get('events') || 0
    if (cityArticlesCache.has('events') && (now - eventsCacheTime) < CACHE_DURATION) {
      console.log('Returning cached events articles:', cityArticlesCache.get('events')?.length || 0, 'articles')
      return cityArticlesCache.get('events') || []
    }
    
    // During build time, always use file system for reliability
    if (shouldUseFileSystem()) {
      console.log('Build time detected, using file system')
      const fileArticles = await getAllArticlesFromFile()
      
      // Filter file articles for events only
      const filteredFileArticles = fileArticles.filter((article: any) => 
        article.type === 'event'
      );
      
      console.log(`Build time: Found ${filteredFileArticles.length} events out of ${fileArticles.length} total`)
      return filteredFileArticles
    }
    
    if (!supabase) {
      console.error('Supabase client is not initialized')
      console.log('Falling back to file system')
      const fileArticles = await getAllArticlesFromFile()
      
      // Filter file articles for events only
      const filteredFileArticles = fileArticles.filter((article: any) => 
        article.type === 'event'
      );
      
      console.log(`Supabase fallback: Found ${filteredFileArticles.length} events out of ${fileArticles.length} total`)
      return filteredFileArticles
    }

    console.log('Attempting to fetch events articles from Supabase...')
    
    // Optimized query for events - only essential fields for display
    const fields = ensureImageFields('id, title, slug, excerpt, category, location, created_at, trending_home, trending_edmonton, trending_calgary, featured_home, featured_edmonton, featured_calgary')
    
    const supabasePromise = supabase
      .from('articles')
      .select(fields)
      .eq('type', 'event')
      .order('created_at', { ascending: false })
      .limit(30) // Reduced limit for faster loading

    const { data, error } = await Promise.race([
      supabasePromise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Supabase timeout')), 2000) // Reduced timeout to match homepage
      )
    ]) as any

    if (error) {
      console.warn('Supabase events query failed:', error.message)
      console.log('Falling back to file system')
      const fileArticles = await getAllArticlesFromFile()
      
      // Filter file articles for events only
      const filteredFileArticles = fileArticles.filter((article: any) => 
        article.type === 'event'
      );
      
      return filteredFileArticles
    }

    console.log('Successfully fetched events articles from Supabase:', data?.length || 0, 'articles')

    // Map Supabase data to match our Article interface
    const mappedArticles = (data || []).map((article: any) => ({
      ...article,
      imageUrl: validateImageUrl(article.image_url || article.image, article.title),
      date: article.created_at,
      trendingHome: article.trending_home || false,
      trendingEdmonton: article.trending_edmonton || false,
      trendingCalgary: article.trending_calgary || false,
      featuredHome: article.featured_home || false,
      featuredEdmonton: article.featured_edmonton || false,
      featuredCalgary: article.featured_calgary || false
    }))

    // Update cache
    cityArticlesCache.set('events', mappedArticles)
    cityCacheTimestamp.set('events', now)
    console.log('Updated events articles cache')

    return mappedArticles
  } catch (error) {
    console.warn('Supabase events connection failed:', error)
    console.log('Falling back to file system')
    const fileArticles = await getAllArticlesFromFile()
    
    // Filter file articles for events only
    const filteredFileArticles = fileArticles.filter((article: any) => 
      article.type === 'event'
    );
    
    console.log(`File system fallback: Found ${filteredFileArticles.length} events out of ${fileArticles.length} total`)
    return filteredFileArticles
  }
}

// Optimized function for city pages (Edmonton/Calgary)
export async function getCityArticles(city: 'edmonton' | 'calgary'): Promise<Article[]> {
  try {
    console.log(`=== getCityArticles called for ${city} ===`)
    
    // Check cache first
    const now = Date.now()
    const cityCacheTime = cityCacheTimestamp.get(city) || 0
    if (cityArticlesCache.has(city) && (now - cityCacheTime) < CACHE_DURATION) {
      console.log(`Returning cached ${city} articles:`, cityArticlesCache.get(city)?.length || 0, 'articles')
      return cityArticlesCache.get(city) || []
    }
    
    console.log('Environment check:', {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      VERCEL_ENV: process.env.VERCEL_ENV,
      shouldUseFileSystem: shouldUseFileSystem(),
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'using fallback',
      supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'set' : 'using fallback'
    })
    
    // During build time, always use file system for reliability
    if (shouldUseFileSystem()) {
      console.log('Build time detected, using file system')
      const fileArticles = await getAllArticlesFromFile()
      
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
      
      console.log(`Build time: Found ${filteredFileArticles.length} ${city} articles out of ${fileArticles.length} total`)
      return filteredFileArticles
    }
    
    if (!supabase) {
      console.error('Supabase client is not initialized')
      console.log('Falling back to file system')
      const fileArticles = await getAllArticlesFromFile()
      
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
    const fields = ensureImageFields('id, title, slug, excerpt, category, location, created_at, trending_home, trending_edmonton, trending_calgary, featured_home, featured_edmonton, featured_calgary')
    
    const supabasePromise = supabase
      .from('articles')
      .select(fields)
      .or(`category.ilike.%${city}%,location.ilike.%${city}%,title.ilike.%${city}%`)
      .order('created_at', { ascending: false })
      .limit(30) // Reduced limit for faster loading

    const { data, error } = await Promise.race([
      supabasePromise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Supabase timeout')), 10000) // Increased timeout for city pages
      )
    ]) as any

    if (error) {
      console.warn(`Supabase ${city} query failed:`, error.message)
      console.log('Falling back to file system')
      return getAllArticlesFromFile()
    }

    console.log(`Successfully fetched ${city} articles from Supabase:`, data?.length || 0, 'articles')

    // Map Supabase data to match our Article interface
    const mappedArticles = (data || []).map((article: any) => ({
      ...article,
      imageUrl: validateImageUrl(article.image_url || article.image, article.title),
      date: article.created_at,
      trendingHome: article.trending_home || false,
      trendingEdmonton: article.trending_edmonton || false,
      trendingCalgary: article.trending_calgary || false,
      featuredHome: article.featured_home || false,
      featuredEdmonton: article.featured_edmonton || false,
      featuredCalgary: article.featured_calgary || false
    }))

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
    const fileArticles = await getAllArticlesFromFile()
    
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

export async function getAllArticles(): Promise<Article[]> {
  try {
    console.log('=== getAllArticles called ===')
    
    // Check cache first
    const now = Date.now()
    if (articlesCache && (now - cacheTimestamp) < CACHE_DURATION) {
      console.log('Returning cached articles:', articlesCache.length, 'articles')
      return articlesCache
    }
    
    // During build time, always use file system for reliability
    if (shouldUseFileSystem()) {
      console.log('Build time detected, using file system')
      return getAllArticlesFromFile()
    }
    
    if (!supabase) {
      console.error('Supabase client is not initialized')
      console.log('Falling back to file system')
      return getAllArticlesFromFile()
    }

    console.log('Attempting to fetch articles from Supabase...')
    
    // Reduced timeout for faster fallback
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Supabase timeout')), 3000) // Reduced to 3 seconds
    )
    
    const fields = ensureImageFields('id, title, slug, excerpt, content, category, categories, location, author, tags, type, status, created_at, updated_at, trending_home, trending_edmonton, trending_calgary, featured_home, featured_edmonton, featured_calgary')
    
    const supabasePromise = supabase
      .from('articles')
      .select(fields)
      .order('created_at', { ascending: false })
      .limit(50) // Limit to 50 most recent articles for better performance

    const { data, error } = await Promise.race([
      supabasePromise,
      timeoutPromise
    ]) as any

    if (error) {
      console.warn('Supabase query failed:', error.message)
      
      // If we have cached data, return it instead of falling back to file system
      if (articlesCache) {
        console.log('Using cached articles due to Supabase error')
        return articlesCache
      }
      
      console.log('No cache available, falling back to file system')
      return getAllArticlesFromFile()
    }

    console.log('Successfully fetched articles from Supabase:', data?.length || 0, 'articles')
    console.log('Sample article from Supabase:', data?.[0] ? {
      id: data[0].id,
      title: data[0].title,
      featured_home: data[0].featured_home,
      featured_edmonton: data[0].featured_edmonton,
      featured_calgary: data[0].featured_calgary
    } : 'No articles')

    // Map Supabase data to match our Article interface
    const mappedArticles = (data || []).map((article: any) => ({
      ...article,
      imageUrl: validateImageUrl(article.image_url || article.image, article.title), // Map 'image_url' or 'image' column to 'imageUrl'
      date: article.created_at, // Map 'created_at' to 'date' for compatibility
      // Map trending flags from database columns to interface properties
      trendingHome: article.trending_home || false,
      trendingEdmonton: article.trending_edmonton || false,
      trendingCalgary: article.trending_calgary || false,
      featuredHome: article.featured_home || false,
      featuredEdmonton: article.featured_edmonton || false,
      featuredCalgary: article.featured_calgary || false
    }))

    console.log('Mapped articles with featured flags:', mappedArticles.map((a: any) => ({
      id: a.id,
      title: a.title,
      featuredEdmonton: a.featuredEdmonton
    })))

    // Update cache
    articlesCache = mappedArticles
    cacheTimestamp = now
    console.log('Updated articles cache')

    return mappedArticles
  } catch (error) {
    console.warn('Supabase connection failed:', error)
    
    // If we have cached data, return it instead of falling back to file system
    if (articlesCache) {
      console.log('Using cached articles due to connection error')
      return articlesCache
    }
    
    console.log('No cache available, falling back to file system')
    return getAllArticlesFromFile()
  }
}

// Function to clear cache (useful for admin operations)
export function clearArticlesCache() {
  articlesCache = null
  cacheTimestamp = 0
  cityArticlesCache.clear()
  cityCacheTimestamp.clear()
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

// Function to get article by slug
export async function getArticleBySlug(slug: string): Promise<Article | null> {
  try {
    console.log('=== getArticleBySlug called for:', slug)
    
    // Check individual article cache first
    if (articleCache.has(slug)) {
      console.log('Returning cached article by slug:', slug)
      return articleCache.get(slug) || null
    }
    
    // During build time, always use file system for reliability
    if (shouldUseFileSystem()) {
      console.log('Build time detected, using file system')
      // Try to find article by slug in file system first
      const allArticles = getAllArticlesFromFile()
      const article = allArticles.find(a => a.slug === slug)
      if (article) {
        return article
      }
      // If not found by slug, try by ID (for backward compatibility)
      return getArticleByIdFromFile(slug)
    }
    
    if (!supabase) {
      console.error('Supabase client is not initialized')
      console.log('Falling back to file system')
      // Try to find article by slug in file system first
      const allArticles = getAllArticlesFromFile()
      const article = allArticles.find(a => a.slug === slug)
      if (article) {
        return article
      }
      // If not found by slug, try by ID (for backward compatibility)
      return getArticleByIdFromFile(slug)
    }

    console.log('Attempting to fetch article by slug from Supabase...')
    
    // Reduced timeout for faster fallback
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Supabase timeout')), 3000)
    )
    
    const fields = ensureImageFields('id, title, slug, excerpt, content, category, categories, location, author, tags, type, status, created_at, updated_at, trending_home, trending_edmonton, trending_calgary, featured_home, featured_edmonton, featured_calgary')
    
    const supabasePromise = supabase
      .from('articles')
      .select(fields)
      .eq('slug', slug)
      .single()

    const { data, error } = await Promise.race([
      supabasePromise,
      timeoutPromise
    ]) as any

    if (error) {
      console.warn('Supabase query failed for slug:', slug, error.message)
      
      // Try to find in cache by checking all cached articles
      if (articlesCache) {
        const cachedArticle = articlesCache.find(a => a.slug === slug)
        if (cachedArticle) {
          console.log('Found article in all articles cache by slug:', slug)
          articleCache.set(slug, cachedArticle)
          return cachedArticle
        }
      }
      
      console.log('Falling back to file system')
      return getArticleByIdFromFile(slug)
    }

    if (!data) {
      console.log('Article not found in Supabase by slug:', slug)
      return null
    }

    console.log('Successfully fetched article from Supabase by slug:', slug)

    // Map Supabase data to match our Article interface
    const mappedArticle = {
      ...data,
      imageUrl: validateImageUrl(data.image_url || data.image, data.title),
      date: data.created_at,
      trendingHome: data.trending_home || false,
      trendingEdmonton: data.trending_edmonton || false,
      trendingCalgary: data.trending_calgary || false,
      featuredHome: data.featured_home || false,
      featuredEdmonton: data.featured_edmonton || false,
      featuredCalgary: data.featured_calgary || false,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    }

    // Cache the individual article
    articleCache.set(slug, mappedArticle)
    console.log('Cached individual article by slug:', slug)

    return mappedArticle
  } catch (error) {
    console.error('Error fetching article by slug:', slug, error)
    
    // Try to find in cache by checking all cached articles
    if (articlesCache) {
      const cachedArticle = articlesCache.find(a => a.slug === slug)
      if (cachedArticle) {
        console.log('Found article in all articles cache by slug:', slug)
        articleCache.set(slug, cachedArticle)
        return cachedArticle
      }
    }
    
    console.log('Falling back to file system')
    return getArticleByIdFromFile(slug)
  }
}

export async function getArticleById(id: string): Promise<Article | null> {
  try {
    console.log('=== getArticleById called for:', id)
    
    // Check individual article cache first
    if (articleCache.has(id)) {
      console.log('Returning cached article:', id)
      return articleCache.get(id) || null
    }
    
    // During build time, always use file system for reliability
    if (shouldUseFileSystem()) {
      console.log('Build time detected, using file system')
      return getArticleByIdFromFile(id)
    }
    
    if (!supabase) {
      console.error('Supabase client is not initialized')
      console.log('Falling back to file system')
      return getArticleByIdFromFile(id)
    }

    console.log('Attempting to fetch article from Supabase...')
    
    // Reduced timeout for faster fallback
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Supabase timeout')), 3000) // Reduced to 3 seconds
    )
    
    const supabasePromise = supabase
      .from('articles')
      .select('*')
      .eq('id', id)
      .single()

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
      return getArticleByIdFromFile(id)
    }

    if (!data) {
      console.log('Article not found in Supabase:', id)
      return null
    }

    console.log('Successfully fetched article from Supabase:', id)

    // Map Supabase data to match our Article interface
    const mappedArticle = {
      ...data,
      imageUrl: data.image_url || data.image,
      date: data.created_at,
      trendingHome: data.trending_home || false,
      trendingEdmonton: data.trending_edmonton || false,
      trendingCalgary: data.trending_calgary || false,
      featuredHome: data.featured_home || false,
      featuredEdmonton: data.featured_edmonton || false,
      featuredCalgary: data.featured_calgary || false
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
    return getArticleByIdFromFile(id)
  }
}

export async function createArticle(article: CreateArticleInput): Promise<Article> {
  console.log('=== createArticle called ===')
  console.log('Supabase client:', !!supabase)
  console.log('Article input:', article)
  
  try {
    if (!supabase) {
      console.error('Supabase client is not initialized, using file fallback')
      return createArticleInFile(article)
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
      return createArticleInFile(article)
    }

    console.log('Article created successfully in Supabase:', data)
    // Clear cache to ensure fresh data
    clearArticlesCache()
    return data
  } catch (error) {
    console.error('Supabase insert failed, using file fallback:', error)
    return createArticleInFile(article)
  }
}

export async function updateArticle(id: string, article: UpdateArticleInput): Promise<Article> {
  try {
    console.log('=== updateArticle called ===')
    console.log('Article ID:', id)
    console.log('Update data:', article)
    
    if (!supabase) {
      console.error('Supabase client is not initialized, using file fallback')
      return updateArticleInFile(id, article)
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
      return updateArticleInFile(id, article)
    }

    console.log('Article updated successfully in Supabase:', data)
    // Clear cache to ensure fresh data
    clearArticlesCache()
    return data
  } catch (error) {
    console.error('Supabase update failed, using file fallback:', {
      error: error instanceof Error ? error.message : error,
      fullError: error
    })
    return updateArticleInFile(id, article)
  }
}

export async function deleteArticle(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('articles')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting article from Supabase:', error)
      return deleteArticleFromFile(id)
    }
    
    // Clear cache to ensure fresh data
    clearArticlesCache()
  } catch (error) {
    console.error('Supabase delete failed, using file fallback:', error)
    return deleteArticleFromFile(id)
  }
}
