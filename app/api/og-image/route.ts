import { NextRequest, NextResponse } from 'next/server'

// Proxy Supabase Storage images to avoid x-robots-tag: none blocking social media crawlers
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const imageUrl = searchParams.get('url')

        if (!imageUrl) {
            return new NextResponse('Missing url parameter', { status: 400 })
        }

        // Only allow proxying from Supabase Storage
        if (!imageUrl.includes('supabase.co/storage')) {
            return new NextResponse('Invalid image source', { status: 400 })
        }

        // Fetch the image from Supabase
        const response = await fetch(imageUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; CultureAlberta/1.0)',
            },
        })

        if (!response.ok) {
            return new NextResponse('Failed to fetch image', { status: response.status })
        }

        const imageBuffer = await response.arrayBuffer()
        const contentType = response.headers.get('content-type') || 'image/jpeg'

        // Return the image with social-media-friendly headers (no x-robots-tag)
        return new NextResponse(imageBuffer, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Content-Length': imageBuffer.byteLength.toString(),
                'Cache-Control': 'public, max-age=31536000, immutable',
                'Access-Control-Allow-Origin': '*',
                // NO x-robots-tag header - allow crawlers to index
            },
        })
    } catch (error) {
        console.error('Image proxy error:', error)
        return new NextResponse('Error proxying image', { status: 500 })
    }
}

// HEAD request handler - Reddit uses this to validate images before displaying
export async function HEAD(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const imageUrl = searchParams.get('url')

        if (!imageUrl) {
            return new NextResponse(null, { status: 400 })
        }

        if (!imageUrl.includes('supabase.co/storage')) {
            return new NextResponse(null, { status: 400 })
        }

        // Send HEAD request to Supabase to get image metadata
        const response = await fetch(imageUrl, {
            method: 'HEAD',
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; CultureAlberta/1.0)',
            },
        })

        if (!response.ok) {
            return new NextResponse(null, { status: response.status })
        }

        const contentLength = response.headers.get('content-length') || '0'
        const contentType = response.headers.get('content-type') || 'image/jpeg'

        return new NextResponse(null, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Content-Length': contentLength,
                'Cache-Control': 'public, max-age=31536000, immutable',
                'Access-Control-Allow-Origin': '*',
            },
        })
    } catch (error) {
        console.error('Image proxy HEAD error:', error)
        return new NextResponse(null, { status: 500 })
    }
}
