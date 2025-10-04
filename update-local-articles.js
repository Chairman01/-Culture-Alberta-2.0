import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the raw articles from Supabase
const rawArticles = JSON.parse(fs.readFileSync('temp_articles.json', 'utf8'));
console.log(`Fetched ${rawArticles.length} articles from Supabase`);

// Transform articles to match our interface
const transformedArticles = rawArticles.map(article => ({
  id: article.id,
  title: article.title,
  content: article.content,
  excerpt: article.excerpt,
  category: article.category,
  categories: article.categories || [article.category],
  location: article.location,
  author: article.author,
  tags: article.tags || [],
  type: article.type || 'article',
  status: article.status || 'published',
  imageUrl: article.image_url,
  date: article.created_at,
  createdAt: article.created_at,
  updatedAt: article.updated_at,
  // Trending flags
  trendingHome: article.trending_home || false,
  trendingEdmonton: article.trending_edmonton || false,
  trendingCalgary: article.trending_calgary || false,
  // Featured flags
  featuredHome: article.featured_home || false,
  featuredEdmonton: article.featured_edmonton || false,
  featuredCalgary: article.featured_calgary || false
}));

// Write to the local articles file
const articlesPath = path.join(__dirname, 'lib', 'data', 'articles.json');
fs.writeFileSync(articlesPath, JSON.stringify(transformedArticles, null, 2));

console.log(`✅ Updated local articles.json with ${transformedArticles.length} articles`);

// Clean up temp file
fs.unlinkSync('temp_articles.json');

console.log('🎉 Local articles file updated successfully!');
