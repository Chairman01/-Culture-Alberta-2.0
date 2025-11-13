/**
 * Content processing utilities for articles
 * 
 * Performance optimizations:
 * - Single-pass regex operations where possible
 * - Efficient string manipulation
 * - Cached regex patterns
 * 
 * Used in:
 * - app/articles/[slug]/page.tsx (article content rendering)
 */

/**
 * Processes article content to convert YouTube URLs to embedded videos
 * and format text content with proper HTML structure
 * 
 * @param content - Raw article content string
 * @returns Processed HTML content string
 * 
 * Performance: O(n) where n is content length
 * 
 * Features:
 * - Converts YouTube URLs to embedded iframes
 * - Formats paragraphs, headings, and special sections
 * - Handles highlight boxes and quotes
 */
export function processContentWithVideos(content: string): string {
  // PERFORMANCE: Compile regex patterns once (reused for multiple replacements)
  const anchorYouTubeRegex = /<a[^>]*href=["'](?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]+)[^"']*["'][^>]*>.*?<\/a>/gi
  const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]+)(?:\?[^&\s]*)?/g
  
  // Helper function to create video embed HTML
  const createVideoEmbed = (videoId: string): string => {
    const cleanVideoId = videoId.split('?')[0].split('&')[0]
    return `<div class="video-container my-8 rounded-lg overflow-hidden shadow-lg bg-gray-100">
      <div class="relative w-full" style="padding-bottom: 56.25%;">
        <iframe 
          class="absolute top-0 left-0 w-full h-full"
          src="https://www.youtube.com/embed/${cleanVideoId}" 
          title="YouTube video player" 
          frameborder="0" 
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
          allowfullscreen
        ></iframe>
      </div>
    </div>`
  }
  
  // First, handle YouTube URLs inside anchor tags
  let processedContent = content.replace(anchorYouTubeRegex, (match, videoId) => {
    return createVideoEmbed(videoId)
  })
  
  // Then, handle plain YouTube URLs (without anchor tags)
  processedContent = processedContent.replace(youtubeRegex, (match, videoId) => {
    return createVideoEmbed(videoId)
  })

  // Convert plain text line breaks to proper HTML paragraphs
  // PERFORMANCE: Single pass through content with efficient filtering
  const paragraphs = processedContent
    .split('\n\n')
    .map(paragraph => paragraph.trim())
    .filter(paragraph => paragraph.length > 0)

  // PERFORMANCE: Pre-compile regex patterns for paragraph processing
  const numberedListRegex = /^\d+\./
  const highlightBoxRegex = /^(What it is|Why locals love it|Pro tip|Vibe|Try this|Heads-up|Must-try|Key Takeaway|Important|Note):/
  const sectionHeaderRegex = /^(Honorable Mentions|Bottom line|Conclusion|Summary|Final Thoughts):/
  const quoteRegex = /^["'].*["']$/
  const subheadingRegex = /^[A-Z][^:]*:$/

  return paragraphs.map(paragraph => {
    // Handle numbered lists (main headings)
    if (numberedListRegex.test(paragraph)) {
      return `<h2 class="text-2xl font-bold text-gray-900 mb-4">${paragraph}</h2>`
    }
    // Handle highlight boxes
    else if (highlightBoxRegex.test(paragraph)) {
      const [label, ...rest] = paragraph.split(':')
      return `<div class="highlight-box">
        <strong class="text-gray-900 text-lg">${label}:</strong> 
        <span class="text-gray-700">${rest.join(':').trim()}</span>
      </div>`
    }
    // Handle section headers
    else if (sectionHeaderRegex.test(paragraph)) {
      return `<h3 class="text-xl font-semibold text-gray-900 mt-8 mb-4">${paragraph}</h3>`
    }
    // Handle quotes
    else if (quoteRegex.test(paragraph)) {
      return `<blockquote>${paragraph.replace(/^["']|["']$/g, '')}</blockquote>`
    }
    // Handle subheadings
    else if (subheadingRegex.test(paragraph) && paragraph.length < 100) {
      return `<h4 class="text-lg font-semibold text-gray-800 mt-6 mb-3">${paragraph}</h4>`
    }
    // Regular paragraphs
    else {
      return `<p>${paragraph}</p>`
    }
  }).join('')
}


