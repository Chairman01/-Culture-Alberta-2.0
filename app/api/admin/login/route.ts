import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    // Get credentials from environment variables
    const adminUsername = process.env.ADMIN_USERNAME
    const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH
    const jwtSecret = process.env.JWT_SECRET

    // Debug logging
    console.log('Login attempt:', { username, hasPassword: !!password })
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
        { message: 'Admin access not configured' },
        { status: 500 }
      )
    }

    // Verify username
    if (username !== adminUsername) {
      return NextResponse.json(
        { message: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, adminPasswordHash)
    if (!isValidPassword) {
      return NextResponse.json(
        { message: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        username: adminUsername,
        role: 'admin',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
      },
      jwtSecret
    )

    // Return success with token
    return NextResponse.json({
      message: 'Login successful',
      username: adminUsername,
      token
    })

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
