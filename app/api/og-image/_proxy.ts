import { NextRequest, NextResponse } from 'next/server'

const MAX_SOCIAL_IMAGE_BYTES = 8 * 1024 * 1024

function isAllowedImageSource(imageUrl: string): boolean {
  try {
    const url = new URL(imageUrl)

    return (
      url.protocol === 'https:' &&
      url.hostname.endsWith('.supabase.co') &&
      url.pathname.includes('/storage/v1/object/public/')
    )
  } catch {
    return false
  }
}

function getContentLength(headers: Headers): string | null {
  const contentLength = headers.get('content-length')
  if (contentLength) return contentLength

  const contentRange = headers.get('content-range')
  const totalLength = contentRange?.match(/\/(\d+)$/)?.[1]

  return totalLength || null
}

function getSharedImageHeaders(contentType: string, contentLength?: string | null): HeadersInit {
  return {
    'Content-Type': contentType,
    ...(contentLength ? { 'Content-Length': contentLength } : {}),
    'Cache-Control': 'public, max-age=31536000, immutable',
    'CDN-Cache-Control': 'public, max-age=31536000, immutable',
    'Vercel-CDN-Cache-Control': 'public, max-age=31536000, immutable',
    'Access-Control-Allow-Origin': '*',
    'Content-Disposition': 'inline',
    'X-Robots-Tag': 'all',
  }
}

async function fetchImageMetadata(imageUrl: string): Promise<Response> {
  const headers = {
    Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
    'User-Agent': 'Mozilla/5.0 (compatible; CultureAlbertaSocialBot/1.0)',
  }

  const headResponse = await fetch(imageUrl, {
    method: 'HEAD',
    headers,
  })

  if (headResponse.ok && headResponse.headers.get('content-type')?.startsWith('image/')) {
    return headResponse
  }

  return fetch(imageUrl, {
    method: 'GET',
    headers: {
      ...headers,
      Range: 'bytes=0-0',
    },
  })
}

export async function proxySocialImageGet(imageUrl: string): Promise<NextResponse> {
  if (!isAllowedImageSource(imageUrl)) {
    return new NextResponse('Invalid image source', { status: 400 })
  }

  const response = await fetch(imageUrl, {
    headers: {
      Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      'User-Agent': 'Mozilla/5.0 (compatible; CultureAlbertaSocialBot/1.0)',
    },
  })

  if (!response.ok) {
    return new NextResponse('Failed to fetch image', { status: response.status })
  }

  const imageBuffer = await response.arrayBuffer()
  const contentType = response.headers.get('content-type') || 'image/jpeg'

  if (!contentType.startsWith('image/')) {
    return new NextResponse('Invalid image type', { status: 415 })
  }

  if (imageBuffer.byteLength > MAX_SOCIAL_IMAGE_BYTES) {
    return new NextResponse('Image too large for social preview', { status: 413 })
  }

  return new NextResponse(imageBuffer, {
    status: 200,
    headers: getSharedImageHeaders(contentType, imageBuffer.byteLength.toString()),
  })
}

export async function proxySocialImageHead(imageUrl: string): Promise<NextResponse> {
  if (!isAllowedImageSource(imageUrl)) {
    return new NextResponse(null, { status: 400 })
  }

  const response = await fetchImageMetadata(imageUrl)

  if (!response.ok) {
    return new NextResponse(null, { status: response.status })
  }

  const contentType = response.headers.get('content-type') || 'image/jpeg'

  if (!contentType.startsWith('image/')) {
    return new NextResponse(null, { status: 415 })
  }

  const contentLength = getContentLength(response.headers)
  const size = contentLength ? Number(contentLength) : 0

  if (size > MAX_SOCIAL_IMAGE_BYTES) {
    return new NextResponse(null, { status: 413 })
  }

  return new NextResponse(null, {
    status: 200,
    headers: getSharedImageHeaders(contentType, contentLength),
  })
}

export function getImageUrlFromQuery(request: NextRequest): string | null {
  return new URL(request.url).searchParams.get('url')
}
