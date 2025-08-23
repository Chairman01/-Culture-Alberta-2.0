import { Article, CreateArticleInput, UpdateArticleInput } from './types/article'
import articlesData from './data/articles.json'

// Fast static data loading instead of slow Supabase
export async function getAllArticles(): Promise<Article[]> {
  try {
    // Return static data immediately for fast loading
    return articlesData as Article[]
  } catch (error) {
    console.error('Error loading articles:', error)
    return []
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
  // For now, just return a mock article
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

export async function updateArticle(id: string, input: UpdateArticleInput): Promise<Article> {
  const articles = await getAllArticles()
  const article = articles.find(a => a.id === id)
  if (!article) {
    throw new Error('Article not found')
  }
  return { ...article, ...input, updatedAt: new Date().toISOString() }
}

export async function deleteArticle(id: string): Promise<void> {
  // Mock deletion
  console.log('Deleting article:', id)
} 