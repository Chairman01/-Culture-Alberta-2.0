import { supabase } from '@/lib/supabase'
import { titleToSlug } from '@/lib/utils/article-url'
import { getNewsletterConfig, getArticlesByIds } from './config'

export interface NewsletterArticle {
  id: string
  title: string
  excerpt: string
  imageUrl: string | null
  imageSource: string | null
  url: string
  category: string
  author: string
  createdAt: string
}

export interface NewsletterEvent {
  id: string
  title: string
  venue: string
  location: string
  eventDate: string
  url: string
}

export interface NewsletterContent {
  cityArticles: NewsletterArticle[]
  albertaArticles: NewsletterArticle[]
  events: NewsletterEvent[]
}

function toNewsletterArticle(article: any): NewsletterArticle {
  const slug = titleToSlug(article.title || '')
  return {
    id: article.id,
    title: article.title || '',
    excerpt: article.excerpt || '',
    imageUrl: article.image_url && article.image_url.startsWith('http') ? article.image_url : null,
    imageSource: article.image_source || null,
    url: `https://www.culturealberta.com/articles/${slug}`,
    category: article.category || '',
    author: article.author || 'Culture Alberta',
    createdAt: article.created_at || '',
  }
}

// Map city slug to the search term used in article location/category fields
const CITY_SEARCH_TERM: Record<string, string> = {
  edmonton: 'edmonton',
  calgary: 'calgary',
  lethbridge: 'lethbridge',
  'medicine-hat': 'medicine hat',
}

