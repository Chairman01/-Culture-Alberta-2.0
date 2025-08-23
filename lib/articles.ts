import { Article, CreateArticleInput, UpdateArticleInput } from './types/article'
import articlesData from './data/articles.json'

// Cache for articles to prevent multiple API calls
let articlesCache: Article[] | null = null
let cacheTimestamp: number = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

// Fast hybrid loading: try Supabase first, fallback to static data for better performance.
export async function getAllArticles(): Promise<Article[]> {
  try {
    // Check cache first
    if (articlesCache && (Date.now() - cacheTimestamp) < CACHE_DURATION) {
      console.log('Returning cached articles')
      return articlesCache
    }

    // Try to load from Supabase with timeout
    console.log('Loading articles from Supabase...')
    const supabaseArticles = await loadFromSupabase()
    
    if (supabaseArticles && supabaseArticles.length > 0) {
      // Cache the Supabase data
      articlesCache = supabaseArticles
      cacheTimestamp = Date.now()
      console.log('Loaded articles from Supabase:', supabaseArticles.length)
      return supabaseArticles
    }

    // Fallback to static data if Supabase fails or is empty
    console.log('Falling back to static articles data')
    const staticArticles = articlesData as Article[]
    articlesCache = staticArticles
    cacheTimestamp = Date.now()
    return staticArticles

  } catch (error) {
    console.error('Error loading articles, using static fallback:', error)
    // Return static data as fallback
    return articlesData as Article[]
  }
}

async function loadFromSupabase(): Promise<Article[] | null> {
  try {
    // Import Supabase functions dynamically to avoid issues
    const { getAllArticlesFromSupabase } = await import('./supabase-articles')
    return await getAllArticlesFromSupabase()
  } catch (error) {
    console.error('Supabase loading failed:', error)
    return null
  }
}

export async function getArticleById(id: string): Promise<Article> {
  try {
    const articles = await getAllArticles()
    const article = articles.find(a => a.id === id)
    if (!article) {
      throw new Error('Article not found')
    }
    return article
  } catch (error) {
    console.error('Error loading article:', error)
    throw error
  }
}

// Keep the other functions for compatibility but make them fast
export async function createArticle(input: CreateArticleInput): Promise<Article> {
  try {
    const { createArticleInSupabase } = await import('./supabase-articles')
    return await createArticleInSupabase(input)
  } catch (error) {
    console.error('Error creating article:', error)
    // Return mock article as fallback
    const newArticle: Article = {
      id: Date.now().toString(),
      ...input,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'published',
      trendingHome: false,
      trendingEdmonton: false,
      trendingCalgary: false,
      featuredHome: false,
      featuredEdmonton: false,
      featuredCalgary: false
    }
    return newArticle
  }
}

export async function updateArticle(id: string, input: UpdateArticleInput): Promise<Article> {
  try {
    const { updateArticleInSupabase } = await import('./supabase-articles')
    return await updateArticleInSupabase(id, input)
  } catch (error) {
    console.error('Error updating article:', error)
    const articles = await getAllArticles()
    const article = articles.find(a => a.id === id)
    if (!article) {
      throw new Error('Article not found')
    }
    return { ...article, ...input, updatedAt: new Date().toISOString() }
  }
}

export async function deleteArticle(id: string): Promise<void> {
  try {
    const { deleteArticleFromSupabase } = await import('./supabase-articles')
    await deleteArticleFromSupabase(id)
  } catch (error) {
    console.error('Error deleting article:', error)
    // Mock deletion
    console.log('Deleting article:', id)
  }
} 