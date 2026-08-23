import { NextRequest, NextResponse } from 'next/server'
import { fetchNewsletterContent } from '@/lib/newsletter/fetch-articles'
import { generateNewsletterHtml, type NewsletterCity } from '@/lib/newsletter/template'
import { requireAdminOrContributor } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

const VALID_CITIES: NewsletterCity[] = ['edmonton', 'calgary', 'lethbridge', 'medicine-hat', 'red-deer', 'grande-prairie', 'fort-mcmurray', 'alberta']

/**
 * GET /api/newsletter/preview?city=edmonton
 * Returns fully rendered newsletter HTML for admin preview.
 *
 * Signed-in staff only. It sends nothing and exposes no subscriber data, but it
 * renders a whole edition on every call — a fair amount of work to leave open to
 * anyone who finds the URL. Contributors are included: preparing an edition
 * without being able to look at it is not really preparing it.
 *
 * Both callers are in-app (an iframe on the admin newsletter page, a new tab
 * from the prepare page), so the session cookie rides along either way.
 */
export async function GET(req: NextRequest) {
  const auth = requireAdminOrContributor(req)
  if (!auth.ok) return auth.response

  const city = req.nextUrl.searchParams.get('city') as NewsletterCity | null
  const customNote = req.nextUrl.searchParams.get('note') ?? undefined

  if (!city || !VALID_CITIES.includes(city)) {
    return new NextResponse(
      `<html><body style="font-family:sans-serif;padding:40px;color:#333">
        <h2>Newsletter Preview</h2>
        <p>Add <code>?city=</code> with one of: ${VALID_CITIES.map(c => `<code>${c}</code>`).join(', ')} to the URL.</p>
       </body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    )
  }

  try {
    const content = await fetchNewsletterContent(city)
    const html = generateNewsletterHtml(
      city,
      content,
      '#unsubscribe', // dummy unsubscribe link for preview
      { customNote },
    )
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
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
