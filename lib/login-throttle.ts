/**
 * Brute-force protection for the admin login.
 *
 * The login form accepted unlimited attempts, so the admin password was the
 * only thing between the internet and full control of the site -- and it could
 * be guessed at machine speed.
 *
 * The response escalates rather than slamming shut. Three attempts are free,
 * because ordinary people mistype passwords and a password manager can misfire;
 * the fourth and fifth each cost a short wait; past that it is a real lockout.
 * A very low hard limit is worse than it sounds -- it locks the owner out over
 * typos, and it hands anyone who knows the username a way to lock them out
 * deliberately. What actually defeats guessing is that the rate collapses, not
 * that the wall arrives on attempt two.
 *
 * Deliberately in-memory rather than a table. A burst of attempts on one
 * connection is the shape of an automated attack, and this stops it without
 * putting a database round-trip in front of every sign-in. An attacker spread
 * across many cold instances gets more attempts than the numbers suggest, which
 * is the accepted trade -- it still turns unlimited guessing into a crawl, and
 * it cannot fail in a way that locks the owner out permanently.
 */

type Attempt = { count: number; firstAt: number; blockedUntil: number }

/** Attempts before the wait starts. */
const FREE_ATTEMPTS = 3
/** Attempts before the full lockout. */
const MAX_ATTEMPTS = 5
/** Escalating waits for attempts 4 and 5. */
const COOLDOWNS_MS = [30 * 1000, 2 * 60 * 1000]
const BLOCK_MS = 15 * 60 * 1000
const WINDOW_MS = 10 * 60 * 1000
const MAX_TRACKED = 5000

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
  if (attempts.size >= MAX_TRACKED) {
    const oldest = [...attempts.entries()].sort((a, b) => a[1].firstAt - b[1].firstAt)
    for (let i = 0; i < Math.floor(MAX_TRACKED / 4); i++) attempts.delete(oldest[i][0])
  }
}

/** Seconds the caller must wait, or 0 when they may try now. */
export function retryAfterSeconds(key: string, now = Date.now()): number {
  const a = attempts.get(key)
  if (!a) return 0
  // An expired counting window is a clean slate.
  if (now >= a.blockedUntil && now - a.firstAt > WINDOW_MS) return 0
  if (now >= a.blockedUntil) return 0
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
    console.warn(`[login] ${key} hit the attempt limit — locked out for ${BLOCK_MS / 60000}m`)
    return
  }

  if (a.count > FREE_ATTEMPTS) {
    const cooldown = COOLDOWNS_MS[a.count - FREE_ATTEMPTS - 1] ?? COOLDOWNS_MS[COOLDOWNS_MS.length - 1]
    a.blockedUntil = now + cooldown
  }
}

/** A correct password clears the record, so normal use never accumulates. */
export function recordSuccess(key: string): void {
  attempts.delete(key)
}
