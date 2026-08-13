import { Resend } from 'resend'
import { supabase } from '@/lib/supabase'
import { fetchNewsletterContent } from './fetch-articles'
import { recordCitySent, getNewsletterConfig, CITY_EDITIONS } from './config'
import type { NewsletterTopic } from '@/lib/signup-source'
import {
  generateNewsletterHtml,
  getSubjectLine,
  type NewsletterCity,
} from './template'

// Lazy so importing this module never throws — Resend's constructor rejects a
// missing key, which breaks `next build` page-data collection in environments
// without RESEND_API_KEY (e.g. local builds).
let _resend: Resend | null = null
function getResend(): Resend {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY)
  return _resend
}
const FROM_EMAIL = 'news@culturemedia.ca'
const FROM_NAME = 'Culture Alberta'
const SITE_URL = 'https://www.culturealberta.com'
const BATCH_SIZE = 50 // Resend batch API supports up to 100 per request

// ── Token helpers ─────────────────────────────────────────────────────────────
function makeUnsubscribeToken(id: string, email: string): string {
  const payload = JSON.stringify({ id, email })
  return Buffer.from(payload).toString('base64url')
}

export function decodeUnsubscribeToken(token: string): { id: string; email: string } | null {
  try {
    const payload = JSON.parse(Buffer.from(token, 'base64url').toString('utf8'))
    if (!payload.id || !payload.email) return null
    return payload as { id: string; email: string }
  } catch {
    return null
  }
}

// ── Email validation ──────────────────────────────────────────────────────────
// Resend's batch API is all-or-nothing: a single malformed `to` rejects the ENTIRE
// batch, so one bad address would block up to BATCH_SIZE valid recipients. Filter
// invalid addresses out before batching and report them as skipped.
function isValidEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return /^[^@\s]+@[^@\s]+\.[a-zA-Z]{2,}$/.test(email.trim())
}

// ── Subscriber fetching ───────────────────────────────────────────────────────
/**
 * Active subscribers for one city AND one topic.
 *
 * The topic filter is the guarantee that a jobs email never lands in a culture
 * reader's inbox — each topic is a separate CASL express consent, so sending
 * across lists would be sending without consent, not just a bad experience.
 * Existing rows default to {culture}, so the culture send is unchanged.
 */
async function getActiveSubscribers(
  city: NewsletterCity,
  topic: NewsletterTopic = 'culture'
): Promise<{ id: string; email: string }[]> {
  const base = supabase
    .from('newsletter_subscriptions')
    .select('id, email')
    .eq('status', 'active')
    .contains('topics', [topic])

  // The Alberta edition is defined by exclusion: everyone active who is not on
  // one of the seven city lists. Matching on city = 'alberta' would catch only
  // rows literally stored that way and miss the buckets this exists to serve
  // ('other-alberta', 'other', 'outside-alberta', a typo, a value added later).
  // Defining it as the complement means nobody can be stranded again.
  const { data, error } = city === 'alberta'
    ? await base.not('city', 'in', `(${CITY_EDITIONS.join(',')})`)
    : await base.eq('city', city)

  if (error || !data) return []
  return data as { id: string; email: string }[]
}

// ── Send result type ──────────────────────────────────────────────────────────
export interface SendResult {
  city: NewsletterCity
  sent: number
  failed: number
  skipped: number
  errors: string[]
}

export interface SendOptions {
  customNote?: string
  /**
   * Send even if this city already went out today. Requires a deliberate act —
   * never set by the cron. See the guard below.
   */
  force?: boolean
}

/**
 * Minimum gap between two sends to the same city.
 *
 * Deliberately an interval rather than a calendar-day check. The scheduled run
 * is 24h apart so it always clears this, but a calendar comparison would happily
 * allow an 8pm send followed by an 8am one — different days, twelve hours apart,
 * two emails in one night from the reader's point of view.
 */
const MIN_SEND_INTERVAL_HOURS = 20

/**
 * Was this city sent too recently?
 *
 * `last_sent_at` was recorded from the beginning but never read, so nothing
 * stopped an edition going out twice. On 2026-08-03 an accidental request to
 * the send endpoint mailed 1,032 subscribers across all seven cities. One
 * unlucky probe should not be able to blast a whole list.
 */
async function sentTooRecently(city: NewsletterCity): Promise<{ blocked: boolean; hoursAgo?: number }> {
  try {
    const config = await getNewsletterConfig(city)
    if (!config.last_sent_at) return { blocked: false }
    const hoursAgo = (Date.now() - new Date(config.last_sent_at).getTime()) / 3_600_000
    return { blocked: hoursAgo < MIN_SEND_INTERVAL_HOURS, hoursAgo }
  } catch {
    // If the check itself fails, refuse to send. A missed newsletter is
    // recoverable; a duplicate blast to the whole list is not.
    return { blocked: true }
  }
}

