'use server'

import {
  getAllNewsletterConfigs,
  saveNewsletterConfig,
  searchArticlesForPicker,
  getArticlesByIds,
  type NewsletterCity,
  type NewsletterConfig,
  type ArticlePickerItem,
} from '@/lib/newsletter/config'
import { fetchNewsletterContent } from '@/lib/newsletter/fetch-articles'
import { supabase } from '@/lib/supabase'

const CITY_SEARCH_TERM: Record<string, string> = {
  edmonton: 'edmonton',
  calgary: 'calgary',
  lethbridge: 'lethbridge',
  'medicine-hat': 'medicine hat',
}

export type { NewsletterConfig, ArticlePickerItem }

export async function loadAllConfigs(): Promise<Record<NewsletterCity, NewsletterConfig>> {
  return getAllNewsletterConfigs()
}

export async function saveFeaturedArticle(
  city: NewsletterCity,
  articleId: string | null,
): Promise<{ error: string | null }> {
  return saveNewsletterConfig(city, { featured_article_id: articleId })
}

export async function saveArticleOrder(
  city: NewsletterCity,
  articleIds: string[] | null,
): Promise<{ error: string | null }> {
  return saveNewsletterConfig(city, { article_order: articleIds })
}

// Alberta is shared — saves to all city rows
export async function saveAlbertaArticles(
  articleIds: string[] | null,
): Promise<{ error: string | null }> {
  const cities: NewsletterCity[] = ['edmonton', 'calgary', 'lethbridge', 'medicine-hat']
  for (const city of cities) {
    const result = await saveNewsletterConfig(city, { alberta_article_ids: articleIds })
    if (result.error) return result
  }
  return { error: null }
}

export async function searchArticles(query: string): Promise<ArticlePickerItem[]> {
  return searchArticlesForPicker(query)
}

export async function getArticleDetails(ids: string[]): Promise<ArticlePickerItem[]> {
  return getArticlesByIds(ids)
}

// Load what articles are currently auto-selected for a city (so user can edit them)
export async function loadCurrentCityArticles(city: NewsletterCity): Promise<ArticlePickerItem[]> {
  const content = await fetchNewsletterContent(city)
  return content.cityArticles.slice(0, 3).map(a => ({
    id: a.id,
    title: a.title,
    excerpt: a.excerpt,
    image_url: a.imageUrl,
    image_source: a.imageSource,
    created_at: a.createdAt,
    location: '',
  }))
}

// Load what Alberta articles are currently auto-selected (so user can edit them)
export async function loadCurrentAlbertaArticles(): Promise<ArticlePickerItem[]> {
  const content = await fetchNewsletterContent('edmonton')
  return content.albertaArticles.map(a => ({
    id: a.id,
    title: a.title,
    excerpt: a.excerpt,
    image_url: a.imageUrl,
    image_source: a.imageSource,
    created_at: a.createdAt,
    location: '',
  }))
}

// Fetch the newest published articles for a city — ignores current config, always returns fresh
export async function loadLatestCityArticles(city: NewsletterCity): Promise<ArticlePickerItem[]> {
  const cityTerm = CITY_SEARCH_TERM[city] ?? city
  const { data } = await supabase
    .from('articles')
    .select('id, title, excerpt, image_url, image_source, created_at, location')
    .eq('status', 'published')
    .neq('type', 'event')
    .or(`location.ilike.%${cityTerm}%,category.ilike.%${cityTerm}%,title.ilike.%${cityTerm}%`)
    .order('created_at', { ascending: false })
    .limit(3)
  return (data || []) as ArticlePickerItem[]
}
