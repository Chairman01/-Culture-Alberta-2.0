import { MetadataRoute } from 'next'
import { supabase } from '@/lib/supabase'
import { getAllEvents } from '@/lib/events'
import { getActiveJobSlugs } from '@/lib/jobs'
import { getArticleUrl, getEventUrl } from '@/lib/utils/article-url'

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://www.culturealberta.com'

  // Fetch articles directly from Supabase (always fresh, no fallback file)
  let articles: any[] = []
  try {
    const { data, error } = await supabase
      .from('articles')
      .select('id, title, slug, created_at, updated_at, status, type, category, categories')
      .eq('status', 'published')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Sitemap: Failed to fetch articles from Supabase:', error)
    } else {
      articles = data || []
      console.log(`Sitemap: Fetched ${articles.length} articles from Supabase`)
    }
  } catch (err) {
    console.error('Sitemap: Error fetching articles:', err)
  }

  // Fetch events
  const events = await getAllEvents()

  // Fetch active (non-expired) job postings — expired jobs must drop out
  // of the sitemap per Google's job-posting policy
  const jobSlugs = await getActiveJobSlugs()

  // Create sitemap entries for articles
  const articleEntries: MetadataRoute.Sitemap = articles.map((article) => ({
    url: `${baseUrl}${getArticleUrl(article)}`,
    lastModified: new Date(article.updated_at || article.created_at || new Date()),
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

  // Create sitemap entries for active job postings
  const jobEntries: MetadataRoute.Sitemap = jobSlugs.map((job) => ({
    url: `${baseUrl}/jobs/posting/${job.slug}`,
    lastModified: new Date(job.updated_at || new Date()),
    changeFrequency: 'daily',
    priority: 0.6,
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
      url: baseUrl + '/jobs',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: baseUrl + '/jobs/calgary',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: baseUrl + '/jobs/edmonton',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: baseUrl + '/alberta',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
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
    // Secondary Alberta city hubs (+ their all-articles pages)
    ...['red-deer', 'lethbridge', 'medicine-hat', 'grande-prairie', 'fort-mcmurray'].flatMap((slug) => [
      {
        url: baseUrl + '/' + slug,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      },
      {
        url: baseUrl + '/' + slug + '/all-articles',
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      },
    ]),
    {
      url: baseUrl + '/culture',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: baseUrl + '/guides',
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
    {
      url: baseUrl + '/tools',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: baseUrl + '/tools/aish-calculator',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: baseUrl + '/tools/adap-calculator',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: baseUrl + '/tools/calgary-vs-edmonton-cost-of-living',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: baseUrl + '/tools/alberta-rental-increase-calculator',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: baseUrl + '/tools/stat-holiday-calculator',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: baseUrl + '/tools/alberta-major-projects',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: baseUrl + '/tools/alberta-property-tax-calculator',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: baseUrl + '/tools/aish-payment-dates',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: baseUrl + '/tools/alberta-energy-rebate-checker',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
  ]

  return [...staticRoutes, ...articleEntries, ...eventEntries, ...jobEntries]
}

