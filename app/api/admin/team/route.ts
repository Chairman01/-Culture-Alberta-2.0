/**
 * The people who can sign in to /admin.
 * GET  /api/admin/team → every account, active first
 * POST /api/admin/team → create one, returns the generated password ONCE
 *
 * Admin only. A contributor being able to read this would hand them the list of
 * every username on the site; being able to write it would let them mint
 * themselves an admin account.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import {
  listAdminUsers,
  createAdminUser,
  usernameTaken,
  generatePassword,
  normalizeUsername,
} from '@/lib/admin-users'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const auth = requireAdmin(request)
  if (!auth.ok) return auth.response

  try {
    return NextResponse.json({ users: await listAdminUsers() })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not load the team'
    // The most likely cause by far is that the migration has not been run yet.
    return NextResponse.json(
      { error: message, hint: 'Has supabase/add-admin-users-and-review-notes.sql been run?' },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  const auth = requireAdmin(request)
  if (!auth.ok) return auth.response

  try {
    const body = await request.json()
    const username = normalizeUsername(String(body.username ?? ''))
    const displayName = String(body.displayName ?? '').trim()
    const role = body.role === 'admin' ? 'admin' : 'contributor'

    if (!/^[a-z0-9._-]{2,40}$/.test(username)) {
      return NextResponse.json(
        { error: 'Username must be 2-40 characters, letters and numbers only (dots, dashes and underscores allowed)' },
        { status: 400 },
      )
    }
    if (!displayName) {
      return NextResponse.json({ error: 'A display name is required — it becomes their byline' }, { status: 400 })
    }
    if (await usernameTaken(username)) {
      return NextResponse.json({ error: 'That username is already taken' }, { status: 409 })
    }

    // Generated rather than chosen by the admin: it is the one password nobody
    // has reused somewhere else, and it is shown exactly once.
    const password = generatePassword()
    const user = await createAdminUser({ username, displayName, password, role })

    console.log(`[team] ${auth.username} created ${role} account "${username}"`)
    return NextResponse.json({ user, password })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not create the account'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
