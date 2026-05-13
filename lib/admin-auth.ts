import jwt from 'jsonwebtoken'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

type AdminRole = 'admin' | 'contributor'
type AdminSession = {
  role: AdminRole
  username: string
}

/**
 * Decodes the admin_session JWT and returns the role, or null if invalid.
 */
export function getTokenRole(req: NextRequest): AdminRole | null {
  return getAdminSession(req)?.role ?? null
}

export function getAdminSession(req: NextRequest): AdminSession | null {
  const token  = req.cookies.get('admin_session')?.value
  const secret = process.env.JWT_SECRET
  if (!token || !secret) return null
  try {
    const payload = jwt.verify(token, secret) as { role?: AdminRole; username?: string }
    return {
      role: payload.role ?? 'admin',
      username: payload.username || '',
    }
  } catch {
    return null
  }
}

/**
 * Requires a valid session with role 'admin'.
 * Returns { ok: true } or { ok: false, response } to return to the client.
 */
export function requireAdmin(req: NextRequest): { ok: true; role: 'admin'; username: string } | { ok: false; response: NextResponse } {
  const session = getAdminSession(req)
  if (session?.role === 'admin') return { ok: true, role: 'admin', username: session.username }
  if (session?.role === 'contributor') {
    return { ok: false, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
}

/**
 * Requires a valid session with role 'admin' OR 'contributor'.
 */
export function requireAdminOrContributor(req: NextRequest): { ok: true; role: AdminRole; username: string } | { ok: false; response: NextResponse } {
  const session = getAdminSession(req)
  if (session?.role === 'admin' || session?.role === 'contributor') {
    return { ok: true, role: session.role, username: session.username }
  }
  return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
}
