import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    console.log('=== Minimal Login API called ===')
    
    const body = await request.json()
    console.log('Request body received:', body)
    
    const { username, password } = body

    // Simple hardcoded check for testing
    if (username === 'admin' && password === 'Kj8#mN2$pQ9@vX5!rL7&') {
      console.log('Minimal authentication successful')
      return NextResponse.json({
        message: 'Login successful (minimal version)',
        username: 'admin',
        token: 'minimal-test-token-123'
      })
    } else {
      console.log('Minimal authentication failed')
      return NextResponse.json(
        { message: 'Invalid credentials' },
        { status: 401 }
      )
    }

  } catch (error) {
    console.error('Minimal login error:', error)
    return NextResponse.json(
      { message: 'Internal server error', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
