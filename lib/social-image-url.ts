const SITE_URL = 'https://www.culturealberta.com'
const DEFAULT_OG_IMAGE = `${SITE_URL}/images/culture-alberta-og.jpg`

export function encodeSocialImageUrl(imageUrl: string): string {
  return Buffer.from(imageUrl, 'utf8').toString('base64url')
}

export function decodeSocialImageUrl(encodedUrl: string): string | null {
  try {
    return Buffer.from(encodedUrl, 'base64url').toString('utf8')
  } catch {
    return null
  }
}

/**
 * The URL we advertise as og:image. Supabase Storage sends an x-robots-tag that
 * stops social crawlers from using the image directly, so those go through our
 * own proxy route instead.
 */
export function getSocialImageUrl(imageUrl?: string | null): string {
  if (!imageUrl || imageUrl.startsWith('data:image')) {
    return DEFAULT_OG_IMAGE
  }

  const absoluteUrl = imageUrl.startsWith('http://') || imageUrl.startsWith('https://')
    ? imageUrl
    : imageUrl.startsWith('/')
      ? `${SITE_URL}${imageUrl}`
      : `${SITE_URL}/${imageUrl}`

  if (absoluteUrl.includes('supabase.co/storage')) {
    return `${SITE_URL}/og-image/${encodeSocialImageUrl(absoluteUrl)}/preview.jpg`
  }

  return absoluteUrl
}

/**
 * Pull the og:image (and the article page itself) through the CDN right after
 * publishing, so the first real visitor is a warm cache hit.
 *
 * This exists for Reddit. Reddit only renders the big title+image card when its
 * crawler downloads the og:image inside a short timeout; if the fetch is slow it
 * silently falls back to the compact card with the excerpt and a tiny thumbnail.
 * The proxy route is a cold serverless function on a freshly published article,
 * and Reddit's crawler is normally the very first request to hit it — so it was
 * the one paying the cold-start cost, and the card type came down to luck.
 */
export async function warmSocialPreview(imageUrl?: string | null, slug?: string | null): Promise<void> {
  const targets = [getSocialImageUrl(imageUrl)]
  if (slug) targets.push(`${SITE_URL}/articles/${slug}`)

  await Promise.all(targets.map(async (url) => {
    try {
      const response = await fetch(url, {
        cache: 'no-store',
        headers: { 'User-Agent': 'CultureAlbertaSocialWarmer/1.0' },
      })
      // Drain the body — the CDN only stores a response that was read in full.
      await response.arrayBuffer()
    } catch {
      /* non-fatal: a cold crawl is still a working crawl, just a slower one */
    }
  }))
}
