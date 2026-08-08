/**
 * Company logo proxy for the jobs board.
 *
 * None of the ATS APIs return a logo, so these are resolved from the employer's
 * domain (curated in lib/automation/ats/boards.ts) via a public favicon service.
 *
 * Proxied rather than hot-linked from the browser for three reasons: readers'
 * IPs never reach a third party, the board opens no extra external connections
 * on a page that already carries ad tech, and the response can be cached at our
 * own edge for a month instead of trusting someone else's headers.
 */

import { NextRequest, NextResponse } from 'next/server'

// Hostname only — no scheme, path, port or credentials. The value is
// interpolated into an outbound URL, so anything else is rejected outright.
const HOSTNAME = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/i

const CACHE = 'public, max-age=86400, s-maxage=2592000, stale-while-revalidate=86400'

/** 1x1 transparent GIF — served on failure so the <img> onError fallback fires. */
const BLANK = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')

function blank(status = 404) {
  return new NextResponse(new Uint8Array(BLANK), {
    status,
    headers: { 'content-type': 'image/gif', 'cache-control': CACHE },
  })
}

export async function GET(req: NextRequest) {
  const domain = req.nextUrl.searchParams.get('domain')?.toLowerCase().trim()
  if (!domain || domain.length > 253 || !HOSTNAME.test(domain)) return blank(400)

  try {
    const upstream = await fetch(
      `https://www.google.com/s2/favicons?sz=128&domain=${encodeURIComponent(domain)}`,
      { signal: AbortSignal.timeout(6000) }
    )
    if (!upstream.ok) return blank()

    const type = upstream.headers.get('content-type') ?? ''
    if (!type.startsWith('image/')) return blank()

    // Note: do NOT reject small responses as "placeholders". Checked 2026-08-04
    // — every domain returns a distinct image (different hashes), so a small
    // payload means a simple or low-resolution favicon, not a generic fallback.
    // Cenovus, Enbridge and alberta.ca all sit under 400 bytes with real marks.
    return new NextResponse(await upstream.arrayBuffer(), {
      headers: { 'content-type': type, 'cache-control': CACHE },
    })
  } catch {
    return blank()
  }
}
