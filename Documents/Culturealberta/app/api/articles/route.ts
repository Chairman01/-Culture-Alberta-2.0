import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { Article, CreateArticleInput, UpdateArticleInput } from '@/lib/types/article'

const DATA_DIR = path.join(process.cwd(), 'lib', 'data')
const ARTICLES_FILE = path.join(DATA_DIR, 'articles.json')

// Helper function to ensure data directory exists
async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR)
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true })
  }
}

// Helper function to read articles
async function readArticles(): Promise<Article[]> {
  try {
    const data = await fs.readFile(ARTICLES_FILE, 'utf-8')
    return JSON.parse(data)
  } catch {
    return []
  }
}

// Helper function to write articles
async function writeArticles(articles: Article[]) {
  await ensureDataDir()
  await fs.writeFile(ARTICLES_FILE, JSON.stringify(articles, null, 2))
}

// GET /api/articles - Get all articles
export async function GET() {
  try {
    const articles = await readArticles()
    return NextResponse.json(articles)
  } catch (error) {
    console.error('Error fetching articles:', error)
    return NextResponse.json(
      { error: 'Failed to fetch articles' },
      { status: 500 }
    )
  }
}

// POST /api/articles - Create a new article
export async function POST(request: NextRequest) {
  try {
    const body: CreateArticleInput = await request.json()
    
    if (!body.title || !body.content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      )
    }

    const articles = await readArticles()
    const now = new Date().toISOString()
    
    const newArticle: Article = {
      id: uuidv4(),
      title: body.title,
      content: body.content,
      imageUrl: body.imageUrl,
      createdAt: now,
      updatedAt: now,
    }

    articles.push(newArticle)
    await writeArticles(articles)
    
    return NextResponse.json(newArticle)
  } catch (error) {
    console.error('Error creating article:', error)
    return NextResponse.json(
      { error: 'Failed to create article' },
      { status: 500 }
    )
  }
}

// PUT /api/articles/:id - Update an article
export async function PUT(request: NextRequest) {
  try {
    const body: UpdateArticleInput = await request.json()
    const articles = await readArticles()
    
    const index = articles.findIndex(a => a.id === body.id)
    if (index === -1) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      )
    }

    const updatedArticle = {
      ...articles[index],
      ...body,
      updatedAt: new Date().toISOString()
    }

    articles[index] = updatedArticle
    await writeArticles(articles)
    
    return NextResponse.json(updatedArticle)
  } catch (error) {
    console.error('Error updating article:', error)
    return NextResponse.json(
      { error: 'Failed to update article' },
      { status: 500 }
    )
  }
}

// DELETE /api/articles/:id - Delete an article
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json(
        { error: 'Article ID is required' },
        { status: 400 }
      )
    }

    const articles = await readArticles()
    const filteredArticles = articles.filter(a => a.id !== id)
    
    if (filteredArticles.length === articles.length) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      )
    }

    await writeArticles(filteredArticles)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting article:', error)
    return NextResponse.json(
      { error: 'Failed to delete article' },
      { status: 500 }
    )
  }
} 