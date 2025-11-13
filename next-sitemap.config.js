/** @type {import('next-sitemap').IConfig} */
export default {
  siteUrl: 'https://www.culturealberta.com',
  generateRobotsTxt: true,
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
    ],
  },
  additionalPaths: async (config) => {
    const result = []
    
    try {
      // Add dynamic article pages
      const articles = await getArticlesFromDatabase()
      for (const article of articles) {
        if (article.status === 'published') {
          result.push({
            loc: `/articles/${article.id}`,
            changefreq: 'weekly',
            priority: 0.8,
            lastmod: article.updatedAt || article.createdAt || new Date().toISOString(),
          })
        }
      }
      
      // Add best-of category pages
      const bestOfCategories = ['food', 'events', 'culture', 'attractions', 'shopping']
      for (const category of bestOfCategories) {
        result.push({
          loc: `/best-of/${category}`,
          changefreq: 'weekly',
          priority: 0.8,
          lastmod: new Date().toISOString(),
        })
      }
      
      // Add individual best-of items (if you have them)
      const bestOfItems = await getBestOfItemsFromDatabase()
      for (const item of bestOfItems) {
        result.push({
          loc: `/best-of/${item.category}/${item.id}`,
          changefreq: 'monthly',
          priority: 0.7,
          lastmod: item.updatedAt || item.createdAt || new Date().toISOString(),
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
    if (['/articles', '/events', '/best-of', '/calgary', '/edmonton'].includes(path)) {
      priority = 0.9;
      changefreq = 'daily';
    }
    
    // About and other important pages
    if (['/about', '/culture', '/food-drink', '/guides'].includes(path)) {
      priority = 0.8;
      changefreq = 'weekly';
    }
    
    // Career and partner pages get lower priority
    if (['/careers', '/partner'].includes(path)) {
      priority = 0.6;
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
  // This should match how you get articles in your app
  // For now, returning empty array - you'll need to implement this
  return []
}

async function getBestOfItemsFromDatabase() {
  // This should match how you get best-of items in your app
  // For now, returning empty array - you'll need to implement this
  return []
}
