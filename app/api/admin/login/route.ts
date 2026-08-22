import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { verifyAdminUser, recordLogin } from '@/lib/admin-users'
import { clientKey, retryAfterSeconds, recordFailure, recordSuccess } from '@/lib/login-throttle'

function isBcryptHash(value: string) {
  return /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(value)
}

async function passwordMatches(password: string, configuredPassword?: string | null) {
  const configured = configuredPassword?.trim()
  if (!configured) return false

  if (isBcryptHash(configured)) {
    return bcrypt.compare(password, configured)
  }

  return password === configured
}

type Matched = {
  username: string
  name: string
  role: 'admin' | 'contributor'
  userId: string | null
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const username = typeof body.username === 'string' ? body.username.trim() : ''
    const password = typeof body.password === 'string' ? body.password : ''

    const adminUsername = process.env.ADMIN_USERNAME?.trim()
    const adminPassword = process.env.ADMIN_PASSWORD
    const jwtSecret     = process.env.JWT_SECRET?.trim()

    if (!jwtSecret) {
      console.error('[login] JWT_SECRET not configured in environment variables')
      return NextResponse.json({ message: 'Service unavailable' }, { status: 503 })
    }

    // Refuse before doing any password work, so a locked-out caller cannot use
    // the endpoint's response time to learn anything either.
    const throttleKey = clientKey(request)
    const retryAfter = retryAfterSeconds(throttleKey)
    if (retryAfter > 0) {
      return NextResponse.json(
        { message: 'Too many failed attempts. Try again shortly.' },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } },
      )
    }

    let matched: Matched | null = null

    // 1. The owner account, still from the environment. Kept ahead of the
    //    database so a bad migration or an unreachable Supabase can never lock
    //    the owner out of their own admin panel.
    if (adminUsername && adminPassword && username === adminUsername && await passwordMatches(password, adminPassword)) {
      matched = { username: adminUsername, name: adminUsername, role: 'admin', userId: null }
    }

    // 2. Everyone else: one row per person in admin_users. This is what makes
    //    two writers two different people -- separate passwords, separate
    //    bylines, and drafts scoped to whoever actually wrote them.
    if (!matched) {
      const user = await verifyAdminUser(username, password)
      if (user) {
        matched = { username: user.username, name: user.displayName, role: user.role, userId: user.id }
        await recordLogin(user.id)
      }
    }

    // 3. Legacy single shared contributor login from the environment.
    //    Superseded by admin_users -- delete CONTRIBUTOR_USERNAME and
    //    CONTRIBUTOR_PASSWORD_HASH from the environment once every writer has
    //    their own account, since anyone holding this one signs in as a writer
    //    who is not tracked in the team list.
    const contributorUsername     = process.env.CONTRIBUTOR_USERNAME?.trim()
    const contributorPassword     = process.env.CONTRIBUTOR_PASSWORD
    const contributorPasswordHash = process.env.CONTRIBUTOR_PASSWORD_HASH?.trim()
    if (!matched && contributorUsername && (contributorPasswordHash || contributorPassword)) {
      const matchesHash = contributorPasswordHash
        ? await passwordMatches(password, contributorPasswordHash)
        : false
      const matchesPlain = contributorPassword
        ? await passwordMatches(password, contributorPassword)
        : false

      if (username === contributorUsername && (matchesHash || matchesPlain)) {
        matched = {
          username: contributorUsername,
          name: contributorUsername,
          role: 'contributor',
          userId: null,
        }
      }
    }

    if (!matched) {
      recordFailure(throttleKey)
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 })
    }

    // A correct password clears the counter, so ordinary mistyping never
    // accumulates toward a lockout for someone who does know the password.
    recordSuccess(throttleKey)

    const token = jwt.sign(
      { username: matched.username, name: matched.name, uid: matched.userId, role: matched.role },
      jwtSecret,
      { expiresIn: '24h' }
    )

    const response = NextResponse.json({
      message: 'Login successful',
      username: matched.username,
      name: matched.name,
      role: matched.role,
      token,
    })

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
