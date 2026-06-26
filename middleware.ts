import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

async function verifyAdminJWT(token: string, secret: string): Promise<{ valid: boolean; role?: string }> {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return { valid: false }
    const [header, payload, sig] = parts

    const enc = new TextEncoder()
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    )

    const b64 = sig.replace(/-/g, '+').replace(/_/g, '/')
    const padded = b64 + '=='.slice(0, (4 - (b64.length % 4)) % 4)
    const sigBytes = Uint8Array.from(atob(padded), c => c.charCodeAt(0))

    const valid = await crypto.subtle.verify(
      'HMAC',
      keyMaterial,
      sigBytes,
      enc.encode(`${header}.${payload}`)
    )
    if (!valid) return { valid: false }

    const decodedPayload = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
    if (decodedPayload.exp && decodedPayload.exp < Math.floor(Date.now() / 1000)) return { valid: false }

    return { valid: true, role: decodedPayload.role ?? 'admin' }
  } catch {
    return { valid: false }
  }
}

const CONTRIBUTOR_ALLOWED = ['/admin/articles']

// ── Renamed-article redirects ──────────────────────────────────────────────
// When an article's title (and therefore its slug) changes, the admin API saves
// an old_slug → new_slug row in `slug_redirects`. The article page is supposed to
// honour these, but its redirect runs INSIDE the ISR-cached render, so a renamed
// URL can get baked into the full-route cache as a 200 "Article Not Found" page
// and never reach the redirect. Handling it here — in middleware, which runs at
// the edge BEFORE the route cache — guarantees a clean 308 for every renamed URL.
//
// The whole table is small (one row per rename), so we fetch it once and keep it
// in module memory for REDIRECT_TTL_MS. That means at most one tiny Supabase
// request per edge instance every few minutes, not one per article view.
type SlugRedirectMap = Record<string, string>
let slugRedirectCache: SlugRedirectMap | null = null
let slugRedirectCacheAt = 0
const REDIRECT_TTL_MS = 10 * 60 * 1000 // 10 minutes

async function getSlugRedirects(): Promise<SlugRedirectMap> {
  const now = Date.now()
  if (slugRedirectCache && now - slugRedirectCacheAt < REDIRECT_TTL_MS) {
    return slugRedirectCache
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return slugRedirectCache || {}

  try {
    const res = await fetch(`${url}/rest/v1/slug_redirects?select=old_slug,new_slug`, {
      headers: { apikey: key, authorization: `Bearer ${key}` },
    })
    if (!res.ok) return slugRedirectCache || {}

    const rows = (await res.json()) as Array<{ old_slug?: string; new_slug?: string }>
    const map: SlugRedirectMap = {}
    for (const row of rows) {
      if (row.old_slug && row.new_slug && row.old_slug !== row.new_slug) {
        map[row.old_slug] = row.new_slug
      }
    }
    slugRedirectCache = map
    slugRedirectCacheAt = now
    return map
  } catch {
    // Network/edge failure: fall back to the last good map (or none) and let the
    // page render — never block an article request on this lookup.
    return slugRedirectCache || {}
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const host = request.headers.get('host')?.toLowerCase()

  if (host === 'culturealberta.com') {
    const url = request.nextUrl.clone()
    url.hostname = 'www.culturealberta.com'
    return NextResponse.redirect(url, { status: 308 })
  }

  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const token = request.cookies.get('admin_session')?.value
    const secret = process.env.JWT_SECRET
    const result = token && secret ? await verifyAdminJWT(token, secret) : { valid: false }

    if (!result.valid) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }

    if (result.role === 'contributor') {
      const allowed = CONTRIBUTOR_ALLOWED.some(p => pathname === p || pathname.startsWith(p + '/'))
      if (!allowed) {
        return NextResponse.redirect(new URL('/admin/articles', request.url))
      }
    }
  }

  if (pathname.startsWith('/articles/')) {
    const rawSlug = pathname.slice('/articles/'.length).replace(/\/$/, '')

    if (rawSlug && rawSlug.endsWith('-')) {
      const cleanSlug = rawSlug.replace(/-+$/, '')
      return NextResponse.redirect(
        new URL(`/articles/${cleanSlug}`, request.url),
        { status: 301 }
      )
    }

    // Renamed article? 308-redirect the old slug to the current one. Runs before
    // the route cache, so it fixes URLs that got stuck as cached 200 not-found pages.
    if (rawSlug) {
      const target = (await getSlugRedirects())[rawSlug]
      if (target && target !== rawSlug) {
        return NextResponse.redirect(
          new URL(`/articles/${target}`, request.url),
          { status: 308 }
        )
      }
    }
  }

  const response = NextResponse.next()

  if (pathname.startsWith('/articles/')) {
    response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
  } else if (
    pathname === '/' ||
    pathname === '/edmonton' ||
    pathname === '/calgary' ||
    pathname === '/culture' ||
    pathname === '/food-drink' ||
    pathname === '/events'
  ) {
    response.headers.set('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=300')
  }

  return response
}

export const config = {
  matcher: [
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
}
