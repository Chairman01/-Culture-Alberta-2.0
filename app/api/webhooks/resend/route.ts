import { NextRequest, NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { getServiceClient } from '@/lib/supabase-admin'

// Server-side writes run on the service role, never the public anon key: the
// anon key ships in the browser bundle, so any table it can write is a table
// the internet can write.
const supabase = getServiceClient()


// Resend sends webhook events for email lifecycle events.
// Set the webhook URL in Resend dashboard → Webhooks → Add endpoint:
//   https://www.culturealberta.com/api/webhooks/resend
// Events to subscribe: email.delivered, email.opened, email.clicked,
// email.bounced, email.complained, email.delivery_delayed, email.failed

/**
 * Verifies the Svix signature Resend sends with every webhook.
 *
 * Without this the endpoint believed anyone. That mattered more than it looks:
 * the signup route refuses any address with a `bounced` event, so a forged
 * bounce permanently blocks that person from ever subscribing, and forged
 * opens/clicks quietly corrupt the numbers the Sunday meeting runs on.
 *
 * Set RESEND_WEBHOOK_SECRET to the signing secret from the Resend dashboard.
 * Until it is set the endpoint accepts and logs a warning, so adding this does
 * not silently drop real delivery events before the secret is in place.
 */
function verifySignature(rawBody: string, headers: Headers): { ok: boolean; reason?: string } {
  const secret = process.env.RESEND_WEBHOOK_SECRET?.trim()
  if (!secret) return { ok: true, reason: 'unconfigured' }

  const id = headers.get('svix-id')
  const timestamp = headers.get('svix-timestamp')
  const signatureHeader = headers.get('svix-signature')
  if (!id || !timestamp || !signatureHeader) return { ok: false, reason: 'missing signature headers' }

  // Reject anything older than five minutes so a captured request cannot be
  // replayed indefinitely.
  const age = Math.abs(Date.now() / 1000 - Number(timestamp))
  if (!Number.isFinite(age) || age > 300) return { ok: false, reason: 'stale timestamp' }

  // Svix secrets are prefixed `whsec_` and base64 encoded after the prefix.
  const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64')
  const expected = crypto
    .createHmac('sha256', key)
    .update(`${id}.${timestamp}.${rawBody}`)
    .digest('base64')

  // The header carries space-separated `v1,<sig>` entries. Compare every one in
  // constant time so the check cannot be probed a byte at a time.
  const provided = signatureHeader.split(' ').map(part => part.split(',')[1]).filter(Boolean)
  const expectedBuf = Buffer.from(expected)
  const match = provided.some(sig => {
    const buf = Buffer.from(sig)
    return buf.length === expectedBuf.length && crypto.timingSafeEqual(buf, expectedBuf)
  })

  return match ? { ok: true } : { ok: false, reason: 'signature mismatch' }
}

export async function POST(request: NextRequest) {
  try {
    // Read once as text: the signature is computed over the exact bytes sent.
    const rawBody = await request.text()

    const verified = verifySignature(rawBody, request.headers)
    if (!verified.ok) {
      console.warn(`[resend-webhook] Rejected: ${verified.reason}`)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
    if (verified.reason === 'unconfigured') {
      console.warn('[resend-webhook] RESEND_WEBHOOK_SECRET is not set — accepting unverified events')
    }

    const body = JSON.parse(rawBody)
    const { type, data } = body

    if (!type || !data) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const eventMap: Record<string, string> = {
      'email.delivered': 'delivered',
      'email.opened': 'opened',
      'email.clicked': 'clicked',
      'email.bounced': 'bounced',
      'email.complained': 'complained',
      'email.delivery_delayed': 'delivery_delayed',
      'email.failed': 'failed',
    }

    const eventType = eventMap[type]
    if (!eventType) {
      // Unknown event type — acknowledge but don't store
      return NextResponse.json({ received: true })
    }

    // Resend sends `to` as an array
    const toField = data?.to
    const email = Array.isArray(toField) ? toField[0] : toField

    if (!email) {
      return NextResponse.json({ error: 'No recipient in event' }, { status: 400 })
    }

    const clickedUrl = data?.click?.link ?? null

    const { error: insertError } = await supabase
      .from('newsletter_email_events')
      .insert({
        email,
        event_type: eventType,
        email_id: data?.email_id ?? null,
        subject: data?.subject ?? null,
        clicked_url: clickedUrl,
      })

    if (insertError) {
      console.error('Error storing email event:', insertError)
      // Still return 200 so Resend doesn't retry endlessly
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Resend webhook error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
