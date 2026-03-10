import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { decodeUnsubscribeToken } from '@/lib/newsletter/send-newsletter'

const SITE_URL = 'https://www.culturealberta.com'

/**
 * GET /api/newsletter/unsubscribe?token=<base64url>
 * One-click unsubscribe (RFC 8058) — also supports List-Unsubscribe-Post
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')

  if (!token) {
    return NextResponse.redirect(`${SITE_URL}/unsubscribe?error=invalid`)
  }

  const payload = decodeUnsubscribeToken(token)
  if (!payload) {
    return NextResponse.redirect(`${SITE_URL}/unsubscribe?error=invalid`)
  }

  const { id, email } = payload

  try {
    const { error } = await supabase
      .from('newsletter_subscriptions')
      .update({ status: 'unsubscribed', updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('email', email)

    if (error) {
      console.error('[unsubscribe] Supabase error:', error)
      return NextResponse.redirect(`${SITE_URL}/unsubscribe?error=failed`)
    }

    return NextResponse.redirect(`${SITE_URL}/unsubscribe?success=true&email=${encodeURIComponent(email)}`)
  } catch (err) {
    console.error('[unsubscribe] Error:', err)
    return NextResponse.redirect(`${SITE_URL}/unsubscribe?error=failed`)
  }
}

/**
 * POST /api/newsletter/unsubscribe
 * RFC 8058 one-click unsubscribe (email clients that support List-Unsubscribe-Post)
 */
export async function POST(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')

  if (!token) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
  }

  const payload = decodeUnsubscribeToken(token)
  if (!payload) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
  }

  const { id, email } = payload

  try {
    const { error } = await supabase
      .from('newsletter_subscriptions')
      .update({ status: 'unsubscribed', updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('email', email)

    if (error) {
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
