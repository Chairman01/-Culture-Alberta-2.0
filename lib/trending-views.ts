/**
 * Server-only: Most viewed article paths for Trending This Week.
 * Uses GA4 when configured, otherwise Supabase. Import only from server code (e.g. trending-articles).
 * Cached 5 min to avoid blocking page renders; GA4 has 2.5s timeout.
 */

import { unstable_cache } from 'next/cache'
import { getMostViewedArticlePathsFromGA4 } from './google-analytics'
import { supabase } from './supabase'

const CACHE_REVALIDATE_SECONDS = 300 // 5 min – trending doesn't need real-time

async function getMostViewedArticlePathsUncached(
  days: number = 7,
  limit: number = 10
): Promise<{ path: string; count: number }[]> {
  if (process.env.GA4_PROPERTY_ID) {
    const ga4 = await getMostViewedArticlePathsFromGA4(days, Math.max(limit, 20))
    if (ga4.length > 0) {
      return ga4.slice(0, limit)
    }
  }

  try {
    if (!supabase) return []

    const since = new Date()
    since.setDate(since.getDate() - days)
    const sinceIso = since.toISOString()
    const pathCounts: Record<string, number> = {}

    const { data: pageViews } = await supabase
      .from('analytics_page_views')
      .select('page_path')
      .gte('created_at', sinceIso)
      .like('page_path', '/articles/%')

    pageViews?.forEach((v) => {
      const raw = v.page_path?.trim()
      if (raw) {
        const path = raw.toLowerCase().replace(/\/$/, '')
        pathCounts[path] = (pathCounts[path] || 0) + 1
      }
    })

    const { data: contentViews } = await supabase
      .from('analytics_content_views')
      .select('content_id')
      .gte('created_at', sinceIso)
      .eq('content_type', 'article')

    contentViews?.forEach((v) => {
      const id = v.content_id?.trim()
      if (id) {
        const path = (id.startsWith('/') ? id : `/articles/${id}`).toLowerCase().replace(/\/$/, '')
        pathCounts[path] = (pathCounts[path] || 0) + 1
      }
    })

    return Object.entries(pathCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([path, count]) => ({ path, count }))
  } catch (error) {
    console.warn('getMostViewedArticlePaths error:', error)
    return []
  }
}

/**
 * Get most viewed article paths (for trending) from the last N days.
 * Cached for 5 minutes to keep page loads fast. GA4 tried first with 2.5s timeout, then Supabase.
 */
export async function getMostViewedArticlePaths(
  days: number = 7,
  limit: number = 10
): Promise<{ path: string; count: number }[]> {
  const cached = await unstable_cache(
    () => getMostViewedArticlePathsUncached(days, 25), // Cache top 25 for all callers
    [`trending-article-views-${days}`],
    { revalidate: CACHE_REVALIDATE_SECONDS }
  )()
  return cached.slice(0, limit)
}
