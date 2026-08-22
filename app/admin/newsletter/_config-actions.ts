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
import { assertAdminOrContributorAction } from '@/lib/admin-auth'

/**
 * Everything in this file is preparation: picking and ordering the stories an
 * edition will carry. Writers do this, so contributors are allowed through --
 * but only signed-in ones. A Server Action is a POST endpoint that middleware
 * gates by path alone, so each of these has to say who it is for rather than
 * inherit it from the page it lives beside.
 *
 * Sending is a different matter and lives in ./_actions.ts, which is admin-only.
 */
async function assertNewsletterPrepareAccess() {
  await assertAdminOrContributorAction('newsletter-prepare')
}

const CITY_SEARCH_TERM: Record<string, string> = {
  edmonton: 'edmonton',
  calgary: 'calgary',
  lethbridge: 'lethbridge',
  'medicine-hat': 'medicine hat',
  'red-deer': 'red deer',
  'grande-prairie': 'grande prairie',
  'fort-mcmurray': 'fort mcmurray',
}

export type { NewsletterConfig, ArticlePickerItem }

export async function loadAllConfigs(): Promise<Record<NewsletterCity, NewsletterConfig>> {
  await assertNewsletterPrepareAccess()
  return getAllNewsletterConfigs()
}

export async function saveFeaturedArticle(
  city: NewsletterCity,
  articleId: string | null,
): Promise<{ error: string | null }> {
  await assertNewsletterPrepareAccess()
  return saveNewsletterConfig(city, { featured_article_id: articleId })
}

export async function saveArticleOrder(
  city: NewsletterCity,
  articleIds: string[] | null,
): Promise<{ error: string | null }> {
  await assertNewsletterPrepareAccess()
  return saveNewsletterConfig(city, { article_order: articleIds })
}

// The Alberta story picks are shared — saved onto every edition's row, the
// province-wide one included, so the same picks appear wherever they're read.
export async function saveAlbertaArticles(
  articleIds: string[] | null,
): Promise<{ error: string | null }> {
  await assertNewsletterPrepareAccess()
  const cities: NewsletterCity[] = [
    'edmonton', 'calgary', 'lethbridge', 'medicine-hat',
    'red-deer', 'grande-prairie', 'fort-mcmurray', 'alberta',
  ]
  for (const city of cities) {
    const result = await saveNewsletterConfig(city, { alberta_article_ids: articleIds })
    if (result.error) return result
  }
  return { error: null }
}

export async function searchArticles(query: string): Promise<ArticlePickerItem[]> {
  await assertNewsletterPrepareAccess()
  return searchArticlesForPicker(query)
}

export async function getArticleDetails(ids: string[]): Promise<ArticlePickerItem[]> {
  await assertNewsletterPrepareAccess()
  return getArticlesByIds(ids)
}

// Load what articles are currently auto-selected for a city (so user can edit them)
export async function loadCurrentCityArticles(city: NewsletterCity): Promise<ArticlePickerItem[]> {
  await assertNewsletterPrepareAccess()
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
  await assertNewsletterPrepareAccess()
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
  await assertNewsletterPrepareAccess()
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

// Fetch the newest Alberta-wide articles — ignores current config, excludes all city-specific locations
export async function loadLatestAlbertaArticles(): Promise<ArticlePickerItem[]> {
  await assertNewsletterPrepareAccess()
  const { data } = await supabase
    .from('articles')
    .select('id, title, excerpt, image_url, image_source, created_at, location')
    .eq('status', 'published')
    .neq('type', 'event')
    .or('location.ilike.%alberta%,category.ilike.%alberta%')
    .not('location', 'ilike', '%edmonton%')
    .not('location', 'ilike', '%calgary%')
    .not('location', 'ilike', '%lethbridge%')
    .not('location', 'ilike', '%red deer%')
    .not('location', 'ilike', '%grande prairie%')
    .not('location', 'ilike', '%fort mcmurray%')
    .not('location', 'ilike', '%medicine hat%')
    .order('created_at', { ascending: false })
    .limit(4)
  return (data || []) as ArticlePickerItem[]
}

/**
 * The handover: the subject line a writer proposes for an edition and any note
 * they leave for whoever sends it.
 *
 * Saving this sends nothing. It is deliberately the furthest a writer can take
 * a newsletter -- the send actions live in ./_actions.ts and are admin-only.
 */
export async function savePreparedEdition(
  city: NewsletterCity,
  input: { proposedSubject: string; note: string },
): Promise<{ error: string | null }> {
  const session = await assertAdminOrContributorAction('savePreparedEdition')
  return saveNewsletterConfig(city, {
    proposed_subject: input.proposedSubject.trim() || null,
    prepare_note: input.note.trim() || null,
    prepared_by: session.name || session.username,
    prepared_at: new Date().toISOString(),
  })
}
