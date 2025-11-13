// Cache invalidation utilities for Culture Alberta

// Cache keys for different data types
export const CACHE_KEYS = {
  HOMEPAGE_ARTICLES: 'homepage_articles',
  CITY_ARTICLES: 'city_articles',
  ALL_ARTICLES: 'all_articles',
  ADMIN_ARTICLES: 'admin_articles'
} as const

// Cache invalidation functions
export function invalidateHomepageCache() {
  if (typeof window !== 'undefined') {
    // Clear browser cache
    localStorage.removeItem(CACHE_KEYS.HOMEPAGE_ARTICLES)
    sessionStorage.removeItem(CACHE_KEYS.HOMEPAGE_ARTICLES)
  }
  
  // Clear server-side cache (if available)
  if (typeof global !== 'undefined') {
    const globalObj = global as any
    if (globalObj.articlesCache) {
      globalObj.articlesCache = null
      globalObj.cacheTimestamp = 0
    }
  }
  
  console.log('Homepage cache invalidated')
}

export function invalidateAllCaches() {
  if (typeof window !== 'undefined') {
    // Clear all browser caches
    Object.values(CACHE_KEYS).forEach(key => {
      localStorage.removeItem(key)
      sessionStorage.removeItem(key)
    })
  }
  
  // Clear server-side caches
  if (typeof global !== 'undefined') {
    const globalObj = global as any
    globalObj.articlesCache = null
    globalObj.articleCache = new Map()
    globalObj.cityArticlesCache = new Map()
    globalObj.cacheTimestamp = 0
  }
  
  console.log('All caches invalidated')
}

// Force refresh function for homepage
export async function forceRefreshHomepage() {
  invalidateHomepageCache()
  
  // Trigger a page refresh if we're on the homepage
  if (typeof window !== 'undefined' && window.location.pathname === '/') {
    window.location.reload()
  }
}

// Cache status checker
export function getCacheStatus() {
  const now = Date.now()
  const cacheTimestamp = typeof global !== 'undefined' ? (global as any)?.cacheTimestamp || 0 : 0
  const cacheDuration = 2 * 60 * 1000 // 2 minutes
  
  return {
    isExpired: (now - cacheTimestamp) > cacheDuration,
    age: now - cacheTimestamp,
    expiresIn: Math.max(0, cacheDuration - (now - cacheTimestamp))
  }
}
