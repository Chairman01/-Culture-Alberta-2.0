/** @type {import('next-sitemap').IConfig} */
export default {
  siteUrl: 'https://www.culturealberta.com',
  generateRobotsTxt: true,
  generateIndexSitemap: true,
  changefreq: 'weekly',
  priority: 0.7,
  sitemapSize: 5000,
  exclude: ['/admin/*', '/api/*', '/test/*', '/test-supabase/*', '/populate/*'],
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/', '/test/', '/test-supabase/', '/populate/'],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: ['/admin/', '/api/', '/test/', '/test-supabase/', '/populate/'],
        crawlDelay: 0,
      },
    ],
    additionalSitemaps: [
      'https://www.culturealberta.com/server-sitemap.xml',
      'https://www.culturealberta.com/news-sitemap.xml',
    ],
  },
  additionalPaths: async (config) => {
    const result = []

    try {
      // Add dynamic article pages with intelligent prioritization
      const articles = await getArticlesFromDatabase()

      for (const article of articles) {
        if (article.status === 'published') {
          // Calculate priority based on recency and category
          const articleAge = Date.now() - new Date(article.createdAt).getTime()
          const daysOld = articleAge / (1000 * 60 * 60 * 24)

          let articlePriority = 0.8
          if (daysOld < 7) articlePriority = 0.9      // New articles
          else if (daysOld < 30) articlePriority = 0.85  // Recent articles
          else if (daysOld > 365) articlePriority = 0.6  // Older articles

          // Boost priority for popular categories
          if (['Events', 'Food', 'Culture'].includes(article.category)) {
            articlePriority += 0.05
          }

          result.push({
            loc: `/articles/${article.slug || article.id}`,
            changefreq: daysOld < 30 ? 'weekly' : 'monthly',
            priority: Math.min(articlePriority, 1.0),
            lastmod: article.updatedAt || article.createdAt || new Date().toISOString(),
            images: article.imageUrl ? [{
              loc: article.imageUrl,
              caption: article.title,
              title: article.title,
            }] : undefined,
          })
        }
      }

      // Add best-of category pages  (excluding shopping)
      const bestOfCategories = ['food', 'events', 'culture', 'attractions']
      for (const category of bestOfCategories) {
        result.push({
          loc: `/best-of/${category}`,
          changefreq: 'weekly',
          priority: 0.85,
          lastmod: new Date().toISOString(),
        })
      }

      // Add individual best-of items
      const bestOfItems = await getBestOfItemsFromDatabase()
      for (const item of bestOfItems) {
        result.push({
          loc: `/best-of/${item.category}/${item.slug || item.id}`,
          changefreq: 'monthly',
          priority: 0.7,
          lastmod: item.updatedAt || item.createdAt || new Date().toISOString(),
        })
      }

      // Add wiki pages
      const wikiPages = await getWikiPagesFromDatabase()
      for (const page of wikiPages) {
        result.push({
          loc: `/wiki/${page.slug}`,
          changefreq: 'monthly',
          priority: 0.75,
          lastmod: page.updatedAt || new Date().toISOString(),
        })
      }
    } catch (error) {
      console.error('Error generating additional sitemap paths:', error)
    }

    return result
  },
  transform: async (config, path) => {
    // Custom priority and changefreq for different page types
    let priority = config.priority;
    let changefreq = config.changefreq;

    // Homepage gets highest priority
    if (path === '/') {
      priority = 1.0;
      changefreq = 'daily';
    }

    // Main category pages get high priority
    if (['/articles', '/events', '/best-of', '/calgary', '/edmonton', '/wiki'].includes(path)) {
      priority = 0.9;
      changefreq = 'daily';
    }

    // About and other important pages
    if (['/about', '/culture', '/food-drink', '/guides', '/contact'].includes(path)) {
      priority = 0.75;
      changefreq: 'weekly';
    }

    // Career and partner pages get lower priority
    if (['/careers', '/partner'].includes(path)) {
      priority = 0.5;
      changefreq = 'monthly';
    }

    return {
      loc: path,
      changefreq,
      priority,
      lastmod: config.autoLastmod ? new Date().toISOString() : undefined,
      alternateRefs: config.alternateRefs ?? [],
    };
  },
}

// Helper functions to get data from your database
async function getArticlesFromDatabase() {
  try {
    // Import Supabase client
    const { createClient } = await import('@supabase/supabase-js')

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    )

    const { data, error } = await supabase
      .from('articles')
      .select('id, slug, title, category, status, createdAt, updatedAt, imageUrl')
      .eq('status', 'published')
      .order('createdAt', { ascending: false })

    if (error) {
      console.error('Supabase error fetching articles:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error connecting to database:', error)
    return []
  }
}

async function getBestOfItemsFromDatabase() {
  try {
    const { createClient } = await import('@supabase/supabase-js')

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    )

    const { data, error } = await supabase
      .from('best_of')
      .select('id, slug, category, createdAt, updatedAt')
      .order('createdAt', { ascending: false })

    if (error) {
      console.error('Supabase error fetching best-of items:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error connecting to database:', error)
    return []
  }
}

async function getWikiPagesFromDatabase() {
  // Placeholder for wiki pages - implement if you have a wiki table
  return []
}
