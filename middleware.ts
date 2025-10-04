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
    '/',
    '/articles/:path*',
    '/edmonton',
    '/calgary', 
    '/culture',
    '/food-drink',
    '/events'
  ]
}