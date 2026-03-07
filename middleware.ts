import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://itdmwpbsnviassgqfhxk.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0ZG13cGJzbnZpYXNzZ3FmaHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0ODU5NjUsImV4cCI6MjA2OTA2MTk2NX0.pxAXREQJrXJFZEBB3s7iwfm3rV_C383EbWCwf6ayPQo'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Check for slug redirects on article pages
  if (pathname.startsWith('/articles/')) {
    const slug = pathname.slice('/articles/'.length).replace(/\/$/, '')

    if (slug && !slug.includes('.')) {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/slug_redirects?old_slug=eq.${encodeURIComponent(slug)}&select=new_slug&limit=1`,
          {
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
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

  // Add caching headers for static content
  if (pathname.startsWith('/articles/')) {
    // Cache article pages for 5 minutes
    response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
  } else if (pathname === '/' ||
    pathname === '/edmonton' ||
    pathname === '/calgary' ||
    pathname === '/culture' ||
    pathname === '/food-drink' ||
    pathname === '/events') {
    // Cache main pages for 2 minutes
    response.headers.set('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=300')
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - sitemap.xml (sitemap)
     * - robots.txt (robots file)
     */
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
}
