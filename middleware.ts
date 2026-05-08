import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// ── JWT verification using Web Crypto (Edge-runtime compatible) ───────────────
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

    // base64url → Uint8Array
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

    // Check expiry and extract role
    const decodedPayload = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
    if (decodedPayload.exp && decodedPayload.exp < Math.floor(Date.now() / 1000)) return { valid: false }

    return { valid: true, role: decodedPayload.role ?? 'admin' }
  } catch {
    return { valid: false }
  }
}

// Routes a contributor is allowed to access
const CONTRIBUTOR_ALLOWED = ['/admin/articles']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const host = request.headers.get('host')?.toLowerCase()

  if (host === 'culturealberta.com') {
    const url = request.nextUrl.clone()
    url.hostname = 'www.culturealberta.com'
    return NextResponse.redirect(url, { status: 308 })
  }

  // ── Admin route protection ─────────────────────────────────────────────────
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const token  = request.cookies.get('admin_session')?.value
    const secret = process.env.JWT_SECRET

    const result = token && secret ? await verifyAdminJWT(token, secret) : { valid: false }

    if (!result.valid) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }

    // Restrict contributor to articles pages only
    if (result.role === 'contributor') {
      const allowed = CONTRIBUTOR_ALLOWED.some(p => pathname === p || pathname.startsWith(p + '/'))
      if (!allowed) {
        return NextResponse.redirect(new URL('/admin/articles', request.url))
      }
    }
  }

  // ── Article slug redirects ─────────────────────────────────────────────────
  if (pathname.startsWith('/articles/')) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const rawSlug = pathname.slice('/articles/'.length).replace(/\/$/, '')

    // Normalize slugs with trailing hyphens (e.g. "...phone-" → "...phone")
    if (rawSlug && rawSlug.endsWith('-')) {
      const cleanSlug = rawSlug.replace(/-+$/, '')
      return NextResponse.redirect(
        new URL(`/articles/${cleanSlug}`, request.url),
        { status: 301 }
      )
    }

    const slug = rawSlug

    if (slug && !slug.includes('.') && supabaseUrl && supabaseKey) {
      // Use a short timeout so a slow Supabase response never causes
      // MIDDLEWARE_INVOCATION_TIMEOUT (Vercel Edge hard limit ~1.5s)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 600)
      try {
        const res = await fetch(
          `${supabaseUrl}/rest/v1/slug_redirects?old_slug=eq.${encodeURIComponent(slug)}&select=new_slug&limit=1`,
          {
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
            },
            signal: controller.signal,
          }
        )
        clearTimeout(timeoutId)
        if (res.ok) {
          const data = await res.json()
          if (data.length > 0) {
            return NextResponse.redirect(
              new URL(`/articles/${data[0].new_slug}`, request.url),
              { status: 301 }
            )
          }
        }
      } catch {
        clearTimeout(timeoutId)
        // Fail silently — don't break the site if redirect lookup fails or times out
      }
    }
  }

  const response = NextResponse.next()

  // ── Cache headers ──────────────────────────────────────────────────────────
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
