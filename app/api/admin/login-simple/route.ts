import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    console.log('=== Simple Login API called ===')
    
    const body = await request.json()
    console.log('Request body:', { username: body.username, hasPassword: !!body.password })
    
    const { username, password } = body

    // Get credentials from environment variables
    const adminUsername = process.env.ADMIN_USERNAME
    const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH
    const jwtSecret = process.env.JWT_SECRET

    // Debug logging
    console.log('Environment variables check:', {
      hasAdminUsername: !!adminUsername,
      hasAdminPasswordHash: !!adminPasswordHash,
      hasJwtSecret: !!jwtSecret,
      adminUsername,
      adminPasswordHashLength: adminPasswordHash?.length,
      jwtSecretLength: jwtSecret?.length
    })

    // Check if environment variables are set
    if (!adminUsername || !adminPasswordHash || !jwtSecret) {
      console.error('Admin credentials not configured in environment variables')
      console.error('Missing variables:', {
        adminUsername: !adminUsername,
        adminPasswordHash: !adminPasswordHash,
        jwtSecret: !jwtSecret
      })
      return NextResponse.json(
        { message: 'Admin access not configured', details: 'Missing environment variables' },
        { status: 500 }
      )
    }

    // Simple username check (no bcrypt for now)
    console.log('Checking username:', { provided: username, expected: adminUsername })
    if (username !== adminUsername) {
      console.log('Username mismatch')
      return NextResponse.json(
        { message: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Simple password check (just compare strings for testing)
    console.log('Checking password (simple comparison)...')
    if (password !== 'Kj8#mN2$pQ9@vX5!rL7&') {
      console.log('Password mismatch')
      return NextResponse.json(
        { message: 'Invalid credentials' },
        { status: 401 }
      )
    }

    console.log('Simple authentication successful')

    // Return success without JWT for now
    return NextResponse.json({
      message: 'Login successful (simple version)',
      username: adminUsername,
      token: 'simple-test-token'
    })

  } catch (error) {
    console.error('Simple login error:', error)
    return NextResponse.json(
      { message: 'Internal server error', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
