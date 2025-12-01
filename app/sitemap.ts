import { MetadataRoute } from 'next'
import { getAllArticles } from '@/lib/articles'
import { getAllEvents } from '@/lib/events'
import { getArticleUrl, getEventUrl } from '@/lib/utils/article-url'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://www.culturealberta.com'

  // Fetch all dynamic content
  const [articles, events] = await Promise.all([
    getAllArticles(),
    getAllEvents()
  ])

  // Create sitemap entries for articles
  const articleEntries: MetadataRoute.Sitemap = articles.map((article) => ({
    url: `${baseUrl}${getArticleUrl(article)}`,
    lastModified: new Date(article.updatedAt || article.createdAt || new Date()),
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  // Create sitemap entries for events
  const eventEntries: MetadataRoute.Sitemap = events.map((event) => ({
    url: `${baseUrl}${getEventUrl(event)}`,
    lastModified: new Date(event.updated_at || event.created_at || new Date()),
    changeFrequency: 'daily', // Events change more often
    priority: 0.7,
  }))

  // Static routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: baseUrl + '/articles',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: baseUrl + '/events',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9, // Increased priority for events landing
    },
    {
      url: baseUrl + '/best-of',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: baseUrl + '/calgary',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: baseUrl + '/edmonton',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: baseUrl + '/culture',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: baseUrl + '/arts',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: baseUrl + '/food-drink',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: baseUrl + '/about',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: baseUrl + '/contact',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: baseUrl + '/privacy-policy',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: baseUrl + '/terms-of-service',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: baseUrl + '/partner',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: baseUrl + '/careers',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
  ]

  return [...staticRoutes, ...articleEntries, ...eventEntries]
}

