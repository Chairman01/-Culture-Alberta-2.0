import bcrypt from 'bcryptjs'
import { getServiceClient } from '@/lib/supabase-admin'

/**
 * Accounts for the people who can sign in to /admin.
 *
 * Server-only: every function here touches password hashes and must never be
 * imported into a client component.
 */

export type AdminUserRole = 'admin' | 'contributor'

export type AdminUser = {
  id: string
  username: string
  displayName: string
  role: AdminUserRole
  isActive: boolean
  createdAt: string
  lastLoginAt: string | null
}

type AdminUserRow = {
  id: string
  username: string
  display_name: string
  password_hash: string
  role: string
  is_active: boolean
  created_at: string
  last_login_at: string | null
}

const BCRYPT_ROUNDS = 12

function toAdminUser(row: AdminUserRow): AdminUser {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    role: row.role === 'admin' ? 'admin' : 'contributor',
    isActive: row.is_active,
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at,
  }
}

/** Usernames are stored lower-cased so signing in is case-insensitive. */
export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase()
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS)
}

/**
 * A readable password to hand a new writer. Deliberately avoids characters that
 * get misread when someone copies one out of a chat message -- no 0/O, 1/l/I.
 */
export function generatePassword(): string {
  const alphabet = 'abcdefghijkmnpqrstuvwxyzACDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = new Uint32Array(20)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, b => alphabet[b % alphabet.length]).join('')
}

/**
 * Verifies a username/password pair against the accounts table.
 *
 * Returns null for a wrong password, an unknown username, and a disabled
 * account alike -- the caller must not tell those cases apart in its response,
 * or the login form becomes a way to test which usernames exist.
 */
export async function verifyAdminUser(rawUsername: string, password: string): Promise<AdminUser | null> {
  const username = normalizeUsername(rawUsername)
  if (!username || !password) return null

  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from('admin_users')
    .select('id, username, display_name, password_hash, role, is_active, created_at, last_login_at')
    .eq('username', username)
    .eq('is_active', true)
    .maybeSingle()

  // A missing table (migration not run yet) or an RLS block both land here. Log
  // it, because "nobody can log in" is otherwise a silent failure.
  if (error) {
    console.error('[admin-users] Lookup failed:', error.message)
    return null
  }
  if (!data) return null

  const row = data as AdminUserRow
  const matches = await bcrypt.compare(password, row.password_hash)
  if (!matches) return null

  return toAdminUser(row)
}

export async function recordLogin(id: string): Promise<void> {
  const supabase = getServiceClient()
  const { error } = await supabase
    .from('admin_users')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', id)
  // A failed timestamp write must never block a valid sign-in.
  if (error) console.error('[admin-users] Could not record login:', error.message)
}

export async function listAdminUsers(): Promise<AdminUser[]> {
  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from('admin_users')
    .select('id, username, display_name, password_hash, role, is_active, created_at, last_login_at')
    .order('is_active', { ascending: false })
    .order('display_name', { ascending: true })

  if (error) {
    console.error('[admin-users] List failed:', error.message)
    throw new Error('Could not load the team')
  }
  return (data as AdminUserRow[]).map(toAdminUser)
}

export async function usernameTaken(username: string): Promise<boolean> {
  const supabase = getServiceClient()
  const { data } = await supabase
    .from('admin_users')
    .select('id')
    .eq('username', normalizeUsername(username))
    .maybeSingle()
  return !!data
}

export async function createAdminUser(input: {
  username: string
  displayName: string
  password: string
  role: AdminUserRole
}): Promise<AdminUser> {
  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from('admin_users')
    .insert({
      username: normalizeUsername(input.username),
      display_name: input.displayName.trim(),
      password_hash: await hashPassword(input.password),
      role: input.role,
      is_active: true,
    })
    .select('id, username, display_name, password_hash, role, is_active, created_at, last_login_at')
    .single()

  if (error) {
    console.error('[admin-users] Create failed:', error.message)
    throw new Error(error.code === '23505' ? 'That username is already taken' : 'Could not create the account')
  }
  return toAdminUser(data as AdminUserRow)
}

export async function setAdminUserActive(id: string, isActive: boolean): Promise<void> {
  const supabase = getServiceClient()
  const { error } = await supabase.from('admin_users').update({ is_active: isActive }).eq('id', id)
  if (error) {
    console.error('[admin-users] Activation change failed:', error.message)
    throw new Error('Could not update the account')
  }
}

export async function setAdminUserPassword(id: string, password: string): Promise<void> {
  const supabase = getServiceClient()
  const { error } = await supabase
    .from('admin_users')
    .update({ password_hash: await hashPassword(password) })
    .eq('id', id)
  if (error) {
    console.error('[admin-users] Password reset failed:', error.message)
    throw new Error('Could not reset the password')
  }
}

/** How many enabled admins exist. Used to refuse removing the last one. */
export async function countActiveAdmins(): Promise<number> {
  const supabase = getServiceClient()
  const { count, error } = await supabase
    .from('admin_users')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'admin')
    .eq('is_active', true)
  if (error) {
    console.error('[admin-users] Admin count failed:', error.message)
    // Fail safe: report "more than one" only when we actually know. Returning 0
    // here would make the last-admin guard refuse every deactivation, which is
    // the harmless direction to be wrong in.
    return 0
  }
  return count ?? 0
}
