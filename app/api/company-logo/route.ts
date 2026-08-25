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

/**
 * A miss is cached for ten minutes, not a month.
 *
 * These are third-party lookups over the network and they fail transiently.
 * Under the long cache above, one bad moment pinned an employer's tile blank
 * at the edge until the next deploy — which is what happened to Calgary Co-op,
 * a 171-role employer whose card sat empty on the board for days while the
 * same lookup succeeded from anywhere else.
 */
const MISS_CACHE = 'public, max-age=60, s-maxage=600'

/**
 * Failure response.
 *
 * Deliberately NOT an image. This used to return a 1x1 transparent GIF, on the
 * reasoning that the <img> onError handler would fire and hand over to the
 * lettered tile — but a valid GIF decodes fine, so browsers fired `load`, and
 * the card rendered a blank white square instead of the fallback. An empty
 * body is what actually triggers onError.
 */
function blank(status = 404) {
  return new NextResponse(null, {
    status,
    headers: { 'cache-control': MISS_CACHE },
  })
}

/**
 * Favicon services, tried in order. Two rather than one because a single
 * provider having a bad minute should not decide whether an employer has a
 * logo — DuckDuckGo's icon service resolves marks Google intermittently
 * misses, and vice versa.
 */
const SOURCES = [
  (domain: string) => `https://www.google.com/s2/favicons?sz=128&domain=${encodeURIComponent(domain)}`,
  (domain: string) => `https://icons.duckduckgo.com/ip3/${encodeURIComponent(domain)}.ico`,
]

export async function GET(req: NextRequest) {
  const domain = req.nextUrl.searchParams.get('domain')?.toLowerCase().trim()
  if (!domain || domain.length > 253 || !HOSTNAME.test(domain)) return blank(400)

  for (const source of SOURCES) {
    try {
      const upstream = await fetch(source(domain), { signal: AbortSignal.timeout(6000) })
      if (!upstream.ok) continue

      const type = upstream.headers.get('content-type') ?? ''
      if (!type.startsWith('image/')) continue

      // Note: do NOT reject small responses as "placeholders". Checked 2026-08-04
      // — every domain returns a distinct image (different hashes), so a small
      // payload means a simple or low-resolution favicon, not a generic fallback.
      // Cenovus, Enbridge and alberta.ca all sit under 400 bytes with real marks.
      return new NextResponse(await upstream.arrayBuffer(), {
        headers: { 'content-type': type, 'cache-control': CACHE },
      })
    } catch {
      // Try the next source rather than giving up on the employer.
    }
  }

  return blank()
}
