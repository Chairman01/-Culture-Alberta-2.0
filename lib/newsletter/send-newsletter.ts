import { Resend } from 'resend'
import { supabase } from '@/lib/supabase'
import { fetchNewsletterContent } from './fetch-articles'
import {
  generateNewsletterHtml,
  getSubjectLine,
  type NewsletterCity,
} from './template'

const resend = new Resend(process.env.RESEND_API_KEY)
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

// ── Subscriber fetching ───────────────────────────────────────────────────────
async function getActiveSubscribers(city: NewsletterCity): Promise<{ id: string; email: string }[]> {
  const { data, error } = await supabase
    .from('newsletter_subscriptions')
    .select('id, email')
    .eq('city', city)
    .eq('status', 'active')

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

// ── Core send function ────────────────────────────────────────────────────────
export async function sendCityNewsletter(city: NewsletterCity): Promise<SendResult> {
  const result: SendResult = { city, sent: 0, failed: 0, skipped: 0, errors: [] }

  // 1. Get subscribers
  const subscribers = await getActiveSubscribers(city)
  if (subscribers.length === 0) {
    result.skipped = 0
    return result
  }

  // 2. Fetch content (once for all subscribers)
  let content
  try {
    content = await fetchNewsletterContent(city)
  } catch (err) {
    result.errors.push(`Content fetch failed: ${err instanceof Error ? err.message : 'Unknown'}`)
    result.failed = subscribers.length
    return result
  }

  // If no articles at all, skip sending
  if (content.cityArticles.length === 0) {
    result.skipped = subscribers.length
    result.errors.push('No content available for this city — skipped sending')
    return result
  }

  const subject = getSubjectLine(city)

  // 3. Send in batches using Resend's batch API (one API call per batch, no rate limit issues)
  for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
    const batch = subscribers.slice(i, i + BATCH_SIZE)

    const emailPayloads = batch.map((sub) => {
      const token = makeUnsubscribeToken(sub.id, sub.email)
      const unsubscribeUrl = `${SITE_URL}/api/newsletter/unsubscribe?token=${encodeURIComponent(token)}`
      const html = generateNewsletterHtml(city, content, unsubscribeUrl)
      return {
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: sub.email,
        subject,
        html,
        headers: {
          'List-Unsubscribe': `<${unsubscribeUrl}>, <mailto:${FROM_EMAIL}?subject=unsubscribe>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      }
    })

    try {
      const { data: batchData, error: batchError } = await resend.batch.send(emailPayloads)
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
    if (i + BATCH_SIZE < subscribers.length) {
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  }

  return result
}

// ── Send all cities ───────────────────────────────────────────────────────────
export async function sendAllNewsletters(): Promise<SendResult[]> {
  const cities: NewsletterCity[] = ['edmonton', 'calgary', 'lethbridge']
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
  const html = generateNewsletterHtml(city, content, unsubscribeUrl)

  try {
    const { error: sendError } = await resend.emails.send({
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
