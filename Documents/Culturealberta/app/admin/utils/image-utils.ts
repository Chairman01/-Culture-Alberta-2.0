/**
 * Utility functions for handling images in the admin interface
 */

/**
 * Checks if a URL is valid
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch (e) {
    return false
  }
}

/**
 * Checks if a URL is a blob URL
 */
export function isBlobUrl(url: string): boolean {
  return url.startsWith("blob:")
}

/**
 * Converts a File to a data URL
 */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Creates a fallback image URL
 */
export function createFallbackImageUrl(filename = "image"): string {
  return `/placeholder.svg?height=400&width=600&name=${encodeURIComponent(filename)}`
}
