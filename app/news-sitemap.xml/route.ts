import { supabase } from '@/lib/supabase'
import { getArticleUrl } from '@/lib/utils/article-url'

// Google News sitemap.
// Lists ONLY published articles from the last 48 hours, per Google News guidelines.
// Served at /news-sitemap.xml (a crawlable path — NOT under the robots-disallowed /api/).
export const revalidate = 900 // refresh every 15 minutes

const BASE_URL = 'https://www.culturealberta.com'
const PUBLICATION_NAME = 'Culture Alberta'
const PUBLICATION_LANGUAGE = 'en'
const MAX_AGE_HOURS = 48
const MAX_URLS = 1000

// Slugs intentionally kept out of search (test/placeholder articles, mirrors robots.txt).
const BLOCKED_SLUGS = new Set<string>([
  'article-1755471413706-6x340tv5w',
  'article-1757443668525-it4u5nhfo',
  'article-1754957054981-fturxi4mi',
  'article-1755303180179-vp6mtvos2',
  'article-1755479611660-ikidiacz0',
  'article-1757236534668-edtcg186k',
  'article-1757317159902-bzajewmw0',
  'article-1754899686200-bvftipelh',
  'article-1754906674364-96gpllbq3',
  'article-1755044961288-d2jjptlq0',
  'article-1755737833735-4dpy9893u',
  'article-1755470408146-4r1ljnu1r',
  'article-1755917044327-nw8ghveg1',
  'article-1765775179976-8ckzfvlun',
  'article-1765435206227-z3f7y8f1e',
  'article-2',
  'article-1766002547858-dem6yogey',
  'afro-music-fest',
  'hello-this-is-a-tet',
  'redditors-top-romantic-edmonton-spots',
  'the-5-best-brunch-spots-in-edmonton-you-need-to-try-at-least-once',
])

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

async function fetchPublishedArticles(opts: { sinceCutoff: string | null; limit: number }): Promise<any[]> {
  try {
    let query = supabase
      .from('articles')
      .select('id, title, slug, created_at, type, status')
      .eq('status', 'published')
      .neq('type', 'event')
      .order('created_at', { ascending: false })
      .limit(opts.limit)

    if (opts.sinceCutoff) {
      query = query.gte('created_at', opts.sinceCutoff)
    }

    const { data, error } = await query
    if (error) {
      console.error('News sitemap: Supabase fetch failed:', error)
      return []
    }
    return data || []
  } catch (err) {
    console.error('News sitemap: error fetching articles:', err)
    return []
  }
}

function buildEntries(articles: any[]): string[] {
  return articles
    .filter((a) => a.type !== 'event')
    .filter((a) => !BLOCKED_SLUGS.has(a.slug || ''))
    .map((article) => {
      const loc = `${BASE_URL}${getArticleUrl(article)}`
      const pubDate = new Date(article.created_at || Date.now()).toISOString()
      const title = escapeXml((article.title || '').trim())
      return `  <url>
    <loc>${escapeXml(loc)}</loc>
    <news:news>
      <news:publication>
        <news:name>${escapeXml(PUBLICATION_NAME)}</news:name>
        <news:language>${PUBLICATION_LANGUAGE}</news:language>
      </news:publication>
      <news:publication_date>${pubDate}</news:publication_date>
      <news:title>${title}</news:title>
    </news:news>
  </url>`
    })
}

export async function GET() {
  const cutoff = new Date(Date.now() - MAX_AGE_HOURS * 60 * 60 * 1000).toISOString()

  // Primary: articles from the last 48h, per Google News guidelines.
  let entries = buildEntries(await fetchPublishedArticles({ sinceCutoff: cutoff, limit: MAX_URLS }))

  // A news sitemap MUST contain at least one <url>; an empty <urlset> makes Google
  // report "Missing XML tag: url" (Line 5). During publishing gaps (>48h with no new
  // posts) the primary query is empty, so fall back to the most recent published
  // articles to keep the sitemap valid and non-empty.
  if (entries.length === 0) {
    entries = buildEntries(await fetchPublishedArticles({ sinceCutoff: null, limit: 10 }))
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${entries.join('\n')}
</urlset>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  })
}
