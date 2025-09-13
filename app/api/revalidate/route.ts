import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const paths = body.paths || ['/']
    
    // Revalidate all specified paths
    const revalidatedPaths = []
    for (const path of paths) {
      revalidatePath(path)
      revalidatedPaths.push(path)
      console.log(`✅ Revalidated path: ${path}`)
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
