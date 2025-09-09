/**
 * Utility functions for generating article URLs
 */

/**
 * Generates the correct article URL using slug if available, otherwise falls back to ID
 * @param article - The article object
 * @returns The article URL path
 */
export function getArticleUrl(article: { id: string; slug?: string }): string {
  // Use slug if available, otherwise fall back to ID
  return `/articles/${article.slug || article.id}`
}

/**
 * Generates article URL from just an ID (for backward compatibility)
 * @param id - The article ID
 * @returns The article URL path
 */
export function getArticleUrlById(id: string): string {
  return `/articles/${id}`
}

/**
 * Generates article URL from just a slug
 * @param slug - The article slug
 * @returns The article URL path
 */
export function getArticleUrlBySlug(slug: string): string {
  return `/articles/${slug}`
}
