import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const paths = body.paths || ['/']
    
    // Revalidate all specified paths
    const revalidatedPaths = []
    for (const path of paths) {
      try {
        revalidatePath(path)
        revalidatedPaths.push(path)
        console.log(`✅ Revalidated path: ${path}`)
      } catch (pathError) {
        console.log(`⚠️ Failed to revalidate path ${path}:`, pathError)
        // Continue with other paths even if one fails
      }
    }
    
    // Also revalidate the articles directory to ensure new articles are included
    try {
      revalidatePath('/articles', 'layout')
      console.log('✅ Revalidated articles layout')
    } catch (layoutError) {
      console.log('⚠️ Failed to revalidate articles layout:', layoutError)
    }
    
    return NextResponse.json({ 
      revalidated: true, 
      paths: revalidatedPaths,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Revalidation error:', error)
    return NextResponse.json(
      { error: 'Failed to revalidate' },
      { status: 500 }
    )
  }
}
