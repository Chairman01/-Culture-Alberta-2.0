import { NextRequest } from 'next/server'
import { generateSitemapUrls } from '@/lib/seo-cursor-web'
import { loadOptimizedFallback } from '@/lib/optimized-fallback'

export async function GET(request: NextRequest) {
  try {
    const baseUrl = 'https://www.culturealberta.com'
    
    // Static pages
    const staticPages = [
      '/',
      '/articles',
      '/events',
      '/calgary',
      '/edmonton',
      '/food-drink',
      '/culture',
      '/about',
      '/contact'
    ]
    
    // Generate static page URLs
    const staticUrls = generateSitemapUrls(baseUrl, staticPages, 0.8, 'weekly')
    
    // Get dynamic content
    const articles = await loadOptimizedFallback()
    const articleUrls = articles
      .filter(item => item.type === 'article')
      .map(article => ({
        url: `${baseUrl}/articles/${article.id}`,
        lastmod: article.updatedAt || article.date,
        changefreq: 'weekly' as const,
        priority: 0.7
      }))
    
    const eventUrls = articles
      .filter(item => item.type === 'event')
      .map(event => ({
        url: `${baseUrl}/events/${event.id}`,
        lastmod: event.updatedAt || event.date,
        changefreq: 'daily' as const,
        priority: 0.6
      }))
    
    // Combine all URLs
    const allUrls = [...staticUrls, ...articleUrls, ...eventUrls]
    
    // Generate XML sitemap
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls.map(url => `  <url>
    <loc>${url.url}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`).join('\n')}
</urlset>`
    
    return new Response(sitemap, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600'
      }
    })
    
  } catch (error) {
    console.error('Sitemap generation error:', error)
    return new Response('Sitemap generation failed', { status: 500 })
  }
}
