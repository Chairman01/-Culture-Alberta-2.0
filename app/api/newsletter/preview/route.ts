import { NextRequest, NextResponse } from 'next/server'
import { fetchNewsletterContent } from '@/lib/newsletter/fetch-articles'
import { generateNewsletterHtml, type NewsletterCity } from '@/lib/newsletter/template'

const VALID_CITIES: NewsletterCity[] = ['edmonton', 'calgary', 'lethbridge']

/**
 * GET /api/newsletter/preview?city=edmonton
 * Returns fully rendered newsletter HTML for admin preview.
 * No auth required — preview only, no data is sent.
 */
export async function GET(req: NextRequest) {
  const city = req.nextUrl.searchParams.get('city') as NewsletterCity | null

  if (!city || !VALID_CITIES.includes(city)) {
    return new NextResponse(
      `<html><body style="font-family:sans-serif;padding:40px;color:#333">
        <h2>Newsletter Preview</h2>
        <p>Add <code>?city=edmonton</code>, <code>?city=calgary</code>, or <code>?city=lethbridge</code> to the URL.</p>
       </body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    )
  }

  try {
    const content = await fetchNewsletterContent(city)
    const html = generateNewsletterHtml(
      city,
      content,
      '#unsubscribe' // dummy unsubscribe link for preview
    )
    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  } catch (err) {
    return new NextResponse(
      `<html><body style="font-family:sans-serif;padding:40px;color:#c00">
        <h2>Preview Error</h2>
        <pre>${err instanceof Error ? err.message : String(err)}</pre>
       </body></html>`,
      { headers: { 'Content-Type': 'text/html' }, status: 500 }
    )
  }
}
