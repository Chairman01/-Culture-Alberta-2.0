import type { Metadata } from 'next'
import { getArticlesWithFallback } from '@/lib/fallback-articles'
import { getArticleUrl } from '@/lib/utils/article-url'
import ArticlesClient from './articles-client'

/**
 * /articles — the all-articles index and search page.
 *
 * Bing filed this as a Soft 404, and it was right: the whole page was a client
 * component that fetched /api/articles from useEffect, which never runs on the
 * server. Crawlers got zero words and zero links. /guides 308s here, so that
 * redirect was landing on a page search engines treated as empty too.
 *
 * Seeding the client component with server-fetched articles is most of the fix,
 * but not all of it: ArticlesClient calls useSearchParams, and Next bails a
 * statically-rendered subtree out of SSR when it does, emitting the Suspense
 * fallback — the spinner — instead of the list. Forcing the route dynamic would
 * fix that and hand every crawl of a 745-article page an on-demand render,
 * which is the opposite of what the ISR work is for.
 *
 * So the crawlable copy is rendered here, outside that boundary, where the
 * bail-out cannot reach it. Same shape as the server-rendered list on /jobs,
 * and the same reason: it is the only guaranteed crawl path to these URLs from
 * this page.
 */

export const metadata: Metadata = {
  title: 'All Articles | Culture Alberta',
  description:
    'Every Culture Alberta article — Edmonton and Calgary news, guides, benefits explainers, food and drink, events, and more. Search the full archive.',
  alternates: { canonical: 'https://www.culturealberta.com/articles' },
}

// ISR rather than force-dynamic: the list changes a few times a day at most.
export const revalidate = 900

/** How many links the server copy carries. Enough to prove the page has content
 *  and to give crawlers a route to recent articles, without shipping all 745. */
const SERVER_LIST_SIZE = 100

/**
 * How many articles the client component is seeded with.
 *
 * Seeding it with the whole table put 2.8MB on the wire, because
 * getArticlesWithFallback returns full rows and every article body was being
 * serialised into the RSC payload. The page is a search box over an archive —
 * searches go to /api/articles anyway — so it only needs enough to fill the
 * first few screens.
 */
const CLIENT_SEED_SIZE = 200

/** Just the fields the list renders. Article bodies are the whole weight. */
function toCard(a: Record<string, unknown>) {
  return {
    id: a.id, title: a.title, excerpt: a.excerpt, description: a.description,
    imageUrl: a.imageUrl, category: a.category, categories: a.categories,
    location: a.location, date: a.date, author: a.author, tags: a.tags, slug: a.slug,
  }
}

export default async function ArticlesPage() {
  let articles: Awaited<ReturnType<typeof getArticlesWithFallback>> = []
  try {
    articles = await getArticlesWithFallback()
  } catch {
    // A failed read must not take the page down — the client component
    // re-fetches when it is handed an empty list.
    articles = []
  }

  const recent = articles
    .filter(a => a.type !== 'event' && a.type !== 'Event')
    .sort(
      (a, b) =>
        new Date(b.createdAt || b.date || 0).getTime() -
        new Date(a.createdAt || a.date || 0).getTime()
    )

  return (
    <>
      {/* h2, not h1: the client component below renders the visible h1 whenever
          its subtree is server-rendered, and two h1s on one page is worse than
          none. This copy exists to guarantee content and links are present even
          when that subtree bails out to its Suspense fallback. */}
      <div className="sr-only">
        <h2>All Culture Alberta articles</h2>
        <p>
          {recent.length} articles covering Edmonton, Calgary and the rest of Alberta — news,
          guides, benefits explainers, food and drink, and events.
        </p>
        <ul>
          {recent.slice(0, SERVER_LIST_SIZE).map(a => (
            <li key={a.id}>
              <a href={getArticleUrl(a)}>{a.title}</a>
              {a.category ? ` — ${a.category}` : ''}
            </li>
          ))}
        </ul>
      </div>

      <ArticlesClient
        initialArticles={recent.slice(0, CLIENT_SEED_SIZE).map(a => toCard(a as never)) as never}
      />
    </>
  )
}
