import { NextRequest, NextResponse } from 'next/server'
import { getImageUrlFromQuery, proxySocialImageGet, proxySocialImageHead } from './_proxy'

// Proxy Supabase Storage images to avoid x-robots-tag: none blocking social media crawlers
export async function GET(request: NextRequest) {
    try {
        const imageUrl = getImageUrlFromQuery(request)

        if (!imageUrl) {
            return new NextResponse('Missing url parameter', { status: 400 })
        }

        return proxySocialImageGet(imageUrl)
    } catch (error) {
        console.error('Image proxy error:', error)
        return new NextResponse('Error proxying image', { status: 500 })
    }
}

// HEAD request handler - Reddit uses this to validate images before displaying
export async function HEAD(request: NextRequest) {
    try {
        const imageUrl = getImageUrlFromQuery(request)

        if (!imageUrl) {
            return new NextResponse(null, { status: 400 })
        }

        return proxySocialImageHead(imageUrl)
    } catch (error) {
        console.error('Image proxy HEAD error:', error)
        return new NextResponse(null, { status: 500 })
    }
}
