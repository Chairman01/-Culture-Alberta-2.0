import { NextRequest, NextResponse } from 'next/server'
import { 
  getAllArticlesFromFile, 
  getArticleByIdFromFile, 
  createArticleInFile, 
  updateArticleInFile, 
  deleteArticleFromFile 
} from '@/lib/server-file-articles'
import { CreateArticleInput, UpdateArticleInput } from '@/lib/types/article'

// GET /api/articles - Get all articles or get article by ID
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (id) {
      // Get specific article by ID
      const article = await getArticleByIdFromFile(id)
      return NextResponse.json(article)
    } else {
      // Get all articles
      const articles = await getAllArticlesFromFile()
      return NextResponse.json(articles)
    }
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

    const newArticle = await createArticleInFile(body)
    return NextResponse.json(newArticle)
  } catch (error) {
    console.error('Error creating article:', error)
    return NextResponse.json(
      { error: 'Failed to create article' },
      { status: 500 }
    )
  }
}

// PUT /api/articles - Update an article
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const body: UpdateArticleInput = await request.json()
    
    if (!id) {
      return NextResponse.json(
        { error: 'Article ID is required' },
        { status: 400 }
      )
    }

    const updatedArticle = await updateArticleInFile(id, body)
    return NextResponse.json(updatedArticle)
  } catch (error) {
    console.error('Error updating article:', error)
    return NextResponse.json(
      { error: 'Failed to update article' },
      { status: 500 }
    )
  }
}

// DELETE /api/articles - Delete an article
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

    await deleteArticleFromFile(id)
    return NextResponse.json({ message: 'Article deleted successfully' })
  } catch (error) {
    console.error('Error deleting article:', error)
    return NextResponse.json(
      { error: 'Failed to delete article' },
      { status: 500 }
    )
  }
} 