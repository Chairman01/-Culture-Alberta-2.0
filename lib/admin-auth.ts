import jwt from 'jsonwebtoken'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

/**
 * Call at the top of any admin API route handler.
 * Returns { ok: true } if the request carries a valid admin_session cookie.
 * Returns { ok: false, response } that should be returned directly to the client.
 */
export function requireAdmin(req: NextRequest): { ok: true } | { ok: false; response: NextResponse } {
  const token   = req.cookies.get('admin_session')?.value
  const secret  = process.env.JWT_SECRET

  if (!token || !secret) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  try {
    jwt.verify(token, secret)
    return { ok: true }
  } catch {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
}
