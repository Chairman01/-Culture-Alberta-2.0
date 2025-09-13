import { Article, CreateArticleInput, UpdateArticleInput } from './types/article'

// Cache for articles data to handle module-level caching
let cachedArticlesData: Article[] | null = null

// Function to clear the cache (called after sync operations)
export function clearFileArticlesCache() {
  cachedArticlesData = null
  // Clear the module cache for the articles.json file
  if (typeof require !== 'undefined') {
    delete require.cache[require.resolve('./data/articles.json')]
  }
}

// Function to get articles data with cache invalidation support
function getArticlesData(): Article[] {
  if (cachedArticlesData === null) {
    // Import fresh data
    const articlesData = require('./data/articles.json')
    cachedArticlesData = articlesData as Article[]
  }
  return cachedArticlesData
}

// Direct file system access for build time
export async function getAllArticlesFromFile(): Promise<Article[]> {
  try {
    // Check if we're on the server side
    if (typeof window !== 'undefined') {
      // Client side - use API call instead
      const response = await fetch('/api/articles')
      if (response.ok) {
        return await response.json()
      }
      return []
    }

    // Server side - use cached data with invalidation support
    console.log('Using articles.json directly - no API calls')
    const articlesData = getArticlesData()
    console.log('Articles count:', articlesData.length)
    return articlesData
  } catch (error) {
    console.error('Error fetching articles from file:', error)
    // Fallback to empty array
    return []
  }
}

export async function getArticleByIdFromFile(id: string): Promise<Article | null> {
  try {
    // Check if we're on the server side
    if (typeof window !== 'undefined') {
      // Client side - use API call instead
      const response = await fetch(`/api/articles/${id}`)
      if (response.ok) {
        return await response.json()
      }
      return null
    }

    // Server side - use cached data
    console.log('Finding article by ID in articles.json')
    const articles = getArticlesData()
    return articles.find(article => article.id === id) || null
  } catch (error) {
    console.error('Error fetching article from file:', error)
    // Fallback to null
    return null
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
    // Check if we're on the server side
    if (typeof window !== 'undefined') {
      // Client side - use API call instead
      const response = await fetch(`/api/articles/${id}`, {
        method: 'DELETE'
      })
      if (!response.ok) {
        throw new Error('Failed to delete article via API')
      }
      return
    }

    // Server side - read file directly
    const fs = await import('fs')
    const path = await import('path')
    
    const ARTICLES_FILE = path.join(process.cwd(), 'lib', 'data', 'articles.json')
    
    if (!fs.existsSync(ARTICLES_FILE)) {
      throw new Error('Articles file not found')
    }
    
    const data = fs.readFileSync(ARTICLES_FILE, 'utf-8')
    const articles = JSON.parse(data)
    const filteredArticles = articles.filter((a: any) => a.id !== id)
    
    if (filteredArticles.length === articles.length) {
      throw new Error('Article not found')
    }
    
    fs.writeFileSync(ARTICLES_FILE, JSON.stringify(filteredArticles, null, 2), 'utf-8')
    console.log('✅ Article deleted from file system:', id)
  } catch (error) {
    console.error('Error deleting article from file:', error)
    throw new Error('Failed to delete article')
  }
}
