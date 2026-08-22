import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

type AdminRole = 'admin' | 'contributor'
type AdminSession = {
  role: AdminRole
  username: string
  /** The byline this person writes under. Falls back to the username. */
  name: string
  /** admin_users.id. Absent for the legacy environment-variable logins. */
  userId: string | null
}

/**
 * Shared decoder. Fails closed: a token whose role claim is missing or
 * unrecognised is rejected outright. Defaulting it to 'admin' meant any future
 * signing path that forgot to set the claim would silently mint full access.
 */
function decodeSession(token: string | undefined, secret: string | undefined): AdminSession | null {
  if (!token || !secret) return null
  try {
    const payload = jwt.verify(token, secret) as {
      role?: string
      username?: string
      name?: string
      uid?: string
    }
    if (payload.role !== 'admin' && payload.role !== 'contributor') return null
    const username = payload.username || ''
    return {
      role: payload.role,
      username,
      name: payload.name || username,
      userId: payload.uid || null,
    }
  } catch {
    return null
  }
}

/**
 * Decodes the admin_session JWT and returns the role, or null if invalid.
 */
export function getTokenRole(req: NextRequest): AdminRole | null {
  return getAdminSession(req)?.role ?? null
}

export function getAdminSession(req: NextRequest): AdminSession | null {
  return decodeSession(req.cookies.get('admin_session')?.value, process.env.JWT_SECRET)
}

/**
 * The same check for Server Actions, which get no NextRequest.
 *
 * Server Actions are POST endpoints. Being declared inside an admin page does
 * not protect them -- middleware only gates the *path*, so every action in a
 * page a role can open is callable by that role. Anything destructive or
 * irreversible has to check for itself, here, rather than trusting the route it
 * happens to live in.
 */
export async function getAdminSessionFromCookies(): Promise<AdminSession | null> {
  const store = await cookies()
  return decodeSession(store.get('admin_session')?.value, process.env.JWT_SECRET)
}

/** Throws unless the caller is a signed-in admin. For use inside Server Actions. */
export async function assertAdminAction(action: string): Promise<AdminSession> {
  const session = await getAdminSessionFromCookies()
  if (session?.role !== 'admin') {
    console.error(`[auth] Blocked non-admin server action: ${action} (role=${session?.role ?? 'none'})`)
    throw new Error('Not authorized')
  }
  return session
}

/** Throws unless the caller is a signed-in admin or contributor. */
export async function assertAdminOrContributorAction(action: string): Promise<AdminSession> {
  const session = await getAdminSessionFromCookies()
  if (session?.role !== 'admin' && session?.role !== 'contributor') {
    console.error(`[auth] Blocked unauthenticated server action: ${action}`)
    throw new Error('Not authorized')
  }
  return session
}

/**
 * Requires a valid session with role 'admin'.
 * Returns { ok: true } or { ok: false, response } to return to the client.
 */
export function requireAdmin(req: NextRequest):
  | { ok: true; role: 'admin'; username: string; name: string; userId: string | null }
  | { ok: false; response: NextResponse } {
  const session = getAdminSession(req)
  if (session?.role === 'admin') {
    return { ok: true, role: 'admin', username: session.username, name: session.name, userId: session.userId }
  }
  if (session?.role === 'contributor') {
    return { ok: false, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
}

/**
 * Requires a valid session with role 'admin' OR 'contributor'.
 */
export function requireAdminOrContributor(req: NextRequest):
  | { ok: true; role: AdminRole; username: string; name: string; userId: string | null }
  | { ok: false; response: NextResponse } {
  const session = getAdminSession(req)
  if (session?.role === 'admin' || session?.role === 'contributor') {
    return {
      ok: true,
      role: session.role,
      username: session.username,
      name: session.name,
      userId: session.userId,
    }
  }
  return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
}
