/**
 * Quick diagnostic endpoint — tests whether TICKETMASTER_API_KEY is valid.
 * Returns a clear pass/fail with details so the admin knows exactly what to fix.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = requireAdmin(req)
  if (!auth.ok) return auth.response

  const apiKey = process.env.TICKETMASTER_API_KEY

  // 1. Key not set at all
  if (!apiKey) {
    return NextResponse.json({
      ok: false,
      stage: 'missing',
      message: 'TICKETMASTER_API_KEY is not set in environment variables.',
      fix: 'Go to vercel.com → your project → Settings → Environment Variables and add TICKETMASTER_API_KEY with your Consumer Key from developer.ticketmaster.com',
    })
  }

  // 2. Key has obvious formatting issues
  const trimmed = apiKey.trim()
  if (trimmed !== apiKey) {
    return NextResponse.json({
      ok: false,
      stage: 'whitespace',
      message: 'TICKETMASTER_API_KEY has leading or trailing whitespace.',
      keyLength: apiKey.length,
      trimmedLength: trimmed.length,
      fix: 'Go to Vercel → Environment Variables, delete the key and re-paste it without any spaces.',
    })
  }

  // 3. Key looks suspiciously short (Consumer Key is usually 32 chars)
  if (apiKey.length < 20) {
    return NextResponse.json({
      ok: false,
      stage: 'too_short',
      message: `Key is only ${apiKey.length} characters — a valid Consumer Key is typically 32 characters.`,
      fix: 'Make sure you are copying the Consumer Key (not Consumer Secret) from developer.ticketmaster.com.',
    })
  }

  // 4. Make a real test call to the Ticketmaster API
  try {
    const testUrl = `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${encodeURIComponent(apiKey)}&city=Calgary&stateCode=AB&countryCode=CA&size=1`
    const res = await fetch(testUrl, { next: { revalidate: 0 } })
    const body = await res.text()

    if (res.ok) {
      let eventCount = 0
      try {
        const json = JSON.parse(body)
        eventCount = json?._embedded?.events?.length ?? 0
      } catch { /* ignore */ }

      return NextResponse.json({
        ok: true,
        stage: 'success',
        message: `API key is valid. Test call to Calgary returned ${eventCount} event(s).`,
        keyPreview: `${apiKey.slice(0, 4)}...${apiKey.slice(-4)} (${apiKey.length} chars)`,
        httpStatus: res.status,
      })
    }

    // Parse Ticketmaster error
    let tmError = body
    try {
      const json = JSON.parse(body)
      tmError = json?.fault?.faultstring ?? json?.fault?.detail?.errorcode ?? body
    } catch { /* ignore */ }

    return NextResponse.json({
      ok: false,
      stage: 'api_error',
      message: `Ticketmaster API returned ${res.status}: ${tmError}`,
      keyPreview: `${apiKey.slice(0, 4)}...${apiKey.slice(-4)} (${apiKey.length} chars)`,
      httpStatus: res.status,
      fix: res.status === 401
        ? 'Your key was rejected. Make sure you copied the Consumer Key (not Consumer Secret) from https://developer.ticketmaster.com/. Delete the current value in Vercel and paste it fresh.'
        : 'Unexpected API error — check https://developer.ticketmaster.com/ for status.',
    })
  } catch (err) {
    return NextResponse.json({
      ok: false,
      stage: 'network_error',
      message: `Could not reach Ticketmaster API: ${err instanceof Error ? err.message : String(err)}`,
      fix: 'Check that your Vercel deployment can reach external APIs (no firewall rules blocking outbound requests).',
    })
  }
}
