'use client'

import { useMemo } from 'react'

interface YouTubeEmbedProps {
    url: string
    className?: string
}

/**
 * Extracts YouTube video ID from various URL formats:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://www.youtube.com/shorts/VIDEO_ID
 * - https://youtube.com/shorts/VIDEO_ID
 */
function extractYouTubeId(url: string): { id: string | null; isShort: boolean } {
    if (!url) return { id: null, isShort: false }

    // Check if it's a YouTube Shorts URL
    const shortsMatch = url.match(/(?:youtube\.com\/shorts\/|youtu\.be\/shorts\/)([a-zA-Z0-9_-]{11})/)
    if (shortsMatch) {
        return { id: shortsMatch[1], isShort: true }
    }

    // Standard YouTube URL patterns
    const patterns = [
        /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
        /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
        /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
        /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
    ]

    for (const pattern of patterns) {
        const match = url.match(pattern)
        if (match) {
            return { id: match[1], isShort: false }
        }
    }

    return { id: null, isShort: false }
}

export function YouTubeEmbed({ url, className = '' }: YouTubeEmbedProps) {
    const { id, isShort } = useMemo(() => extractYouTubeId(url), [url])

    if (!id) {
        return (
            <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline"
            >
                {url}
            </a>
        )
    }

    const embedUrl = `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1`

    // Shorts have a different aspect ratio (9:16 vertical)
    if (isShort) {
        return (
            <div className={`youtube-embed youtube-short my-6 flex justify-center ${className}`}>
                <div className="relative w-full max-w-[360px]" style={{ aspectRatio: '9/16' }}>
                    <iframe
                        src={embedUrl}
                        title="YouTube Short"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        className="absolute inset-0 w-full h-full rounded-xl shadow-lg"
                    />
                </div>
            </div>
        )
    }

    // Regular videos have 16:9 aspect ratio
    return (
        <div className={`youtube-embed my-6 ${className}`}>
            <div className="relative w-full" style={{ aspectRatio: '16/9' }}>
                <iframe
                    src={embedUrl}
                    title="YouTube Video"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className="absolute inset-0 w-full h-full rounded-xl shadow-lg"
                />
            </div>
        </div>
    )
}

/**
 * Processes HTML content and replaces YouTube URLs with embed placeholders
 * that can be rendered as actual embeds
 */
export function processYouTubeLinks(content: string): string {
    if (!content) return content

    // Pattern to match YouTube URLs (not already in iframes)
    const youtubeUrlPattern = /(?<!src=["'])(https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})(?:[^\s<"']*)?)/gi

    return content.replace(youtubeUrlPattern, (match, url, videoId) => {
        // Check if this URL is inside an anchor tag - if so, replace the whole anchor
        const isShort = url.includes('/shorts/')
        const aspectRatio = isShort ? '9/16' : '16/9'
        const maxWidth = isShort ? 'max-w-[360px] mx-auto' : ''

        return `
      <div class="youtube-embed my-6 ${maxWidth}">
        <div class="relative w-full" style="aspect-ratio: ${aspectRatio};">
          <iframe
            src="https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1"
            title="YouTube Video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowfullscreen
            class="absolute inset-0 w-full h-full rounded-xl shadow-lg"
          ></iframe>
        </div>
      </div>
    `
    })
}

/**
 * Also handles anchor tags containing YouTube URLs
 */
export function processYouTubeAnchors(content: string): string {
    if (!content) return content

    // Pattern to match anchor tags with YouTube URLs
    const anchorPattern = /<a[^>]*href=["'](https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})[^"']*?)["'][^>]*>.*?<\/a>/gi

    return content.replace(anchorPattern, (match, url, videoId) => {
        const isShort = url.includes('/shorts/')
        const aspectRatio = isShort ? '9/16' : '16/9'
        const maxWidth = isShort ? 'max-w-[360px] mx-auto' : ''

        return `
      <div class="youtube-embed my-6 ${maxWidth}">
        <div class="relative w-full" style="aspect-ratio: ${aspectRatio};">
          <iframe
            src="https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1"
            title="YouTube Video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowfullscreen
            class="absolute inset-0 w-full h-full rounded-xl shadow-lg"
          ></iframe>
        </div>
      </div>
    `
    })
}

/**
 * Main function to process all YouTube content in an article
 */
export function processArticleContent(content: string): string {
    if (!content) return content

    // First process anchor tags with YouTube URLs
    let processed = processYouTubeAnchors(content)

    // Then process any remaining standalone YouTube URLs
    processed = processYouTubeLinks(processed)

    return processed
}
