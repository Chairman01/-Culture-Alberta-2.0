import { NextResponse } from 'next/server'

// The news sitemap has moved to a crawlable path: /news-sitemap.xml
// (this /api/ path is blocked by robots.txt). Redirect any old references.
export async function GET() {
  return NextResponse.redirect('https://www.culturealberta.com/news-sitemap.xml', 308)
}
