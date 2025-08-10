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
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    status: article.status || 'published',
    type: article.type || 'article'
  }
  
  articles.unshift(newArticle) // Add to beginning
  writeArticles(articles)
  
  return newArticle
}

export async function updateArticleInFile(id: string, article: UpdateArticleInput): Promise<Article> {
  const articles = readArticles()
  const index = articles.findIndex(a => a.id === id)
  
  if (index === -1) {
    throw new Error('Article not found')
  }
  
  articles[index] = {
    ...articles[index],
    ...article,
    updated_at: new Date().toISOString()
  }
  
  writeArticles(articles)
  return articles[index]
}

export async function deleteArticleFromFile(id: string): Promise<void> {
  const articles = readArticles()
  const filteredArticles = articles.filter(a => a.id !== id)
  
  if (filteredArticles.length === articles.length) {
    throw new Error('Article not found')
  }
  
  writeArticles(filteredArticles)
}
