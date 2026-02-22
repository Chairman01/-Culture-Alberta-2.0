import { getMostViewedArticlePaths } from './trending-views'
import { getArticlePath } from './utils/article-url'
import type { Article } from './types/article'

/**
 * Sort articles by actual view count (most viewed first).
 * Falls back to original order when no analytics data.
 * @param articles - Articles to sort
 * @param days - Look back period (7 for week, 30 for month)
 * @param limit - Max articles to return
 */
export async function getTrendingByViews<T extends Article>(
  articles: T[],
  options: { days?: number; limit?: number } = {}
): Promise<T[]> {
  const { days = 7, limit = 5 } = options

  if (articles.length === 0) return []

  try {
    const viewCounts = await getMostViewedArticlePaths(days, 20)

    if (viewCounts.length === 0) {
      return articles.slice(0, limit)
    }

    const pathToCount = new Map(
      viewCounts.map((v) => [v.path.toLowerCase().trim().replace(/\/$/, ''), v.count])
    )

    const withCounts = articles.map((article) => {
      const path = getArticlePath(article).toLowerCase().trim().replace(/\/$/, '')
      const count = pathToCount.get(path) ?? 0
      const date = new Date(article.date || article.createdAt || 0).getTime()
      return { article, count, date }
    })

    const sorted = withCounts
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count
        return b.date - a.date // secondary: newest first when tied
      })
      .map((x) => x.article)

    return sorted.slice(0, limit)
  } catch {
    return articles.slice(0, limit)
  }
}
