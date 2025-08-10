import { Article, CreateArticleInput, UpdateArticleInput } from './types/article'

const API_BASE = '/api'

export async function getAllArticles(): Promise<Article[]> {
  const response = await fetch(`${API_BASE}/articles`)
  if (!response.ok) {
    throw new Error('Failed to fetch articles')
  }
  return response.json()
}

export async function getArticleById(id: string): Promise<Article> {
  const response = await fetch(`${API_BASE}/articles?id=${id}`)
  if (!response.ok) {
    throw new Error('Failed to fetch article')
  }
  return response.json()
}

export async function createArticle(article: CreateArticleInput): Promise<Article> {
  const response = await fetch(`${API_BASE}/articles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(article),
  })
  if (!response.ok) {
    throw new Error('Failed to create article')
  }
  return response.json()
}

export async function updateArticle(article: UpdateArticleInput): Promise<Article> {
  const response = await fetch(`${API_BASE}/articles`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(article),
  })
  if (!response.ok) {
    throw new Error('Failed to update article')
  }
  return response.json()
}

export async function deleteArticle(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/articles?id=${id}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    throw new Error('Failed to delete article')
  }
} 