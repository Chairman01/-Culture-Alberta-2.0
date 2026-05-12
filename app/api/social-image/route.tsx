import { ImageResponse } from 'next/og'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

const SIZE = {
  width: 1200,
  height: 630,
}

function isAllowedImageUrl(src: string): boolean {
  try {
    const url = new URL(src)
    if (url.protocol !== 'https:') return false

    const host = url.hostname.toLowerCase()
    if (host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local')) return false

    return true
  } catch {
    return false
  }
}

export async function GET(request: NextRequest) {
  const src = request.nextUrl.searchParams.get('src')

  if (!src || !isAllowedImageUrl(src)) {
    return new NextResponse('Invalid image source', { status: 400 })
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f8fafc',
          padding: 24,
        }}
      >
        <img
          src={src}
          alt=""
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
          }}
        />
      </div>
    ),
    {
      ...SIZE,
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    }
  )
}

export async function HEAD(request: NextRequest) {
  const src = request.nextUrl.searchParams.get('src')

  if (!src || !isAllowedImageUrl(src)) {
    return new NextResponse(null, { status: 400 })
  }

  return new NextResponse(null, {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
