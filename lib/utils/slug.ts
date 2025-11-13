/**
 * Utility functions for creating and managing URL slugs
 */

/**
 * Converts a title to a URL-friendly slug
 * @param title - The article title
 * @returns A URL-friendly slug
 */
export function createSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    // Replace spaces and special characters with hyphens
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '')
    // Limit length to 100 characters
    .substring(0, 100)
    // Remove trailing hyphen if it exists after truncation
    .replace(/-+$/, '')
}

/**
 * Generates a unique slug by appending a number if the slug already exists
 * @param baseSlug - The base slug
 * @param existingSlugs - Array of existing slugs to check against
 * @returns A unique slug
 */
export function generateUniqueSlug(baseSlug: string, existingSlugs: string[]): string {
  let slug = baseSlug
  let counter = 1
  
  while (existingSlugs.includes(slug)) {
    slug = `${baseSlug}-${counter}`
    counter++
  }
  
  return slug
}

/**
 * Validates if a slug is properly formatted
 * @param slug - The slug to validate
 * @returns True if the slug is valid
 */
export function isValidSlug(slug: string): boolean {
  // Check if slug matches the expected pattern
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
  return slugRegex.test(slug) && slug.length > 0 && slug.length <= 100
}

/**
 * Extracts slug from URL path
 * @param path - The URL path (e.g., "/articles/my-article-title")
 * @returns The slug part
 */
export function extractSlugFromPath(path: string): string {
  const parts = path.split('/')
  return parts[parts.length - 1] || ''
}
