import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { verifyAdminUser, recordLogin, getTotp, consumeBackupCode } from '@/lib/admin-users'
import { verifyCode } from '@/lib/totp'
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

/**
 * Is a second factor required for this identity, and against which secret?
 *
 * Two places to look, because the owner has no admin_users row: their secret
 * lives in ADMIN_TOTP_SECRET. Setting that variable is what turns 2FA on for
 * the owner, and deleting it is how they recover a lost phone -- which is why
 * the owner needs no backup codes, unlike database accounts.
 *
 * Writers are never challenged: they cannot publish, delete or send.
 */
async function secondFactorFor(matched: Matched): Promise<string | null> {
  if (matched.role !== 'admin') return null

  if (!matched.userId) {
    return process.env.ADMIN_TOTP_SECRET?.trim() || null
  }

  const totp = await getTotp(matched.userId)
  return totp?.enabled && totp.secret ? totp.secret : null
}

/**
 * Completes a login that has already passed the password step.
 *
 * The browser holds a short-lived challenge token between the two steps rather
 * than the password, so the password crosses the wire exactly once.
 */
async function completeLogin(matched: Matched, jwtSecret: string) {
  const token = jwt.sign(
    { username: matched.username, name: matched.name, uid: matched.userId, role: matched.role },
    jwtSecret,
    { expiresIn: '24h' },
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

    // ── Step two: a challenge token plus a code from the authenticator ──────
    // Handled before the password branch so the password is never resent.
    if (typeof body.challenge === 'string' && typeof body.code === 'string') {
      let claims: { m?: Matched } | null = null
      try {
        claims = jwt.verify(body.challenge, jwtSecret, { subject: '2fa' }) as { m?: Matched }
      } catch {
        return NextResponse.json({ message: 'That sign-in attempt expired. Start again.' }, { status: 401 })
      }

      const pending = claims?.m
      if (!pending) {
        return NextResponse.json({ message: 'That sign-in attempt expired. Start again.' }, { status: 401 })
      }

      const secret = await secondFactorFor(pending)
      if (!secret) return completeLogin(pending, jwtSecret)

      const submitted = body.code.trim()
      // A recovery code is only meaningful for database accounts; the owner
      // recovers by removing ADMIN_TOTP_SECRET from the environment.
      const accepted =
        verifyCode(secret, submitted) ||
        (!!pending.userId && (await consumeBackupCode(pending.userId, submitted)))

      if (!accepted) {
        recordFailure(throttleKey)
        return NextResponse.json({ message: 'That code is not right.' }, { status: 401 })
      }

      recordSuccess(throttleKey)
      return completeLogin(pending, jwtSecret)
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

    // ── Second factor, if this account has one ──────────────────────────────
    // No session cookie is issued yet: the password alone must not be enough,
    // which is the entire point. The challenge is short-lived and carries only
    // the already-verified identity.
    if (await secondFactorFor(matched)) {
      const challenge = jwt.sign({ m: matched }, jwtSecret, { subject: '2fa', expiresIn: '5m' })
      return NextResponse.json({ requires2FA: true, challenge, name: matched.name })
    }

    return completeLogin(matched, jwtSecret)
  } catch (error) {
    console.error('[login] Error:', error instanceof Error ? error.message : 'Unknown')
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
