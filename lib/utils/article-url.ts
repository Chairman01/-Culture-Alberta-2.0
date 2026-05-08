/**
 * Utility functions for generating article URLs
 */

/**
 * Converts a title to a URL-friendly slug
 * @param title - The article title
 * @returns A URL-friendly version of the title
 */
export function titleToSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
    .substring(0, 100) // Limit length
}

/**
 * Generates SEO-friendly article URL using title
 * @param article - The article object
 * @returns The article URL path
 */
export function getArticleUrl(article: { id: string; title: string; slug?: string }): string {
  const urlTitle = article.slug || titleToSlug(article.title)
  return `/articles/${urlTitle}`
}

/**
 * Generates article URL from title (for new articles)
 * @param title - The article title
 * @returns The article URL path
 */
export function getArticleUrlByTitle(title: string): string {
  const urlTitle = titleToSlug(title)
  return `/articles/${urlTitle}`
}

/**
 * Get the article path for analytics matching (e.g. /articles/my-article-slug)
 */
export function getArticlePath(article: { title: string; slug?: string }): string {
  return `/articles/${article.slug || titleToSlug(article.title)}`
}

/**
 * Generates SEO-friendly event URL using title
 * @param event - The event object
 * @returns The event URL path
 */
export function getEventUrl(event: { id: string; title: string }): string {
  const urlTitle = titleToSlug(event.title)
  return `/events/${urlTitle}`
}

/**
 * Extracts title from URL path
 * @param path - The URL path (e.g., "/articles/best-restaurants-in-edmonton")
 * @returns The original title (approximate)
 */
export function getTitleFromUrl(path: string): string {
  const parts = path.split('/')
  const urlTitle = parts[parts.length - 1] || ''
  
  // Convert back to title format
  return urlTitle
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
