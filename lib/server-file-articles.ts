import { Article, CreateArticleInput, UpdateArticleInput } from './types/article'
import fs from 'fs'
import path from 'path'

const ARTICLES_FILE = path.join(process.cwd(), 'lib', 'data', 'articles.json')

// Ensure the articles file exists
function ensureArticlesFile() {
  if (!fs.existsSync(ARTICLES_FILE)) {
    fs.writeFileSync(ARTICLES_FILE, '[]', 'utf-8')
  }
}

// Read articles from file
function readArticles(): Article[] {
  ensureArticlesFile()
  try {
    const data = fs.readFileSync(ARTICLES_FILE, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    console.error('Error reading articles file:', error)
    return []
  }
}

// Write articles to file
function writeArticles(articles: Article[]) {
  ensureArticlesFile()
  try {
    fs.writeFileSync(ARTICLES_FILE, JSON.stringify(articles, null, 2), 'utf-8')
  } catch (error) {
    console.error('Error writing articles file:', error)
    throw new Error('Failed to save articles')
  }
}

// Add a single article to the file if it doesn't exist
function addArticleToFile(article: Article) {
  const articles = readArticles()
  const existingIndex = articles.findIndex(a => a.id === article.id)
  
  if (existingIndex === -1) {
    console.log('Adding new article to file:', article.id)
    articles.unshift(article) // Add to beginning
    writeArticles(articles)
  } else {
    console.log('Article already exists in file:', article.id)
  }
}

export async function getAllArticlesFromFile(): Promise<Article[]> {
  return readArticles()
}

export async function getArticleByIdFromFile(id: string): Promise<Article> {
  const articles = readArticles()
  const article = articles.find(a => a.id === id)
  
  if (!article) {
    throw new Error('Article not found')
  }
  
  return article
}

export async function createArticleInFile(article: CreateArticleInput): Promise<Article> {
  const articles = readArticles()
  
  const newArticle: Article = {
    id: `article-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    ...article,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: article.status || 'published',
    type: article.type || 'article'
  }
  
  articles.unshift(newArticle) // Add to beginning
  writeArticles(articles)
  
  return newArticle
}

export async function updateArticleInFile(id: string, article: UpdateArticleInput): Promise<Article> {
  try {
    console.log('Updating article in file:', { id, article })
    
    const articles = readArticles()
    console.log('All articles in file:', articles.map(a => ({ id: a.id, title: a.title })))
    
    const index = articles.findIndex(a => a.id === id)
    console.log('Article index found:', index)
    
    if (index === -1) {
      console.error('Article not found for update:', id)
      console.error('Available article IDs:', articles.map(a => a.id))
      
      // Try to create the article if it doesn't exist
      console.log('Attempting to create missing article in file...')
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
      writeArticles(articles)
      console.log('Created missing article in file:', id)
      return newArticle
    }
    
    console.log('Found article at index:', index)
    
    articles[index] = {
      ...articles[index],
      ...article,
      updatedAt: new Date().toISOString()
    }
    
    console.log('Updated article data:', articles[index])
    
    writeArticles(articles)
    return articles[index]
  } catch (error) {
    console.error('Error in updateArticleInFile:', error)
    throw error
  }
}

export async function deleteArticleFromFile(id: string): Promise<void> {
  const articles = readArticles()
  const filteredArticles = articles.filter(a => a.id !== id)
  
  if (filteredArticles.length === articles.length) {
    throw new Error('Article not found')
  }
  
  writeArticles(filteredArticles)
}
