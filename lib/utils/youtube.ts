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
 * Add width/height to img tags to prevent CLS (Cumulative Layout Shift)
 * Google recommends explicit dimensions for all images
 */
function fixImageDimensions(html: string): string {
    if (!html) return html
    return html.replace(/<img([^>]*)>/gi, (match, attrs) => {
        const hasWidth = /width\s*=/i.test(attrs)
        const hasHeight = /height\s*=/i.test(attrs)
        if (hasWidth && hasHeight) return match
        const hasStyle = /style\s*=/i.test(attrs)
        const aspectStyle = 'aspect-ratio: 16/9;'
        const styleMatch = attrs.match(/style\s*=\s*["']([^"']*)["']/i)
        if (styleMatch) {
            const style = styleMatch[1]
            if (!style.includes('aspect-ratio')) {
                const newStyle = style.trim().endsWith(';') ? `${style} ${aspectStyle}` : `${style}; ${aspectStyle}`
                return `<img${attrs.replace(/style\s*=\s*["']([^"']*)["']/i, `style="${newStyle}"`)}>`
            }
        } else {
            const style = `style="${aspectStyle} max-width:100%;height:auto;"`
            return `<img${attrs} ${style}>`
        }
        return match
    })
}

/**
 * Main function to process all YouTube content and fix images for CLS
 * This is a pure string manipulation function that works on both server and client
 */
export function processArticleContent(content: string): string {
    if (!content) return content

    // First process anchor tags with YouTube URLs
    let processed = processYouTubeAnchors(content)

    // Then process any remaining standalone YouTube URLs
    processed = processYouTubeLinks(processed)

    // Add dimensions to img tags to prevent CLS (Core Web Vitals)
    processed = fixImageDimensions(processed)

    return processed
}
