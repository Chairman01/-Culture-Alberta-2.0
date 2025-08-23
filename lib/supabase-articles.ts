import { supabase } from './supabase'
import { Article, CreateArticleInput, UpdateArticleInput } from './types/article'
import { 
  getAllArticlesFromFile,
  getArticleByIdFromFile,
  createArticleInFile,
  updateArticleInFile,
  deleteArticleFromFile
} from './file-articles'

// Enhanced cache for articles to prevent multiple API calls
let articlesCache: Article[] | null = null
let articleCache: Map<string, Article> = new Map()
let cacheTimestamp: number = 0
const CACHE_DURATION = 10 * 60 * 1000 // 10 minutes (increased from 5)

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

export async function getAllArticles(): Promise<Article[]> {
  try {
    console.log('=== getAllArticles called ===')
    
    // Check cache first
    const now = Date.now()
    if (articlesCache && (now - cacheTimestamp) < CACHE_DURATION) {
      console.log('Returning cached articles:', articlesCache.length, 'articles')
      return articlesCache
    }
    
    if (!supabase) {
      console.error('Supabase client is not initialized')
      console.log('Falling back to file system')
      return getAllArticlesFromFile()
    }

    console.log('Attempting to fetch articles from Supabase...')
    
    // Reduced timeout for faster fallback
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Supabase timeout')), 5000) // Reduced to 5 seconds
    )
    
    const supabasePromise = supabase
      .from('articles')
      .select('*')
      .order('created_at', { ascending: false })

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
      imageUrl: article.image_url || article.image, // Map 'image_url' or 'image' column to 'imageUrl'
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
  console.log('Articles cache cleared')
}

export async function getArticleById(id: string): Promise<Article | null> {
  try {
    console.log('=== getArticleById called for:', id)
    
    // Check individual article cache first
    if (articleCache.has(id)) {
      console.log('Returning cached article:', id)
      return articleCache.get(id) || null
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
