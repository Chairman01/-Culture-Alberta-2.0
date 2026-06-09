'use client'

/**
 * Returns a stable per-browser anonymous client id, stored in localStorage.
 * Used to dedupe likes and tool usage without requiring an account.
 */
const KEY = 'ca_client_id'

export function getClientId(): string {
  if (typeof window === 'undefined') return ''
  try {
    let id = window.localStorage.getItem(KEY)
    if (!id) {
      id =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`
      window.localStorage.setItem(KEY, id)
    }
    return id
  } catch {
    // localStorage unavailable (private mode / blocked) — fall back to ephemeral id
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`
  }
}
