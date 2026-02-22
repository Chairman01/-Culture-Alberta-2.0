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
 * Make inline article images responsive and properly displayed.
 * Removes forced aspect-ratio (which distorts portrait images) and instead
 * applies natural sizing: full-width, auto height, centered.
 */
function fixImageDimensions(html: string): string {
  if (!html) return html

  // Replace img tags
  return html.replace(/<img([^>]*)>/gi, (match, attrs) => {
    // If we've already processed this in this pass, skip
    if (attrs.includes('data-img-fixed="true"')) return match

    // 1. Strip width and height attributes from the tag itself
    let cleanedAttrs = attrs
      .replace(/\bwidth\s*=\s*["']\d*[^"']*["']/gi, '')
      .replace(/\bheight\s*=\s*["']\d*[^"']*["']/gi, '')
      .trim()

    // 2. Handle style attribute
    const styleMatch = cleanedAttrs.match(/style\s*=\s*["']([^"']*)["']/i)
    const baseStyle = 'max-width:100%; height:auto !important; aspect-ratio:auto !important; display:block; margin:1.5rem auto; border-radius:8px;'

    if (styleMatch) {
      // Strip problematic properties from existing style
      let existingStyle = styleMatch[1]
        .replace(/\baspect-ratio\s*:[^;]+;?/gi, '')
        .replace(/\bwidth\s*:[^;]+;?/gi, '')
        .replace(/\bheight\s*:[^;]+;?/gi, '')
        .trim()

      const newStyle = `${existingStyle}${existingStyle && !existingStyle.endsWith(';') ? ';' : ''} ${baseStyle}`
      cleanedAttrs = cleanedAttrs.replace(/style\s*=\s*["']([^"']*)["']/i, `style="${newStyle.trim()}"`)
    } else {
      cleanedAttrs += ` style="${baseStyle}"`
    }

    // 3. Add marker and return
    return `<img ${cleanedAttrs} data-img-fixed="true">`
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
