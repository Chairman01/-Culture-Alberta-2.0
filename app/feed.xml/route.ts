import { supabase } from '@/lib/supabase'
import { getArticleUrl } from '@/lib/utils/article-url'

const BASE_URL = 'https://www.culturealberta.com'
const FEED_TITLE = 'Culture Alberta'
const FEED_DESCRIPTION = 'The best culture, events, food & drink in Calgary and Edmonton, Alberta.'

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export async function GET() {
  let articles: any[] = []

  try {
    const { data, error } = await supabase
      .from('articles')
      .select('id, title, excerpt, category, categories, author, created_at, updated_at, image_url, type, status')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(50)

    if (!error && data) {
      articles = data
    }
  } catch (err) {
    console.error('RSS feed: Failed to fetch articles:', err)
  }

  const buildDate = new Date().toUTCString()

  const items = articles
    .map((article) => {
      const url = `${BASE_URL}${getArticleUrl(article)}`
      const pubDate = new Date(article.created_at).toUTCString()
      const title = escapeXml(article.title || '')
      const description = escapeXml(article.excerpt || '')
      const author = escapeXml(article.author || 'Culture Alberta')
      const category = article.category || (article.categories?.[0] ?? '')

      const enclosure =
        article.image_url && article.image_url.startsWith('http')
          ? `<enclosure url="${escapeXml(article.image_url)}" type="image/jpeg" length="0" />`
          : ''

      return `
    <item>
      <title>${title}</title>
      <link>${url}</link>
      <description>${description}</description>
      <pubDate>${pubDate}</pubDate>
      <guid isPermaLink="true">${url}</guid>
      <author>${author}</author>
      ${category ? `<category>${escapeXml(category)}</category>` : ''}
      ${enclosure}
    </item>`
    })
    .join('')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${FEED_TITLE}</title>
    <link>${BASE_URL}</link>
    <description>${FEED_DESCRIPTION}</description>
    <language>en-ca</language>
    <lastBuildDate>${buildDate}</lastBuildDate>
    <atom:link href="${BASE_URL}/feed.xml" rel="self" type="application/rss+xml" />
    <image>
      <url>${BASE_URL}/images/culture-alberta-og.jpg</url>
      <title>${FEED_TITLE}</title>
      <link>${BASE_URL}</link>
    </image>
    ${items}
  </channel>
</rss>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  })
}
