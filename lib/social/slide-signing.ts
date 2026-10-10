import crypto from 'crypto'

// ---------------------------------------------------------------------------
// The TikTok point slides render text taken from the URL. Without a check,
// anyone could make a Culture Alberta-branded image say anything, so the text
// is signed with a server secret and the slide route refuses unsigned text.
// ---------------------------------------------------------------------------

function secret(): string {
  const s = process.env.SLIDE_SIGNING_SECRET || process.env.CRON_SECRET
  if (!s) throw new Error('SLIDE_SIGNING_SECRET or CRON_SECRET must be set to sign slide text')
  return s
}

export function encodeSlideText(text: string): string {
  return Buffer.from(text, 'utf8').toString('base64url')
}

export function decodeSlideText(encoded: string): string | null {
  try {
    return Buffer.from(encoded, 'base64url').toString('utf8')
  } catch {
    return null
  }
}

export function signSlide(slug: string, text: string): string {
  return crypto.createHmac('sha256', secret()).update(`${slug}\n${text}`).digest('base64url').slice(0, 22)
}

export function verifySlide(slug: string, text: string, signature: string): boolean {
  try {
    const expected = Buffer.from(signSlide(slug, text))
    const given = Buffer.from(signature)
    return expected.length === given.length && crypto.timingSafeEqual(expected, given)
  } catch {
    return false
  }
}
