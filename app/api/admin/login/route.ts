import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

export async function POST(request: NextRequest) {
  try {
    console.log('=== Login API called ===')
    
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

    // Verify username
    console.log('Checking username:', { provided: username, expected: adminUsername })
    if (username !== adminUsername) {
      console.log('Username mismatch')
      return NextResponse.json(
        { message: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Verify password
    console.log('Attempting password verification...')
    try {
      const isValidPassword = await bcrypt.compare(password, adminPasswordHash)
      console.log('Password verification result:', isValidPassword)
      if (!isValidPassword) {
        return NextResponse.json(
          { message: 'Invalid credentials' },
          { status: 401 }
        )
      }
    } catch (bcryptError) {
      console.error('Bcrypt error:', bcryptError)
      return NextResponse.json(
        { message: 'Authentication error', details: 'Password verification failed' },
        { status: 500 }
      )
    }

    // Generate JWT token
    console.log('Generating JWT token...')
    try {
      const token = jwt.sign(
        { 
          username: adminUsername,
          role: 'admin',
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
        },
        jwtSecret
      )
      console.log('JWT token generated successfully')

      // Return success with token
      return NextResponse.json({
        message: 'Login successful',
        username: adminUsername,
        token
      })
    } catch (jwtError) {
      console.error('JWT error:', jwtError)
      return NextResponse.json(
        { message: 'Authentication error', details: 'Token generation failed' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
