import jwt from 'jsonwebtoken'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

type AdminRole = 'admin' | 'contributor'

/**
 * Decodes the admin_session JWT and returns the role, or null if invalid.
 */
export function getTokenRole(req: NextRequest): AdminRole | null {
  const token  = req.cookies.get('admin_session')?.value
  const secret = process.env.JWT_SECRET
  if (!token || !secret) return null
  try {
    const payload = jwt.verify(token, secret) as { role?: AdminRole }
    return payload.role ?? 'admin'
  } catch {
    return null
  }
}

/**
 * Requires a valid session with role 'admin'.
 * Returns { ok: true } or { ok: false, response } to return to the client.
 */
export function requireAdmin(req: NextRequest): { ok: true } | { ok: false; response: NextResponse } {
  const role = getTokenRole(req)
  if (role === 'admin') return { ok: true }
  if (role === 'contributor') {
    return { ok: false, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
}

/**
 * Requires a valid session with role 'admin' OR 'contributor'.
 */
export function requireAdminOrContributor(req: NextRequest): { ok: true } | { ok: false; response: NextResponse } {
  const role = getTokenRole(req)
  if (role === 'admin' || role === 'contributor') return { ok: true }
  return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
}
