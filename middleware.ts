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
