const fs = require('fs');
const path = require('path');

// Function to get articles from localStorage (simulated for sitemap generation)
function getArticlesFromLocalStorage() {
  // This would need to be adapted to work with your actual data storage
  // For now, we'll create a basic structure
  return [
    // Add your actual articles here
    // Example:
    // { id: 'article-1', status: 'published', updatedAt: '2024-01-01T00:00:00.000Z' }
  ];
}

function generateSitemap() {
  const baseUrl = 'https://www.culturealberta.com';
  const currentDate = new Date().toISOString();
  
  // Static pages with proper priorities
  const staticPages = [
    { path: '/', priority: 1.0, changefreq: 'daily' },
    { path: '/articles', priority: 0.9, changefreq: 'daily' },
    { path: '/events', priority: 0.9, changefreq: 'daily' },
    { path: '/best-of', priority: 0.9, changefreq: 'daily' },
    { path: '/calgary', priority: 0.9, changefreq: 'daily' },
    { path: '/edmonton', priority: 0.9, changefreq: 'daily' },
    { path: '/about', priority: 0.8, changefreq: 'weekly' },
    { path: '/culture', priority: 0.8, changefreq: 'weekly' },
    { path: '/food-drink', priority: 0.8, changefreq: 'weekly' },
    { path: '/guides', priority: 0.8, changefreq: 'weekly' },
    { path: '/careers', priority: 0.6, changefreq: 'monthly' },
    { path: '/partner', priority: 0.6, changefreq: 'monthly' },
  ];

  // Best-of categories
  const bestOfCategories = ['food', 'events', 'culture', 'attractions', 'shopping'];
  
  // Generate XML
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:mobile="http://www.google.com/schemas/sitemap-mobile/1.0" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">`;

  // Add static pages
  for (const page of staticPages) {
    xml += `
<url>
  <loc>${baseUrl}${page.path}</loc>
  <lastmod>${currentDate}</lastmod>
  <changefreq>${page.changefreq}</changefreq>
  <priority>${page.priority}</priority>
</url>`;
  }

  // Add best-of category pages
  for (const category of bestOfCategories) {
    xml += `
<url>
  <loc>${baseUrl}/best-of/${category}</loc>
  <lastmod>${currentDate}</lastmod>
  <changefreq>weekly</changefreq>
  <priority>0.8</priority>
</url>`;
  }

  // Add dynamic article pages (you'll need to populate this with your actual articles)
  const articles = getArticlesFromLocalStorage();
  for (const article of articles) {
    if (article.status === 'published') {
      xml += `
<url>
  <loc>${baseUrl}/articles/${article.id}</loc>
  <lastmod>${article.updatedAt || currentDate}</lastmod>
  <changefreq>weekly</changefreq>
  <priority>0.8</priority>
</url>`;
    }
  }

  xml += `
</urlset>`;

  // Write to file
  const sitemapPath = path.join(__dirname, '../public/sitemap.xml');
  fs.writeFileSync(sitemapPath, xml);
  console.log('Sitemap generated successfully!');
}

// Run the script
generateSitemap();
