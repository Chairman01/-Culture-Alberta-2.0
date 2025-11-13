import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // PERFORMANCE: Aggressive edge caching for instant loads
  if (request.nextUrl.pathname.startsWith('/articles/')) {
    // Cache article pages aggressively (5 min CDN, 10 min stale-while-revalidate)
    response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600, max-age=60')
  } else if (request.nextUrl.pathname === '/' || 
             request.nextUrl.pathname === '/edmonton' || 
             request.nextUrl.pathname === '/calgary' ||
             request.nextUrl.pathname === '/culture' ||
             request.nextUrl.pathname === '/food-drink' ||
             request.nextUrl.pathname === '/events' ||
             request.nextUrl.pathname === '/guides' ||
             request.nextUrl.pathname === '/best-of') {
    // Cache main pages aggressively (2 min CDN, 5 min stale-while-revalidate)
    response.headers.set('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=300, max-age=30')
  }

  // PERFORMANCE: Add prefetch hints for faster navigation
  if (request.nextUrl.pathname.startsWith('/articles/')) {
    response.headers.set('Link', '</articles>; rel=prefetch, </events>; rel=prefetch')
  }

  return response
}

export const config = {
  matcher: [
    '/',
    '/articles/:path*',
    '/edmonton',
    '/calgary', 
    '/culture',
    '/food-drink',
    '/events'
  ]
}