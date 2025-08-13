/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: 'https://www.culturealberta.com',
  generateRobotsTxt: true,
  changefreq: 'weekly',
  priority: 0.7,
  sitemapSize: 5000,
  exclude: ['/admin/*', '/api/*'],
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/'],
      },
    ],
    additionalSitemaps: [
      'https://www.culturealberta.com/sitemap.xml',
    ],
  },
}
