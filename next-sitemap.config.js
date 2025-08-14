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
    additionalSitemaps: [
      'https://www.culturealberta.com/sitemap.xml',
    ],
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
