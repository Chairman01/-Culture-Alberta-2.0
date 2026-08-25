/**
 * PATCH /api/admin/team/:id
 *   { action: 'enable' | 'disable' }        → turn an account on or off
 *   { action: 'reset-password' }            → new password, returned ONCE
 *   { action: 'rename', displayName }       → new byline, applied to their work too
 *
 * Admin only. Accounts are disabled, never deleted, so the articles someone
 * wrote keep a resolvable author after they leave.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import {
  listAdminUsers,
  setAdminUserActive,
  setAdminUserPassword,
  setAdminUserDisplayName,
  generatePassword,
  countActiveAdmins,
} from '@/lib/admin-users'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = requireAdmin(request)
  if (!auth.ok) return auth.response

  const { id } = await params

  try {
    const body = await request.json()
    const action = String(body.action ?? '')

    const target = (await listAdminUsers()).find(u => u.id === id)
    if (!target) {
      return NextResponse.json({ error: 'No such account' }, { status: 404 })
    }

    if (action === 'disable') {
      // Two ways to lose access to your own admin panel, both worth refusing.
      if (auth.userId && auth.userId === id) {
        return NextResponse.json({ error: 'You cannot disable your own account' }, { status: 400 })
      }
      if (target.role === 'admin' && target.isActive && (await countActiveAdmins()) <= 1) {
        return NextResponse.json({ error: 'That is the last active admin — promote someone else first' }, { status: 400 })
      }
      await setAdminUserActive(id, false)
      console.log(`[team] ${auth.username} disabled "${target.username}"`)
      return NextResponse.json({ ok: true })
    }

    if (action === 'enable') {
      await setAdminUserActive(id, true)
      console.log(`[team] ${auth.username} enabled "${target.username}"`)
      return NextResponse.json({ ok: true })
    }

    if (action === 'reset-password') {
      const password = generatePassword()
      await setAdminUserPassword(id, password)
      console.log(`[team] ${auth.username} reset the password for "${target.username}"`)
      return NextResponse.json({ ok: true, password })
    }

    if (action === 'rename') {
      const displayName = String(body.displayName ?? '')
      const { articlesUpdated } = await setAdminUserDisplayName(id, displayName)
      console.log(`[team] ${auth.username} renamed "${target.username}" to "${displayName.trim()}" (${articlesUpdated} article(s) rebylined)`)
      return NextResponse.json({ ok: true, articlesUpdated })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not update the account'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
