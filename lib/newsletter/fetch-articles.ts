import { supabase } from '@/lib/supabase'
import { titleToSlug } from '@/lib/utils/article-url'

export interface NewsletterArticle {
  id: string
  title: string
  excerpt: string
  imageUrl: string | null
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
    url: `https://www.culturealberta.com/articles/${slug}`,
    category: article.category || '',
    author: article.author || 'Culture Alberta',
    createdAt: article.created_at || '',
  }
}

export async function fetchNewsletterContent(
  city: 'edmonton' | 'calgary' | 'lethbridge'
): Promise<NewsletterContent> {
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const since = sevenDaysAgo.toISOString()

  // ── 1. City articles (last 7 days first, fallback to all-time) ──────────────
  let { data: cityData } = await supabase
    .from('articles')
    .select('id, title, excerpt, image_url, category, location, author, created_at')
    .eq('status', 'published')
    .neq('type', 'event')
    .or(`location.ilike.%${city}%,category.ilike.%${city}%,title.ilike.%${city}%`)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(5)

  // If fewer than 3 recent articles, pull more without date filter
  if (!cityData || cityData.length < 3) {
    const { data: fallback } = await supabase
      .from('articles')
      .select('id, title, excerpt, image_url, category, location, author, created_at')
      .eq('status', 'published')
      .neq('type', 'event')
      .or(`location.ilike.%${city}%,category.ilike.%${city}%,title.ilike.%${city}%`)
      .order('created_at', { ascending: false })
      .limit(5)
    // Merge without duplicates
    const existing = new Set((cityData || []).map((a: any) => a.id))
    const merged = [...(cityData || []), ...(fallback || []).filter((a: any) => !existing.has(a.id))]
    cityData = merged.slice(0, 5)
  }

  // ── 2. Alberta-wide articles ───────────────────────────────────────────────
  const { data: albertaData } = await supabase
    .from('articles')
    .select('id, title, excerpt, image_url, category, location, author, created_at')
    .eq('status', 'published')
    .neq('type', 'event')
    .or('location.ilike.%alberta%,category.ilike.%alberta%')
    .not('location', 'ilike', '%edmonton%')
    .not('location', 'ilike', '%calgary%')
    .not('location', 'ilike', '%lethbridge%')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(3)

  // ── 3. Upcoming events ────────────────────────────────────────────────────
  const now = new Date().toISOString()
  const twoWeeksOut = new Date()
  twoWeeksOut.setDate(twoWeeksOut.getDate() + 14)

  const { data: eventsData } = await supabase
    .from('events')
    .select('id, title, venue, location, event_date, website_url')
    .eq('status', 'published')
    .ilike('location', `%${city}%`)
    .gte('event_date', now)
    .lte('event_date', twoWeeksOut.toISOString())
    .order('event_date', { ascending: true })
    .limit(3)

  const events: NewsletterEvent[] = (eventsData || []).map((e: any) => {
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

  return {
    cityArticles: (cityData || []).map(toNewsletterArticle),
    albertaArticles: (albertaData || []).map(toNewsletterArticle),
    events,
  }
}
