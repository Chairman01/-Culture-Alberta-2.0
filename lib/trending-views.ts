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
  // Try GA4 first if credentials are configured
  if (process.env.GA4_PROPERTY_ID) {
    const ga4 = await getMostViewedArticlePathsFromGA4(days, Math.max(limit, 20))
    if (ga4.length > 0) {
      return ga4.slice(0, limit)
    }
  }

  // Use articles.view_count — single indexed query, always current
  try {
    if (!supabase) return []

    const { data: articles } = await supabase
      .from('articles')
      .select('slug, view_count')
      .eq('status', 'published')
      .gt('view_count', 0)
      .order('view_count', { ascending: false })
      .limit(limit)

    if (articles && articles.length > 0) {
      return articles
        .filter((a) => a.slug)
        .map((a) => ({
          path: `/articles/${a.slug}`,
          count: (a.view_count as number) || 0,
        }))
    }
  } catch (error) {
    console.warn('getMostViewedArticlePaths error:', error)
  }

  return []
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
