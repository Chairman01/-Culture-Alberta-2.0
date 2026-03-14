import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Resend sends webhook events for email lifecycle events.
// Set the webhook URL in Resend dashboard → Webhooks → Add endpoint:
//   https://www.culturealberta.com/api/webhooks/resend
// Events to subscribe: email.delivered, email.opened, email.clicked, email.bounced, email.complained

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
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
