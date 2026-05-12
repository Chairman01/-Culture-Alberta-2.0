const SITE_URL = 'https://www.culturealberta.com'
const DEFAULT_OG_IMAGE = `${SITE_URL}/images/culture-alberta-og.jpg`

export function getAbsoluteImageUrl(imageUrl?: string, baseUrl: string = SITE_URL): string {
  if (!imageUrl || imageUrl.startsWith('data:image')) return DEFAULT_OG_IMAGE

  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl
  }

  if (imageUrl.startsWith('/')) {
    return `${baseUrl}${imageUrl}`
  }

  return `${baseUrl}/${imageUrl}`
}

export function getSocialPreviewImageUrl(imageUrl?: string, baseUrl: string = SITE_URL): string {
  const absoluteImageUrl = getAbsoluteImageUrl(imageUrl, baseUrl)
  const params = new URLSearchParams({ src: absoluteImageUrl })
  return `${baseUrl}/api/social-image?${params.toString()}`
}
