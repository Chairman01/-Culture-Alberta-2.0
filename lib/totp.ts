import crypto from 'node:crypto'

/**
 * Time-based one-time passwords (RFC 6238) — the six digits an authenticator
 * app shows.
 *
 * Implemented here rather than pulled from a package: the whole algorithm is a
 * counter, an HMAC and a truncation, and a dependency that generates login
 * codes is a dependency that can silently change what it accepts.
 *
 * Defaults match what every authenticator app assumes (SHA-1, 6 digits, 30s).
 * They look dated, and SHA-1 here is not a weakness -- HMAC-SHA1 is unbroken,
 * and the values are 30 seconds long regardless.
 */

const DIGITS = 6
const PERIOD = 30
const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

/** A fresh secret, base32 encoded the way authenticator apps expect. */
export function generateSecret(bytes = 20): string {
  const buf = crypto.randomBytes(bytes)
  let bits = ''
  for (const byte of buf) bits += byte.toString(2).padStart(8, '0')
  let out = ''
  for (let i = 0; i + 5 <= bits.length; i += 5) {
    out += BASE32[parseInt(bits.slice(i, i + 5), 2)]
  }
  return out
}

function base32Decode(secret: string): Buffer {
  const clean = secret.toUpperCase().replace(/[^A-Z2-7]/g, '')
  let bits = ''
  for (const char of clean) {
    const index = BASE32.indexOf(char)
    if (index === -1) continue
    bits += index.toString(2).padStart(5, '0')
  }
  const bytes: number[] = []
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2))
  }
  return Buffer.from(bytes)
}

function codeForCounter(secret: string, counter: number): string {
  const key = base32Decode(secret)
  const buf = Buffer.alloc(8)
  // Counter is a 64-bit big-endian integer. Written as two 32-bit halves
  // because a JS number cannot hold 64 bits exactly.
  buf.writeUInt32BE(Math.floor(counter / 2 ** 32), 0)
  buf.writeUInt32BE(counter >>> 0, 4)

  const hmac = crypto.createHmac('sha1', key).update(buf).digest()
  const offset = hmac[hmac.length - 1] & 0x0f
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)

  return (binary % 10 ** DIGITS).toString().padStart(DIGITS, '0')
}

/**
 * Checks a submitted code.
 *
 * `window` accepts codes from one step either side, which covers a phone whose
 * clock has drifted and the very common case of typing a code as it rolls over.
 * One step is the standard tolerance; widening it multiplies an attacker's odds
 * for no real usability gain.
 */
export function verifyCode(secret: string, submitted: string, window = 1): boolean {
  const code = submitted.replace(/\D/g, '')
  if (code.length !== DIGITS || !secret) return false

  const counter = Math.floor(Date.now() / 1000 / PERIOD)
  for (let drift = -window; drift <= window; drift++) {
    const expected = codeForCounter(secret, counter + drift)
    // Constant-time compare so the check cannot be probed a digit at a time.
    if (
      expected.length === code.length &&
      crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(code))
    ) {
      return true
    }
  }
  return false
}

/**
 * The otpauth:// URI an authenticator app understands. On a phone, tapping a
 * link with this scheme opens the app and adds the account directly, which is
 * why enrolment works here without rendering a QR code.
 */
export function otpauthUri(secret: string, account: string, issuer = 'Culture Alberta'): string {
  const label = encodeURIComponent(`${issuer}:${account}`)
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: String(DIGITS),
    period: String(PERIOD),
  })
  return `otpauth://totp/${label}?${params.toString()}`
}

/** The secret in four-character groups, which is far easier to type correctly. */
export function formatSecret(secret: string): string {
  return secret.replace(/(.{4})/g, '$1 ').trim()
}

/**
 * Single-use recovery codes, for the day someone loses their phone.
 *
 * Without these, enabling 2FA is one lost device away from being locked out of
 * your own site permanently. Returned in plain text exactly once; only bcrypt
 * hashes are stored.
 */
export function generateBackupCodes(count = 8): string[] {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789'
  return Array.from({ length: count }, () => {
    const bytes = crypto.randomBytes(10)
    const code = Array.from(bytes, b => alphabet[b % alphabet.length]).join('')
    return `${code.slice(0, 5)}-${code.slice(5)}`
  })
}
