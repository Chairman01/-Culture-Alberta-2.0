import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase-admin'

// See app/api/newsletter/route.ts — subscriber rows are service-role only.
const supabase = getServiceClient()
import { decodeUnsubscribeToken } from '@/lib/newsletter/send-newsletter'

const SITE_URL = 'https://www.culturealberta.com'

type Outcome = 'ok' | 'invalid' | 'failed'

/**
 * Unsubscribe, from everything or from one list.
 *
 * Without `topic` this is what it always was: the whole row goes to
 * 'unsubscribed' and nothing more is sent to that address.
 *
 * With `topic=jobs` (or `culture`) only that list is dropped, so someone who
 * is tired of the jobs email keeps the newsletter they still want, and the
 * other way round. Dropping the last remaining topic unsubscribes the row
 * outright — an active subscriber to nothing is not a state worth having.
 */
async function unsubscribe(token: string | null, topic: string | null): Promise<{ outcome: Outcome; email?: string }> {
  if (!token) return { outcome: 'invalid' }
  const payload = decodeUnsubscribeToken(token)
  if (!payload) return { outcome: 'invalid' }
  const { id, email } = payload
  const now = new Date().toISOString()

  try {
    if (topic === 'jobs' || topic === 'culture') {
      const { data: row, error: readErr } = await supabase
        .from('newsletter_subscriptions')
        .select('topics')
        .eq('id', id)
        .eq('email', email)
        .maybeSingle()
      if (readErr) return { outcome: 'failed', email }
      // Unknown row: nothing to remove, and nothing more will be sent.
      if (!row) return { outcome: 'ok', email }

      const remaining = ((row.topics ?? ['culture']) as string[]).filter(t => t !== topic)
      const { error } = await supabase
        .from('newsletter_subscriptions')
        .update(
          remaining.length > 0
            ? { topics: remaining, updated_at: now }
            : { status: 'unsubscribed', updated_at: now }
        )
        .eq('id', id)
        .eq('email', email)
      return { outcome: error ? 'failed' : 'ok', email }
    }

    const { error } = await supabase
      .from('newsletter_subscriptions')
      .update({ status: 'unsubscribed', updated_at: now })
      .eq('id', id)
      .eq('email', email)
    if (error) console.error('[unsubscribe] Supabase error:', error)
    return { outcome: error ? 'failed' : 'ok', email }
  } catch (err) {
    console.error('[unsubscribe] Error:', err)
    return { outcome: 'failed', email }
  }
}

/**
 * GET /api/newsletter/unsubscribe?token=<base64url>[&topic=jobs]
 * The link in the email footer.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  const topic = req.nextUrl.searchParams.get('topic')
  const { outcome, email } = await unsubscribe(token, topic)

  if (outcome !== 'ok') {
    return NextResponse.redirect(`${SITE_URL}/unsubscribe?error=${outcome}`)
  }
  const which = topic === 'jobs' || topic === 'culture' ? `&topic=${topic}&token=${encodeURIComponent(token!)}` : ''
  return NextResponse.redirect(`${SITE_URL}/unsubscribe?success=true&email=${encodeURIComponent(email!)}${which}`)
}

/**
 * POST /api/newsletter/unsubscribe?token=...[&topic=jobs]
 * RFC 8058 one-click unsubscribe, sent by the mail client itself.
 */
export async function POST(req: NextRequest) {
  const { outcome } = await unsubscribe(
    req.nextUrl.searchParams.get('token'),
    req.nextUrl.searchParams.get('topic')
  )
  if (outcome === 'invalid') return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
  if (outcome === 'failed') return NextResponse.json({ error: 'Database error' }, { status: 500 })
  return NextResponse.json({ success: true })
}
