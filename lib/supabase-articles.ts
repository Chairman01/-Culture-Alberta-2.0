import { supabase } from './supabase'
import { Article, CreateArticleInput, UpdateArticleInput } from './types/article'
import { 
  getAllArticlesFromFile,
  getArticleByIdFromFile,
  createArticleInFile,
  updateArticleInFile,
  deleteArticleFromFile
} from './file-articles'

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
    if (!supabase) {
      console.error('Supabase client is not initialized')
      return getAllArticlesFromFile()
    }

    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.warn('Supabase query failed, using file fallback:', error.message)
      return getAllArticlesFromFile()
    }

    // Map Supabase data to match our Article interface
    const mappedArticles = (data || []).map(article => ({
      ...article,
      imageUrl: article.image, // Map 'image' column to 'imageUrl'
      date: article.created_at // Map 'created_at' to 'date' for compatibility
    }))

    return mappedArticles
  } catch (error) {
    console.warn('Supabase connection failed, using file fallback:', error)
    return getAllArticlesFromFile()
  }
}

export async function getArticleById(id: string): Promise<Article> {
  try {
    if (!id || id.trim() === '') {
      throw new Error('Article ID is required')
    }

    if (!supabase) {
      console.error('Supabase client is not initialized')
      return getArticleByIdFromFile(id)
    }

    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching article from Supabase:', error.message)
      return getArticleByIdFromFile(id)
    }

    if (!data) {
      console.warn('No article found in Supabase for ID:', id)
      return getArticleByIdFromFile(id)
    }

    // Map Supabase data to match our Article interface
    const mappedArticle = {
      ...data,
      imageUrl: data.image, // Map 'image' column to 'imageUrl'
      date: data.created_at // Map 'created_at' to 'date' for compatibility
    }

    return mappedArticle
  } catch (error) {
    console.error('Supabase query failed, using file fallback:', error)
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
      location: article.location,
      author: article.author,
      type: article.type || 'article',
      status: article.status || 'published',
      image: article.imageUrl, // Map imageUrl to image column
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
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
    return data
  } catch (error) {
    console.error('Supabase insert failed, using file fallback:', error)
    return createArticleInFile(article)
  }
}

export async function updateArticle(id: string, article: UpdateArticleInput): Promise<Article> {
  try {
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
      location: article.location,
      author: article.author,
      type: article.type,
      status: article.status,
      image: article.imageUrl, // Map imageUrl to image column
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('articles')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating article in Supabase:', error)
      return updateArticleInFile(id, article)
    }

    return data
  } catch (error) {
    console.error('Supabase update failed, using file fallback:', error)
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
  } catch (error) {
    console.error('Supabase delete failed, using file fallback:', error)
    return deleteArticleFromFile(id)
  }
}
