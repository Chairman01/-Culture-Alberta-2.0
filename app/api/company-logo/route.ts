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
 * Where a mark is looked up, in order.
 *
 * Three sources rather than one because a single provider having a bad minute
 * — or a bad opinion about one domain — should not decide whether an employer
 * has a logo. Google resolves calgarycoop.com fine from a laptop and not at
 * all from Vercel, which left a 171-role employer showing initials while every
 * other card had its mark.
 *
 * The employer's own /favicon.ico is last and is the most authoritative of the
 * three; it is not first only because the aggregators serve a larger, squarer
 * rendition and are cheap for us to hit.
 */
const SOURCES: Array<{ url: (domain: string) => string; direct?: true }> = [
  { url: domain => `https://www.google.com/s2/favicons?sz=128&domain=${encodeURIComponent(domain)}` },
  { url: domain => `https://icons.duckduckgo.com/ip3/${encodeURIComponent(domain)}.ico`, },
  { url: domain => `https://${domain}/favicon.ico`, direct: true },
]

/** Redirect hops allowed on the direct source. Co-op's takes two. */
const MAX_HOPS = 3

/**
 * Fetch the direct source, checking every hop rather than only the first.
 *
 * Unlike the aggregators, this source puts a caller-supplied host in the URL
 * itself, so without a check the endpoint is a public, unauthenticated relay
 * into whatever the deployment can reach. Following redirects blind would
 * defeat a check on the first hop alone: calgarycoop.com/favicon.ico really
 * does redirect twice before it lands on an image, and any host can answer
 * with a redirect pointing at 169.254.169.254.
 */
async function fetchDirect(startUrl: string): Promise<Response | null> {
  let url = startUrl

  for (let hop = 0; hop < MAX_HOPS; hop++) {
    const { hostname } = new URL(url)
    if (!(await resolvesPublicly(hostname))) return null

    const res = await fetch(url, { signal: AbortSignal.timeout(6000), redirect: 'manual' })
    if (res.status < 300 || res.status > 399) return res

    const location = res.headers.get('location')
    if (!location) return null
    const next = new URL(location, url)
    if (next.protocol !== 'https:' && next.protocol !== 'http:') return null
    url = next.toString()
  }
  return null
}

/**
 * The hostname pattern already rejects bare names like `localhost`, but a
 * dotted name can still resolve inward, so the address itself is what gets
 * checked. A hostname resolving to a mix of public and private addresses is
 * rejected outright rather than raced.
 */
async function resolvesPublicly(hostname: string): Promise<boolean> {
  try {
    const { lookup } = await import('node:dns/promises')
    const addresses = await lookup(hostname, { all: true })
    if (addresses.length === 0) return false
    return addresses.every(({ address, family }) =>
      family === 4 ? isPublicIpv4(address) : isPublicIpv6(address)
    )
  } catch {
    return false
  }
}

function isPublicIpv4(address: string): boolean {
  const [a, b] = address.split('.').map(Number)
  if (a === 10 || a === 127 || a === 0) return false
  if (a === 172 && b >= 16 && b <= 31) return false
  if (a === 192 && b === 168) return false
  if (a === 169 && b === 254) return false // link-local, incl. cloud metadata
  if (a === 100 && b >= 64 && b <= 127) return false // carrier-grade NAT
  return true
}

function isPublicIpv6(address: string): boolean {
  const a = address.toLowerCase()
  if (a === '::' || a === '::1') return false
  if (a.startsWith('fe80') || a.startsWith('fc') || a.startsWith('fd')) return false
  // IPv4-mapped (::ffff:10.0.0.1) is judged on the address it actually reaches.
  const mapped = a.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
  return mapped ? isPublicIpv4(mapped[1]) : true
}

export async function GET(req: NextRequest) {
  const domain = req.nextUrl.searchParams.get('domain')?.toLowerCase().trim()
  if (!domain || domain.length > 253 || !HOSTNAME.test(domain)) return blank(400)

  for (const source of SOURCES) {
    try {
      const url = source.url(domain)
      const upstream = source.direct
        ? await fetchDirect(url)
        : await fetch(url, { signal: AbortSignal.timeout(6000) })
      if (!upstream?.ok) continue

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
