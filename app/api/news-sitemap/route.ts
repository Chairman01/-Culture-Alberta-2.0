import { NextResponse } from 'next/server'

// News sitemap removed — not a registered news publisher; removed to avoid Bill C-18 implications.
export async function GET() {
  return new NextResponse(null, { status: 410 })
}