export async function fetchNewsletterContent(
  city: 'edmonton' | 'calgary' | 'lethbridge' | 'medicine-hat'
): Promise<NewsletterContent> {
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const since = sevenDaysAgo.toISOString()

  const now = new Date().toISOString()
  const twoWeeksOut = new Date()
  twoWeeksOut.setDate(twoWeeksOut.getDate() + 14)

  const cityTerm = CITY_SEARCH_TERM[city] ?? city

  // Load config and events in parallel
  const [config, eventsResult] = await Promise.all([
    getNewsletterConfig(city),
    supabase
      .from('events')
      .select('id, title, venue, location, event_date, website_url')
      .eq('status', 'published')
      .ilike('location', `%${cityTerm}%`)
      .gte('event_date', now)
      .lte('event_date', twoWeeksOut.toISOString())
      .order('event_date', { ascending: true })
      .limit(3),
  ])

  // ── 1. City articles ────────────────────────────────────────────────────────
  let cityArticles: NewsletterArticle[]

  if (config.article_order && config.article_order.length > 0) {
    // Admin has set a custom order — fetch those specific IDs
    const ordered = await getArticlesByIds(config.article_order)
    cityArticles = ordered.map(toNewsletterArticle)

    // If a featured article is pinned, make sure it's first
    if (config.featured_article_id) {
      const alreadyFirst = cityArticles[0]?.id === config.featured_article_id
      if (!alreadyFirst) {
        const idx = cityArticles.findIndex(a => a.id === config.featured_article_id)
        if (idx > 0) {
          // Move to front
          const [feat] = cityArticles.splice(idx, 1)
          cityArticles.unshift(feat)
        } else if (idx === -1) {
          // Not in the list — fetch and prepend
          const [featRaw] = await getArticlesByIds([config.featured_article_id])
          if (featRaw) cityArticles = [toNewsletterArticle(featRaw), ...cityArticles.slice(0, 4)]
        }
      }
    }
  } else {
    // Helper: client-side city match — checks all fields including categories/tags arrays
    const matchesCity = (a: any) => {
      const loc = (a.location || '').toLowerCase()
      const cat = (a.category || '').toLowerCase()
      const cats = (a.categories || []).map((c: string) => c.toLowerCase())
      const tags = (a.tags || []).map((t: string) => t.toLowerCase())
      const ttl = (a.title || '').toLowerCase()
      return loc.includes(cityTerm) || cat.includes(cityTerm) ||
        cats.some((c: string) => c.includes(cityTerm)) ||
        tags.some((t: string) => t.includes(cityTerm)) ||
        ttl.includes(cityTerm)
    }

    const cityFields = 'id, title, excerpt, image_url, image_source, category, categories, tags, location, author, created_at'

    // Auto fetch top 3 newest — last 7 days first, with broader fallbacks
    let { data: recentData } = await supabase
      .from('articles')
      .select(cityFields)
      .eq('status', 'published')
      .neq('type', 'event')
      .or(`location.ilike.%${cityTerm}%,category.ilike.%${cityTerm}%,title.ilike.%${cityTerm}%`)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(10)

    let cityData: any[] = (recentData || [])

    if (cityData.length < 3) {
      // All-time fallback with same DB filter
      const { data: allTimeSql } = await supabase
        .from('articles')
        .select(cityFields)
        .eq('status', 'published')
        .neq('type', 'event')
        .or(`location.ilike.%${cityTerm}%,category.ilike.%${cityTerm}%,title.ilike.%${cityTerm}%`)
        .order('created_at', { ascending: false })
        .limit(10)
      const existing = new Set(cityData.map((a: any) => a.id))
      cityData = [...cityData, ...(allTimeSql || []).filter((a: any) => !existing.has(a.id))]
    }

    if (cityData.length < 3) {
      // Broader fallback: fetch recent articles with no city filter, match client-side
      // This catches articles tagged via categories/tags arrays
      const { data: broadData } = await supabase
        .from('articles')
        .select(cityFields)
        .eq('status', 'published')
        .neq('type', 'event')
        .order('created_at', { ascending: false })
        .limit(50)
      const existing = new Set(cityData.map((a: any) => a.id))
      const clientMatched = (broadData || []).filter((a: any) => !existing.has(a.id) && matchesCity(a))
      cityData = [...cityData, ...clientMatched]
    }

    cityData = cityData.slice(0, 3)
    cityArticles = cityData.map(toNewsletterArticle)

    // Pin featured article to position 0 if set
    if (config.featured_article_id) {
      const idx = cityArticles.findIndex(a => a.id === config.featured_article_id)
      if (idx > 0) {
        const [feat] = cityArticles.splice(idx, 1)
        cityArticles.unshift(feat)
      } else if (idx === -1) {
        // Featured article not in auto results — fetch and prepend
        const [featRaw] = await getArticlesByIds([config.featured_article_id])
        if (featRaw) cityArticles = [toNewsletterArticle(featRaw), ...cityArticles.slice(0, 4)]
      }
    }
  }

  // ── 2. Alberta articles ─────────────────────────────────────────────────────
  // Always fetch auto base (last 7 days first, fall back to all-time if < 3)
  let { data: albertaAutoData } = await supabase
    .from('articles')
    .select('id, title, excerpt, image_url, image_source, category, location, author, created_at')
    .eq('status', 'published')
    .neq('type', 'event')
    .or('location.ilike.%alberta%,category.ilike.%alberta%')
    .not('location', 'ilike', '%edmonton%')
    .not('location', 'ilike', '%calgary%')
    .not('location', 'ilike', '%lethbridge%')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(3)

  if (!albertaAutoData || albertaAutoData.length < 3) {
    const { data: albertaFallback } = await supabase
      .from('articles')
      .select('id, title, excerpt, image_url, image_source, category, location, author, created_at')
      .eq('status', 'published')
      .neq('type', 'event')
      .or('location.ilike.%alberta%,category.ilike.%alberta%')
      .not('location', 'ilike', '%edmonton%')
      .not('location', 'ilike', '%calgary%')
      .not('location', 'ilike', '%lethbridge%')
      .order('created_at', { ascending: false })
      .limit(3)
    const existing = new Set((albertaAutoData || []).map((a: any) => a.id))
    const merged = [...(albertaAutoData || []), ...(albertaFallback || []).filter((a: any) => !existing.has(a.id))]
    albertaAutoData = merged.slice(0, 3)
  }

  const autoAlberta = (albertaAutoData || []).map(toNewsletterArticle)

  let albertaArticles: NewsletterArticle[]

  if (config.alberta_article_ids && config.alberta_article_ids.length > 0) {
    // Manual picks first, then fill with auto (deduplicated), limit 3
    const manualRaw = await getArticlesByIds(config.alberta_article_ids)
    const manual = manualRaw.map(toNewsletterArticle)
    const seen = new Set(manual.map(a => a.id))
    const extra = autoAlberta.filter(a => !seen.has(a.id))
    albertaArticles = [...manual, ...extra].slice(0, 8)
  } else {
    albertaArticles = autoAlberta
  }

  // ── 3. Events ───────────────────────────────────────────────────────────────
  const events: NewsletterEvent[] = (eventsResult.data || []).map((e: any) => {
    const eventSlug = titleToSlug(e.title || '')
    return {
      id: e.id,
      title: e.title || '',
      venue: e.venue || e.location || '',
      location: e.location || '',
      eventDate: e.event_date || '',
      url: e.website_url || `https://www.culturealberta.com/events/${eventSlug}`,
    }
  })

  return { cityArticles, albertaArticles, events }
}
