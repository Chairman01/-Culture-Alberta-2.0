/**
 * One person, one subscriber: email addresses compared without regard to case.
 *
 * The unique index on newsletter_subscriptions.email is case-sensitive, and
 * signup looked people up with an exact match. So "Jane@Gmail.com" signing up
 * again as "jane@gmail.com" got a second row, and the same person was counted
 * twice on the dashboard and mailed twice by their city edition. Five people
 * were in that state on 2026-10-05.
 *
 * Existing rows weren't rewritten (that's a bulk data change the owner hasn't
 * approved). Instead every read that counts or mails people collapses rows by
 * subscriberKey(), and signup matches case-insensitively so no new duplicates
 * are made.
 */

/** How an address is stored for new rows: trimmed and lowercase. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/** The identity two rows share when they're the same person. */
export function subscriberKey(email: string | null | undefined): string {
  return (email ?? '').trim().toLowerCase()
}

/**
 * A PostgREST ilike pattern that matches exactly this address, any case.
 * `_` and `%` are wildcards in LIKE, and `_` is common in addresses, so they
 * are escaped; without that "a_b@x.com" would also match "axb@x.com".
 */
export function exactEmailPattern(email: string): string {
  return email.trim().replace(/[\\%_]/g, (c) => `\\${c}`)
}

/**
 * Keep one row per person. Rows should arrive oldest-first if the caller cares
 * which survives; an active row always beats an inactive one.
 */
export function dedupeSubscribers<T extends { email: string; status?: string | null }>(rows: T[]): T[] {
  const byKey = new Map<string, T>()
  for (const row of rows) {
    const key = subscriberKey(row.email)
    const kept = byKey.get(key)
    if (!kept || (kept.status !== 'active' && row.status === 'active')) byKey.set(key, row)
  }
  return [...byKey.values()]
}
