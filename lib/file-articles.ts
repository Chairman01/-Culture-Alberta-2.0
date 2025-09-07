import { Article, CreateArticleInput, UpdateArticleInput } from './types/article'
import articlesData from './data/articles.json'

// Direct file system access for build time
export async function getAllArticlesFromFile(): Promise<Article[]> {
  try {
    // During build time, use the JSON file directly
    if (typeof window === 'undefined') {
      console.log('Build time: Using articles.json directly')
      return articlesData as Article[]
    }
    
    // In browser, use API calls
    const response = await fetch('/api/articles')
    if (response.ok) {
      return response.json()
    }
    return []
  } catch (error) {
    console.error('Error fetching articles from file:', error)
    // Fallback to JSON data
    return articlesData as Article[]
  }
}

export async function getArticleByIdFromFile(id: string): Promise<Article | null> {
  try {
    // During build time, use the JSON file directly
    if (typeof window === 'undefined') {
      console.log('Build time: Finding article by ID in articles.json')
      const articles = articlesData as Article[]
      return articles.find(article => article.id === id) || null
    }
    
    // In browser, use API calls
    const response = await fetch(`/api/articles?id=${id}`)
    if (response.ok) {
      return response.json()
    }
    return null
  } catch (error) {
    console.error('Error fetching article from file:', error)
    // Fallback to JSON data
    const articles = articlesData as Article[]
    return articles.find(article => article.id === id) || null
  }
}

export async function createArticleInFile(article: CreateArticleInput): Promise<Article> {
  try {
    const response = await fetch('/api/articles', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(article),
    })
    
    if (response.ok) {
      return response.json()
    }
    throw new Error('Failed to create article')
  } catch (error) {
    console.error('Error creating article via API:', error)
    throw new Error('Failed to create article')
  }
}

export async function updateArticleInFile(id: string, article: UpdateArticleInput): Promise<Article> {
  try {
    console.log('updateArticleInFile called with:', { id, article })
    
    const response = await fetch('/api/articles', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id, ...article }),
    })
    
    console.log('API response status:', response.status)
    console.log('API response ok:', response.ok)
    
    if (response.ok) {
      const result = await response.json()
      console.log('API response data:', result)
      return result
    }
    
    // Try to get error details
    const errorText = await response.text()
    console.error('API error response:', errorText)
    
    throw new Error(`Failed to update article: ${response.status} ${errorText}`)
  } catch (error) {
    console.error('Error updating article via API:', error)
    throw new Error('Failed to update article')
  }
}

export async function deleteArticleFromFile(id: string): Promise<void> {
  try {
    const response = await fetch(`/api/articles?id=${id}`, {
      method: 'DELETE',
    })
    
    if (!response.ok) {
      throw new Error('Failed to delete article')
    }
  } catch (error) {
    console.error('Error deleting article via API:', error)
    throw new Error('Failed to delete article')
  }
}
