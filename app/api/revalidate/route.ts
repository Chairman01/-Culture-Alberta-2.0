import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const path = searchParams.get('path') || '/'
    
    // Revalidate the specified path
    revalidatePath(path)
    
    console.log(`✅ Revalidated path: ${path}`)
    
    return NextResponse.json({ 
      revalidated: true, 
      path,
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
