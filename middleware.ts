import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// ── JWT verification using Web Crypto (Edge-runtime compatible) ───────────────
async function verifyAdminJWT(token: string, secret: string): Promise<boolean> {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return false
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
    if (!valid) return false

    // Check expiry
    const decodedPayload = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
    if (decodedPayload.exp && decodedPayload.exp < Math.floor(Date.now() / 1000)) return false

    return true
  } catch {
    return false
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── Admin route protection ─────────────────────────────────────────────────
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const token  = request.cookies.get('admin_session')?.value
    const secret = process.env.JWT_SECRET

    if (!token || !secret || !(await verifyAdminJWT(token, secret))) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
  }

  // ── Article slug redirects ─────────────────────────────────────────────────
  if (pathname.startsWith('/articles/')) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const slug = pathname.slice('/articles/'.length).replace(/\/$/, '')

    if (slug && !slug.includes('.') && supabaseUrl && supabaseKey) {
      try {
        const res = await fetch(
          `${supabaseUrl}/rest/v1/slug_redirects?old_slug=eq.${encodeURIComponent(slug)}&select=new_slug&limit=1`,
          {
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
            },
          }
        )
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
        // Fail silently — don't break the site if redirect lookup fails
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
