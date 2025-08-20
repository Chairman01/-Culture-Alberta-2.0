import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Allow admin routes in all environments
  // The admin layout will handle authentication
  return NextResponse.next()
}

export const config = {
  matcher: '/admin/:path*',
}
