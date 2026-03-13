import { supabase } from '@/lib/supabase'

export type NewsletterCity = 'edmonton' | 'calgary' | 'lethbridge'

export interface NewsletterConfig {
  city: NewsletterCity
  featured_article_id: string | null
  article_order: string[] | null
  alberta_article_ids: string[] | null
  updated_at: string
}

export interface ArticlePickerItem {
  id: string
  title: string
  excerpt: string
  image_url: string | null
  created_at: string
  location: string
}

const empty = (city: NewsletterCity): NewsletterConfig => ({
  city,
  featured_article_id: null,
  article_order: null,
  alberta_article_ids: null,
  updated_at: '',
})

// ── Read ──────────────────────────────────────────────────────────────────────

export async function getNewsletterConfig(city: NewsletterCity): Promise<NewsletterConfig> {
  const { data, error } = await supabase
    .from('newsletter_config')
    .select('city, featured_article_id, article_order, alberta_article_ids, updated_at')
    .eq('city', city)
    .single()

  if (error || !data) return empty(city)
  return data as NewsletterConfig
}

export async function getAllNewsletterConfigs(): Promise<Record<NewsletterCity, NewsletterConfig>> {
  const { data } = await supabase
    .from('newsletter_config')
    .select('city, featured_article_id, article_order, alberta_article_ids, updated_at')

  const result: Record<NewsletterCity, NewsletterConfig> = {
    edmonton: empty('edmonton'),
    calgary: empty('calgary'),
    lethbridge: empty('lethbridge'),
  }
  for (const row of data || []) {
    result[row.city as NewsletterCity] = row as NewsletterConfig
  }
  return result
}

// ── Write ─────────────────────────────────────────────────────────────────────

export async function saveNewsletterConfig(
  city: NewsletterCity,
  patch: Partial<Omit<NewsletterConfig, 'city' | 'updated_at'>>,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('newsletter_config')
    .upsert({ city, ...patch, updated_at: new Date().toISOString() })
  return { error: error?.message ?? null }
}

// ── Article search / fetch ────────────────────────────────────────────────────

export async function searchArticlesForPicker(query: string): Promise<ArticlePickerItem[]> {
  let q = supabase
    .from('articles')
    .select('id, title, excerpt, image_url, created_at, location')
    .eq('status', 'published')
    .neq('type', 'event')
    .order('created_at', { ascending: false })
    .limit(20)

  if (query.trim()) {
    q = q.ilike('title', `%${query.trim()}%`)
  }

  const { data } = await q
  return (data || []) as ArticlePickerItem[]
}

export async function getArticlesByIds(ids: string[]): Promise<ArticlePickerItem[]> {
  if (!ids.length) return []

  const { data } = await supabase
    .from('articles')
    .select('id, title, excerpt, image_url, created_at, location')
    .in('id', ids)
    .eq('status', 'published')

  if (!data) return []
  // Preserve caller's ordering
  const byId = Object.fromEntries(data.map((a: any) => [a.id, a]))
  return ids.map(id => byId[id]).filter(Boolean) as ArticlePickerItem[]
}