// ── Core send function ────────────────────────────────────────────────────────
export async function sendCityNewsletter(city: NewsletterCity, options?: SendOptions): Promise<SendResult> {
  const result: SendResult = { city, sent: 0, failed: 0, skipped: 0, errors: [] }

  // 0. Refuse to send the same city twice inside the minimum interval.
  if (!options?.force) {
    const recent = await sentTooRecently(city)
    if (recent.blocked) {
      const ago = recent.hoursAgo !== undefined ? ` (${recent.hoursAgo.toFixed(1)}h ago)` : ''
      result.errors.push(
        `Skipped ${city}: last sent${ago}, under the ${MIN_SEND_INTERVAL_HOURS}h minimum. Pass force to override.`
      )
      return result
    }
  }

  // 1. Get subscribers
  const subscribers = await getActiveSubscribers(city)
  if (subscribers.length === 0) {
    result.skipped = 0
    return result
  }

  // 1b. Drop malformed addresses so one bad email can't fail an entire batch.
  const validSubscribers = subscribers.filter((sub) => isValidEmail(sub.email))
  const invalidSubscribers = subscribers.filter((sub) => !isValidEmail(sub.email))
  if (invalidSubscribers.length > 0) {
    result.skipped += invalidSubscribers.length
    result.errors.push(
      `Skipped ${invalidSubscribers.length} invalid email address(es): ${invalidSubscribers.map((sub) => sub.email).join(', ')}`
    )
  }
  if (validSubscribers.length === 0) {
    return result
  }

  // 2. Fetch content (once for all subscribers)
  let content
  try {
    content = await fetchNewsletterContent(city)
  } catch (err) {
    result.errors.push(`Content fetch failed: ${err instanceof Error ? err.message : 'Unknown'}`)
    result.failed = validSubscribers.length
    return result
  }

  // If no articles at all, skip sending
  if (content.cityArticles.length === 0) {
    result.skipped += validSubscribers.length
    result.errors.push('No content available for this city — skipped sending')
    return result
  }

  const subject = getSubjectLine(city)

  // 3. Send in batches using Resend's batch API (one API call per batch, no rate limit issues)
  for (let i = 0; i < validSubscribers.length; i += BATCH_SIZE) {
    const batch = validSubscribers.slice(i, i + BATCH_SIZE)

    const emailPayloads = batch.map((sub) => {
      const token = makeUnsubscribeToken(sub.id, sub.email)
      const unsubscribeUrl = `${SITE_URL}/api/newsletter/unsubscribe?token=${encodeURIComponent(token)}`
      const html = generateNewsletterHtml(city, content, unsubscribeUrl, options)
      return {
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: sub.email.trim(),
        subject,
        html,
        headers: {
          'List-Unsubscribe': `<${unsubscribeUrl}>, <mailto:${FROM_EMAIL}?subject=unsubscribe>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      }
    })

    try {
      const { data: batchData, error: batchError } = await getResend().batch.send(emailPayloads)
      if (batchError) {
        result.failed += batch.length
        result.errors.push(`Batch error: ${batchError.message}`)
      } else {
        result.sent += batch.length
      }
    } catch (err) {
      result.failed += batch.length
      result.errors.push(`Batch failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }

    // Small pause between batches if sending more than 50 subscribers
    if (i + BATCH_SIZE < validSubscribers.length) {
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  }

  // Record the send time so the admin panel can show "Sent today"
  if (result.sent > 0) {
    await recordCitySent(city)
  }

  return result
}

// ── Send all cities ───────────────────────────────────────────────────────────
/**
 * Send every edition in one action — the "send all" path. Seven cities only.
 *
 * 'alberta' is deliberately excluded. It has its own card in the admin panel
 * and answers to an explicit ?city=alberta request, so it is never unreachable
 * — it just isn't swept up by "send everything".
 *
 * Two reasons. Its readers opted in expecting a city brief and are about to
 * receive something new, so the first few should go out as a decision rather
 * than as a side effect of a bulk action. And one careless click here already
 * mailed 1,032 people across all seven cities on 2026-08-03; a new list is
 * worth keeping out of the blast radius until it has a rhythm.
 *
 * Add it here once it does.
 */
export async function sendAllNewsletters(): Promise<SendResult[]> {
  const cities: NewsletterCity[] = ['edmonton', 'calgary', 'lethbridge', 'medicine-hat', 'red-deer', 'grande-prairie', 'fort-mcmurray']
  const results: SendResult[] = []

  for (const city of cities) {
    const result = await sendCityNewsletter(city)
    results.push(result)
  }

  return results
}

// ── Test send to a single address ─────────────────────────────────────────────
export async function sendCityNewsletterToEmail(
  city: NewsletterCity,
  toEmail: string,
  options?: SendOptions,
): Promise<SendResult> {
  const result: SendResult = { city, sent: 0, failed: 0, skipped: 0, errors: [] }

  let content
  try {
    content = await fetchNewsletterContent(city)
  } catch (err) {
    result.errors.push(`Content fetch failed: ${err instanceof Error ? err.message : 'Unknown'}`)
    result.failed = 1
    return result
  }

  if (content.cityArticles.length === 0) {
    result.skipped = 1
    result.errors.push('No content available for this city — skipped sending')
    return result
  }

  const subject = `[TEST] ${getSubjectLine(city)}`
  const unsubscribeUrl = `https://www.culturealberta.com/unsubscribe`
  const html = generateNewsletterHtml(city, content, unsubscribeUrl, options)

  try {
    const { error: sendError } = await getResend().emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: toEmail,
      subject,
      html,
    })

    if (sendError) {
      result.failed = 1
      result.errors.push(sendError.message)
    } else {
      result.sent = 1
    }
  } catch (err) {
    result.failed = 1
    result.errors.push(err instanceof Error ? err.message : 'Unknown error')
  }

  return result
}
