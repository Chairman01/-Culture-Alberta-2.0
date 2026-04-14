import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, password } = body

    const adminUsername = process.env.ADMIN_USERNAME?.trim()
    const adminPassword = process.env.ADMIN_PASSWORD?.trim()
    const jwtSecret     = process.env.JWT_SECRET?.trim()

    if (!adminUsername || !adminPassword || !jwtSecret) {
      console.error('[login] Admin credentials not configured in environment variables')
      return NextResponse.json({ message: 'Service unavailable' }, { status: 503 })
    }

    let matchedUsername: string | null = null
    let matchedRole: 'admin' | 'contributor' | null = null

    // Admin: plain text password comparison
    if (username === adminUsername && password === adminPassword) {
      matchedUsername = adminUsername
      matchedRole = 'admin'
    }

    // Contributor: bcrypt password comparison
    const contributorUsername     = process.env.CONTRIBUTOR_USERNAME
    const contributorPasswordHash = process.env.CONTRIBUTOR_PASSWORD_HASH
    if (!matchedRole && contributorUsername && contributorPasswordHash) {
      if (username === contributorUsername && await bcrypt.compare(password, contributorPasswordHash)) {
        matchedUsername = contributorUsername
        matchedRole = 'contributor'
      }
    }

    if (!matchedUsername || !matchedRole) {
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 })
    }

    const token = jwt.sign(
      { username: matchedUsername, role: matchedRole },
      jwtSecret,
      { expiresIn: '24h' }
    )

    const response = NextResponse.json({ message: 'Login successful', username: matchedUsername, role: matchedRole, token })

    response.cookies.set('admin_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('[login] Error:', error instanceof Error ? error.message : 'Unknown')
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
