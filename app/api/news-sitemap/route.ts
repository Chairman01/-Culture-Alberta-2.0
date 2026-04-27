import { supabase } from '@/lib/supabase'
import { createSlug } from '@/lib/utils/slug'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const BASE_URL = 'https://www.culturealberta.com'
const PUBLICATION_NAME = 'Culture Alberta'
const LANGUAGE = 'en'

// Evergreen/non-news categories excluded from news sitemap
const EVERGREEN_CATEGORIES = ['history', 'heritage', 'best of', 'best-of', 'guide', 'directory']

function isEvergreen(category?: string): boolean {
  const cat = (category || '').toLowerCase()
  return EVERGREEN_CATEGORIES.some(e => cat.includes(e))
}

function getArticleSlug(article: any): string {
  if (article.slug) return article.slug
  return createSlug(article.title || '')
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export async function GET() {
  try {
    const { data: articles, error } = await supabase
      .from('articles')
      .select('id, title, slug, date, created_at, updated_at, status, category, categories, tags, author')
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      console.error('News sitemap: Supabase error', error)
    }

    const recent = (articles || []).filter(a => !isEvergreen(a.category))

    const urlEntries = recent.map(article => {
      const slug = getArticleSlug(article)
      const url = `${BASE_URL}/articles/${slug}`
      const pubDate = new Date(article.date || article.created_at).toISOString()
      const title = escapeXml(article.title || '')
      const keywords = [
        ...(article.tags || []),
        article.category,
        'Alberta',
      ].filter(Boolean).map(escapeXml).join(', ')

      return `  <url>
    <loc>${url}</loc>
    <news:news>
      <news:publication>
        <news:name>${PUBLICATION_NAME}</news:name>
        <news:language>${LANGUAGE}</news:language>
      </news:publication>
      <news:publication_date>${pubDate}</news:publication_date>
      <news:title>${title}</news:title>
      <news:keywords>${keywords}</news:keywords>
    </news:news>
  </url>`
    }).join('\n')

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${urlEntries}
</urlset>`

    return new Response(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=300, s-maxage=300', // 5 min cache
      },
    })
  } catch (err) {
    console.error('News sitemap error:', err)
    return new Response('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"></urlset>', {
      headers: { 'Content-Type': 'application/xml; charset=utf-8' },
    })
  }
}
