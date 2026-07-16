/**
 * Quick diagnostic endpoint — tests whether ANTHROPIC_API_KEY is valid.
 * Every auto-article generator (events, weather, jobs) writes with Claude,
 * so a bad key here fails all of them. Returns a clear pass/fail with the fix.
 *
 * Uses a 1-token call to the cheapest model so the test itself costs
 * effectively nothing.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = requireAdmin(req)
  if (!auth.ok) return auth.response

  const apiKey = process.env.ANTHROPIC_API_KEY

  if (!apiKey) {
    return NextResponse.json({
      ok: false,
      stage: 'missing',
      message: 'ANTHROPIC_API_KEY is not set in environment variables.',
      fix: 'Go to vercel.com → your project → Settings → Environment Variables and add ANTHROPIC_API_KEY with a key from console.anthropic.com → API Keys, then redeploy.',
    })
  }

  const trimmed = apiKey.trim()
  if (trimmed !== apiKey) {
    return NextResponse.json({
      ok: false,
      stage: 'whitespace',
      message: 'ANTHROPIC_API_KEY has leading or trailing whitespace.',
      fix: 'Go to Vercel → Environment Variables, delete the key and re-paste it without any spaces, then redeploy.',
    })
  }

  const keyPreview = `${apiKey.slice(0, 10)}...${apiKey.slice(-4)} (${apiKey.length} chars)`

  if (!apiKey.startsWith('sk-ant-')) {
    return NextResponse.json({
      ok: false,
      stage: 'format',
      message: 'Key does not start with "sk-ant-", so it is not an Anthropic API key.',
      keyPreview,
      fix: 'Create a key at console.anthropic.com → API Keys and paste that value into Vercel.',
    })
  }

  // Real 1-token test call
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'ping' }],
      }),
      signal: AbortSignal.timeout(15_000),
    })

    if (res.ok) {
      return NextResponse.json({
        ok: true,
        stage: 'success',
        message: 'Claude API key is valid. Article generation should work.',
        keyPreview,
        httpStatus: res.status,
      })
    }

    let detail = ''
    try {
      const json = await res.json()
      detail = json?.error?.message ?? ''
    } catch { /* ignore */ }

    const fixes: Record<number, string> = {
      401: 'The key was rejected. It may have been revoked or mistyped. Create a fresh key at console.anthropic.com → API Keys, replace ANTHROPIC_API_KEY in Vercel, and redeploy.',
      403: 'The key is valid but not permitted for this model/endpoint. Check your workspace permissions at console.anthropic.com.',
      400: 'The key authenticated but the account may be out of credit. Check Plans & Billing at console.anthropic.com.',
      429: 'Rate limited. The key works: wait a minute and generate again.',
    }

    return NextResponse.json({
      ok: false,
      stage: 'api_error',
      message: `Claude API returned ${res.status}${detail ? `: ${detail}` : ''}`,
      keyPreview,
      httpStatus: res.status,
      fix: fixes[res.status] ?? 'Unexpected API error — check status.anthropic.com.',
    })
  } catch (err) {
    return NextResponse.json({
      ok: false,
      stage: 'network_error',
      message: `Could not reach the Claude API: ${err instanceof Error ? err.message : String(err)}`,
      fix: 'Check that your deployment can reach external APIs.',
    })
  }
}
