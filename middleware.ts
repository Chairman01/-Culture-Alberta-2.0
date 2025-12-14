import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // Add caching headers for static content
  if (request.nextUrl.pathname.startsWith('/articles/')) {
    // Cache article pages for 5 minutes
    response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
  } else if (request.nextUrl.pathname === '/' ||
    request.nextUrl.pathname === '/edmonton' ||
    request.nextUrl.pathname === '/calgary' ||
    request.nextUrl.pathname === '/culture' ||
    request.nextUrl.pathname === '/food-drink' ||
    request.nextUrl.pathname === '/events') {
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