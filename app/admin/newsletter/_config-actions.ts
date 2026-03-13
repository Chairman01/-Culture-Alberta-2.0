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

// Alberta is shared — saves to all three city rows
export async function saveAlbertaArticles(
  articleIds: string[] | null,
): Promise<{ error: string | null }> {
  const cities: NewsletterCity[] = ['edmonton', 'calgary', 'lethbridge']
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
