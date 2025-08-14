import { Article, CreateArticleInput, UpdateArticleInput } from './types/article'

// Server-side only file operations
export async function getAllArticlesFromFile(): Promise<Article[]> {
  // Only run on server side
  if (typeof window !== 'undefined') {
    return []
  }

  try {
    const fs = await import('fs')
    const path = await import('path')
    
    const ARTICLES_FILE = path.join(process.cwd(), 'lib', 'data', 'articles.json')
    
    // Ensure the articles file exists
    if (!fs.existsSync(ARTICLES_FILE)) {
      fs.writeFileSync(ARTICLES_FILE, '[]', 'utf-8')
    }
    
    const data = fs.readFileSync(ARTICLES_FILE, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    console.error('Error reading articles file:', error)
    return []
  }
}

export async function getArticleByIdFromFile(id: string): Promise<Article> {
  if (typeof window !== 'undefined') {
    throw new Error('This function can only be called on the server side')
  }

  try {
    const fs = await import('fs')
    const path = await import('path')
    
    const ARTICLES_FILE = path.join(process.cwd(), 'lib', 'data', 'articles.json')
    
    if (!fs.existsSync(ARTICLES_FILE)) {
      throw new Error('Articles file not found')
    }
    
    const data = fs.readFileSync(ARTICLES_FILE, 'utf-8')
    const articles = JSON.parse(data)
    const article = articles.find((a: Article) => a.id === id)
    
    if (!article) {
      throw new Error('Article not found')
    }
    
    return article
  } catch (error) {
    console.error('Error reading article from file:', error)
    throw new Error('Article not found')
  }
}

export async function createArticleInFile(article: CreateArticleInput): Promise<Article> {
  if (typeof window !== 'undefined') {
    throw new Error('This function can only be called on the server side')
  }

  try {
    const fs = await import('fs')
    const path = await import('path')
    
    const ARTICLES_FILE = path.join(process.cwd(), 'lib', 'data', 'articles.json')
    
    // Ensure the articles file exists
    if (!fs.existsSync(ARTICLES_FILE)) {
      fs.writeFileSync(ARTICLES_FILE, '[]', 'utf-8')
    }
    
    const data = fs.readFileSync(ARTICLES_FILE, 'utf-8')
    const articles = JSON.parse(data)
    
    const newArticle: Article = {
      id: `article-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...article,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: article.status || 'published',
      type: article.type || 'article'
    }
    
    articles.unshift(newArticle) // Add to beginning
    fs.writeFileSync(ARTICLES_FILE, JSON.stringify(articles, null, 2), 'utf-8')
    
    return newArticle
  } catch (error) {
    console.error('Error creating article in file:', error)
    throw new Error('Failed to create article')
  }
}

export async function updateArticleInFile(id: string, article: UpdateArticleInput): Promise<Article> {
  if (typeof window !== 'undefined') {
    throw new Error('This function can only be called on the server side')
  }

  try {
    const fs = await import('fs')
    const path = await import('path')
    
    const ARTICLES_FILE = path.join(process.cwd(), 'lib', 'data', 'articles.json')
    
    if (!fs.existsSync(ARTICLES_FILE)) {
      throw new Error('Articles file not found')
    }
    
    const data = fs.readFileSync(ARTICLES_FILE, 'utf-8')
    const articles = JSON.parse(data)
    
    const index = articles.findIndex((a: Article) => a.id === id)
    
    if (index === -1) {
      // Try to create the article if it doesn't exist
      const newArticle: Article = {
        id,
        title: article.title || 'Untitled',
        content: article.content || '',
        excerpt: article.excerpt,
        category: article.category,
        location: article.location,
        author: article.author,
        type: article.type || 'article',
        status: article.status || 'published',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        trendingHome: article.trendingHome,
        trendingEdmonton: article.trendingEdmonton,
        trendingCalgary: article.trendingCalgary
      }
      
      articles.unshift(newArticle)
      fs.writeFileSync(ARTICLES_FILE, JSON.stringify(articles, null, 2), 'utf-8')
      return newArticle
    }
    
    articles[index] = {
      ...articles[index],
      ...article,
      updatedAt: new Date().toISOString()
    }
    
    fs.writeFileSync(ARTICLES_FILE, JSON.stringify(articles, null, 2), 'utf-8')
    return articles[index]
  } catch (error) {
    console.error('Error updating article in file:', error)
    throw error
  }
}

export async function deleteArticleFromFile(id: string): Promise<void> {
  if (typeof window !== 'undefined') {
    throw new Error('This function can only be called on the server side')
  }

  try {
    const fs = await import('fs')
    const path = await import('path')
    
    const ARTICLES_FILE = path.join(process.cwd(), 'lib', 'data', 'articles.json')
    
    if (!fs.existsSync(ARTICLES_FILE)) {
      throw new Error('Articles file not found')
    }
    
    const data = fs.readFileSync(ARTICLES_FILE, 'utf-8')
    const articles = JSON.parse(data)
    const filteredArticles = articles.filter((a: Article) => a.id !== id)
    
    if (filteredArticles.length === articles.length) {
      throw new Error('Article not found')
    }
    
    fs.writeFileSync(ARTICLES_FILE, JSON.stringify(filteredArticles, null, 2), 'utf-8')
  } catch (error) {
    console.error('Error deleting article from file:', error)
    throw new Error('Failed to delete article')
  }
}
