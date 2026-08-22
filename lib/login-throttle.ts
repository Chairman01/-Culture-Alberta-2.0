/**
 * Brute-force protection for the admin login.
 *
 * The login form accepted unlimited attempts, so the admin password was the
 * only thing between the internet and full control of the site -- and it could
 * be guessed at machine speed. A few thousand attempts a minute is nothing to
 * an attacker and invisible to us.
 *
 * Deliberately in-memory rather than a table. A serverless instance handles a
 * burst of attempts on one connection, which is exactly the shape of an
 * automated attack, and this stops that without adding a database round-trip to
 * every sign-in or a dependency to install. It is not perfect -- an attacker
 * spread across many cold instances gets more attempts than the number below
 * suggests -- but it turns an unlimited guess rate into a slow one, and it
 * cannot itself fail in a way that locks the owner out permanently.
 */

type Attempt = { count: number; firstAt: number; blockedUntil: number }

const MAX_ATTEMPTS = 8
const WINDOW_MS = 10 * 60 * 1000 // attempts are counted over 10 minutes
const BLOCK_MS = 15 * 60 * 1000 // then a 15-minute lockout
const MAX_TRACKED = 5000 // bound the map so it cannot grow without limit

const attempts = new Map<string, Attempt>()

/**
 * Best-effort client identity. On Vercel, x-forwarded-for is set by the proxy
 * and its FIRST entry is the real client; later entries are spoofable, so only
 * the first is used.
 */
export function clientKey(req: { headers: { get(name: string): string | null } }): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return req.headers.get('x-real-ip')?.trim() || 'unknown'
}

function sweep(now: number) {
  if (attempts.size < MAX_TRACKED) return
  for (const [key, a] of attempts) {
    if (now > a.blockedUntil && now - a.firstAt > WINDOW_MS) attempts.delete(key)
  }
  // Still full of live entries: drop the oldest rather than grow unbounded.
  if (attempts.size >= MAX_TRACKED) {
    const oldest = [...attempts.entries()].sort((a, b) => a[1].firstAt - b[1].firstAt)
    for (let i = 0; i < Math.floor(MAX_TRACKED / 4); i++) attempts.delete(oldest[i][0])
  }
}

/** Seconds remaining on a lockout, or 0 when the caller may try again. */
export function retryAfterSeconds(key: string, now = Date.now()): number {
  const a = attempts.get(key)
  if (!a || now >= a.blockedUntil) return 0
  return Math.ceil((a.blockedUntil - now) / 1000)
}

export function recordFailure(key: string, now = Date.now()): void {
  sweep(now)
  const a = attempts.get(key)

  if (!a || now - a.firstAt > WINDOW_MS) {
    attempts.set(key, { count: 1, firstAt: now, blockedUntil: 0 })
    return
  }

  a.count += 1
  if (a.count >= MAX_ATTEMPTS) {
    a.blockedUntil = now + BLOCK_MS
    a.count = 0
    a.firstAt = now
    console.warn(`[login] Too many failed attempts from ${key} — locked out for ${BLOCK_MS / 60000}m`)
  }
}

/** A correct password clears the record, so normal use never accumulates. */
export function recordSuccess(key: string): void {
  attempts.delete(key)
}
