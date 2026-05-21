/**
 * Server-only: Most viewed article paths for Trending This Week.
 * Uses GA4 when configured, then internal weekly analytics, then all-time
 * article counters as a last resort. Import only from server code.
 */

import { unstable_cache } from 'next/cache'
import { getMostViewedArticlePathsFromGA4 } from './google-analytics'
import { supabase } from './supabase'

const CACHE_REVALIDATE_SECONDS = 300 // 5 min

async function getWeeklyArticlePathsFromSupabase(
  days: number,
  limit: number
): Promise<{ path: string; count: number }[]> {
  try {
    if (!supabase) return []

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
    const { data: pageViews, error } = await supabase
      .from('analytics_page_views')
      .select('page_path')
      .gte('created_at', since)
      .like('page_path', '/articles/%')
      .limit(5000)

    if (error || !pageViews || pageViews.length === 0) return []

    const counts = new Map<string, number>()

    for (const view of pageViews) {
      const path = String(view.page_path || '').trim().toLowerCase().replace(/\/$/, '')
      if (!path.startsWith('/articles/')) continue
      counts.set(path, (counts.get(path) || 0) + 1)
    }

    return Array.from(counts.entries())
      .map(([path, count]) => ({ path, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
  } catch (error) {
    console.warn('weekly analytics trending error:', error)
    return []
  }
}

async function getAllTimeArticlePathsFromSupabase(
  limit: number
): Promise<{ path: string; count: number }[]> {
  try {
    if (!supabase) return []

    const { data: articles } = await supabase
      .from('articles')
      .select('slug, view_count')
      .eq('status', 'published')
      .gt('view_count', 0)
      .order('view_count', { ascending: false })
      .limit(limit)

    if (!articles || articles.length === 0) return []

    return articles
      .filter((a) => a.slug)
      .map((a) => ({
        path: `/articles/${a.slug}`,
        count: (a.view_count as number) || 0,
      }))
  } catch (error) {
    console.warn('all-time Supabase trending error:', error)
    return []
  }
}

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

  const weeklyInternal = await getWeeklyArticlePathsFromSupabase(days, limit)
  if (weeklyInternal.length > 0) {
    return weeklyInternal
  }

  return getAllTimeArticlePathsFromSupabase(limit)
}

/**
 * Get most viewed article paths from the last N days.
 * Cached briefly to keep page loads fast.
 */
export async function getMostViewedArticlePaths(
  days: number = 7,
  limit: number = 10
): Promise<{ path: string; count: number }[]> {
  const cached = await unstable_cache(
    () => getMostViewedArticlePathsUncached(days, 25),
    [`trending-article-views-${days}`],
    { revalidate: CACHE_REVALIDATE_SECONDS }
  )()
  return cached.slice(0, limit)
}
