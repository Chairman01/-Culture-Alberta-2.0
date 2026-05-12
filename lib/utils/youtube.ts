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
 * Adds fallback dimensions so the browser can reserve space before images load.
 */
function fixImageDimensions(html: string): string {
  if (!html) return html

  // Replace img tags
  return html.replace(/<img([^>]*)>/gi, (match, attrs) => {
    // If we've already processed this in this pass, skip
    if (attrs.includes('data-img-fixed="true"')) return match

    const hasWidth = /\bwidth\s*=/i.test(attrs)
    const hasHeight = /\bheight\s*=/i.test(attrs)
    let cleanedAttrs = attrs.trim()

    // 2. Handle style attribute
    const styleMatch = cleanedAttrs.match(/style\s*=\s*["']([^"']*)["']/i)
    const baseStyle = 'max-width:100%; height:auto; display:block; margin:1.5rem auto; border-radius:8px;'

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

    if (!hasWidth) cleanedAttrs += ' width="1600"'
    if (!hasHeight) cleanedAttrs += ' height="900"'

    // 3. Add marker and return
    return `<img ${cleanedAttrs} data-img-fixed="true">`
  })
}

/**
 * Converts Mediavine video embed snippets that were pasted into the editor and
 * saved as escaped text back into the placeholder div Mediavine's script uses.
 */
function processMediavineVideoEmbeds(content: string): string {
  if (!content) return content

  const renderMediavineEmbed = (attrs: string) => {
    const videoId = attrs.match(/\bdata-video-id\s*=\s*(?:"|&quot;|')?([A-Za-z0-9_-]+)/i)?.[1]
      || attrs.match(/\bmv-video-id-([A-Za-z0-9_-]+)/i)?.[1]

    if (!videoId) return null

    return `<div class="mv-video-target mv-video-id-${videoId}" data-video-id="${videoId}"></div>`
  }

  let processed = content.replace(
    /<p>\s*&lt;div\s+([^<>]*?\bmv-video-target\b[^<>]*?)&gt;\s*&lt;\/div&gt;\s*<\/p>/gi,
    (match, attrs) => renderMediavineEmbed(attrs) || match
  )

  processed = processed.replace(
    /&lt;div\s+([^<>]*?\bmv-video-target\b[^<>]*?)&gt;\s*&lt;\/div&gt;/gi,
    (match, attrs) => renderMediavineEmbed(attrs) || match
  )

  return processed
}


/**
 * Processes anchor tags containing Twitter/X URLs and converts them to embedded tweets
 */
export function processTwitterAnchors(content: string): string {
  if (!content) return content

  const anchorPattern = /<a[^>]*href=["'](https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/[^/\s"']+\/status\/(\d+)[^"']*?)["'][^>]*>.*?<\/a>/gi

  return content.replace(anchorPattern, (_match, url, _tweetId) => {
    return `
      <blockquote class="twitter-tweet" data-dnt="true" data-theme="light">
        <a href="${url}"></a>
      </blockquote>
    `
  })
}

/**
 * Processes standalone Twitter/X URLs and converts them to embedded tweets
 */
export function processTwitterLinks(content: string): string {
  if (!content) return content

  // Match standalone Twitter/X URLs not already inside HTML attributes
  const twitterUrlPattern = /(?<![="'\/])(https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/[^/\s<"']+\/status\/(\d+)(?:[^\s<"']*)?)/gi

  return content.replace(twitterUrlPattern, (match, url, _tweetId) => {
    return `
      <blockquote class="twitter-tweet" data-dnt="true" data-theme="light">
        <a href="${url}"></a>
      </blockquote>
    `
  })
}

/**
 * Processes anchor tags containing Instagram URLs and converts them to embedded posts
 */
export function processInstagramAnchors(content: string): string {
  if (!content) return content

  const anchorPattern = /<a[^>]*href=["'](https?:\/\/(?:www\.)?instagram\.com\/(p|reel|tv)\/([A-Za-z0-9_-]+)\/?[^"']*?)["'][^>]*>.*?<\/a>/gi

  return content.replace(anchorPattern, (_match, _url, type, postCode) => {
    const permalink = `https://www.instagram.com/${type}/${postCode}/`

    return `
      <div class="instagram-embed my-6" style="max-width: 540px; min-height: 640px; margin: 0 auto;">
        <blockquote
          class="instagram-media"
          data-instgrm-captioned
          data-instgrm-permalink="${permalink}"
          data-instgrm-version="14"
          style="background:#FFF; border:0; border-radius:3px; box-shadow:0 0 1px 0 rgba(0,0,0,0.5),0 1px 10px 0 rgba(0,0,0,0.15); margin:1px; max-width:540px; min-width:326px; padding:0; width:calc(100% - 2px);">
        </blockquote>
      </div>
    `
  })
}

/**
 * Processes standalone Instagram URLs and converts them to embedded posts
 */
export function processInstagramLinks(content: string): string {
  if (!content) return content

  // Match standalone Instagram URLs not already inside HTML attributes
  const instagramUrlPattern = /(?<![="'\/])(https?:\/\/(?:www\.)?instagram\.com\/(p|reel|tv)\/([A-Za-z0-9_-]+)(?:\/[^\s<"']*)?)/gi

  return content.replace(instagramUrlPattern, (_match, _url, type, postCode) => {
    const permalink = `https://www.instagram.com/${type}/${postCode}/`

    return `
      <div class="instagram-embed my-6" style="max-width: 540px; min-height: 640px; margin: 0 auto;">
        <blockquote
          class="instagram-media"
          data-instgrm-captioned
          data-instgrm-permalink="${permalink}"
          data-instgrm-version="14"
          style="background:#FFF; border:0; border-radius:3px; box-shadow:0 0 1px 0 rgba(0,0,0,0.5),0 1px 10px 0 rgba(0,0,0,0.15); margin:1px; max-width:540px; min-width:326px; padding:0; width:calc(100% - 2px);">
        </blockquote>
      </div>
    `
  })
}

/**
 * Main function to process all YouTube/Twitter/Instagram content and fix images for CLS
 * This is a pure string manipulation function that works on both server and client
 */
export function processArticleContent(content: string): string {
  if (!content) return content

  // Restore trusted Mediavine video placeholders if the editor escaped them.
  let processed = processMediavineVideoEmbeds(content)

  // First process anchor tags (more specific patterns, must run before standalone URL patterns)
  processed = processYouTubeAnchors(processed)
  processed = processTwitterAnchors(processed)
  processed = processInstagramAnchors(processed)

  // Then process any remaining standalone URLs
  processed = processYouTubeLinks(processed)
  processed = processTwitterLinks(processed)
  processed = processInstagramLinks(processed)

  // Add dimensions to img tags to prevent CLS (Core Web Vitals)
  processed = fixImageDimensions(processed)

  return processed
}
