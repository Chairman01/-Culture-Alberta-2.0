import { NextRequest, NextResponse } from 'next/server'
import { 
  getAllArticles, 
  getArticleById, 
  createArticle, 
  updateArticle, 
  deleteArticle 
} from '@/lib/supabase-articles'
import { CreateArticleInput, UpdateArticleInput } from '@/lib/types/article'
import { revalidatePath } from 'next/cache'

// Force dynamic rendering - no caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET /api/articles - Get all articles or get article by ID/slug
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const slug = searchParams.get('slug')

    if (slug) {
      // Get all articles and find by title match (since we're using title-based URLs)
      const allArticles = await getAllArticles()
      const article = allArticles.find(a => 
        a.title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-') === slug.toLowerCase()
      )
      
      if (!article) {
        return NextResponse.json(
          { error: 'Article not found' },
          { status: 404 }
        )
      }
      return NextResponse.json(article)
    } else if (id) {
      // Get specific article by ID (for backward compatibility)
      console.log('🔍 API: Getting article by ID:', id)
      console.log('🔍 API: Environment check:', {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL: process.env.VERCEL,
        window: typeof window !== 'undefined'
      })
      const article = await getArticleById(id)
      console.log('🔍 API: Article result:', article ? 'Found' : 'Not found')
      return NextResponse.json(article)
    } else {
      // Get all articles
      const articles = await getAllArticles()
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

    const newArticle = await createArticle(body)
    
    // CRITICAL FIX: Revalidate all pages after creating a new article
    try {
      console.log('🔄 Revalidating pages after article creation...')
      revalidatePath('/', 'layout') // Revalidate entire app
      revalidatePath('/') // Homepage
      revalidatePath('/edmonton')
      revalidatePath('/calgary')
      revalidatePath('/food-drink')
      revalidatePath('/events')
      revalidatePath('/articles')
      console.log('✅ Pages revalidated successfully')
    } catch (revalidateError) {
      console.error('⚠️ Revalidation failed:', revalidateError)
      // Don't fail the request if revalidation fails
    }
    
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
    console.log('PUT /api/articles called')
    
    const { searchParams } = new URL(request.url)
    const idFromParams = searchParams.get('id')
    const body: UpdateArticleInput & { id?: string } = await request.json()
    
    console.log('PUT request data:', { idFromParams, body })
    
    // Get ID from either search params or request body
    const id = idFromParams || body.id
    
    if (!id) {
      console.error('No ID provided for article update')
      return NextResponse.json(
        { error: 'Article ID is required' },
        { status: 400 }
      )
    }

    console.log('Using ID for update:', id)

    // Remove id from body if it exists there
    const { id: bodyId, ...updateData } = body

    console.log('Update data:', updateData)

    try {
      const updatedArticle = await updateArticle(id, updateData)
      console.log('Article updated successfully:', updatedArticle)
      
      // CRITICAL FIX: Revalidate all pages after updating an article
      try {
        console.log('🔄 Revalidating pages after article update...')
        revalidatePath('/', 'layout') // Revalidate entire app
        revalidatePath('/') // Homepage
        revalidatePath('/edmonton')
        revalidatePath('/calgary')
        revalidatePath('/food-drink')
        revalidatePath('/events')
        revalidatePath('/articles')
        console.log('✅ Pages revalidated successfully')
      } catch (revalidateError) {
        console.error('⚠️ Revalidation failed:', revalidateError)
      }
      
      return NextResponse.json(updatedArticle)
    } catch (updateError) {
      console.error('Error in updateArticleInFile:', updateError)
      return NextResponse.json(
        { error: `Update failed: ${updateError instanceof Error ? updateError.message : 'Unknown error'}` },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error in PUT /api/articles:', error)
    return NextResponse.json(
      { error: `Request failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
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

    await deleteArticle(id)
    
    // CRITICAL FIX: Revalidate all pages after deleting an article
    try {
      console.log('🔄 Revalidating pages after article deletion...')
      revalidatePath('/', 'layout') // Revalidate entire app
      revalidatePath('/') // Homepage
      revalidatePath('/edmonton')
      revalidatePath('/calgary')
      revalidatePath('/food-drink')
      revalidatePath('/events')
      revalidatePath('/articles')
      console.log('✅ Pages revalidated successfully')
    } catch (revalidateError) {
      console.error('⚠️ Revalidation failed:', revalidateError)
    }
    
    return NextResponse.json({ message: 'Article deleted successfully' })
  } catch (error) {
    console.error('Error deleting article:', error)
    return NextResponse.json(
      { error: 'Failed to delete article' },
      { status: 500 }
    )
  }
} 