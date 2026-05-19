import { NextRequest, NextResponse } from 'next/server'
import { decodeSocialImageUrl } from '@/lib/social-image-url'
import { proxySocialImageGet, proxySocialImageHead } from '../_proxy'

type RouteContext = {
  params: Promise<{
    encodedUrl: string
  }>
}

async function getImageUrl(context: RouteContext): Promise<string | null> {
  const { encodedUrl } = await context.params

  return decodeSocialImageUrl(encodedUrl)
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const imageUrl = await getImageUrl(context)

    if (!imageUrl) {
      return new NextResponse('Invalid image URL', { status: 400 })
    }

    return proxySocialImageGet(imageUrl)
  } catch (error) {
    console.error('Image proxy error:', error)
    return new NextResponse('Error proxying image', { status: 500 })
  }
}

export async function HEAD(_request: NextRequest, context: RouteContext) {
  try {
    const imageUrl = await getImageUrl(context)

    if (!imageUrl) {
      return new NextResponse(null, { status: 400 })
    }

    return proxySocialImageHead(imageUrl)
  } catch (error) {
    console.error('Image proxy HEAD error:', error)
    return new NextResponse(null, { status: 500 })
  }
}
