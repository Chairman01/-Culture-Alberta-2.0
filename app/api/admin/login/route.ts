import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, password } = body

    const adminUsername    = process.env.ADMIN_USERNAME
    const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH
    const jwtSecret        = process.env.JWT_SECRET

    if (!adminUsername || !adminPasswordHash || !jwtSecret) {
      console.error('[login] Admin credentials not configured in environment variables')
      return NextResponse.json({ message: 'Service unavailable' }, { status: 503 })
    }

    // Check admin credentials first
    let matchedUsername: string | null = null
    let matchedRole: 'admin' | 'contributor' | null = null

    if (username === adminUsername && await bcrypt.compare(password, adminPasswordHash)) {
      matchedUsername = adminUsername
      matchedRole = 'admin'
    }

    // Check contributor credentials if admin didn't match
    const contributorUsername    = process.env.CONTRIBUTOR_USERNAME
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

    // Set httpOnly cookie so middleware can verify server-side
    response.cookies.set('admin_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    })

    return response
  } catch (error) {
    console.error('[login] Error:', error instanceof Error ? error.message : 'Unknown')
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
