import fs from 'fs';

// Read the current articles.json
const articles = JSON.parse(fs.readFileSync('articles.json', 'utf-8'));

// Create MINIMAL backup with only homepage essentials
const minimalArticles = articles.map(article => ({
  id: article.id,
  title: article.title,
  excerpt: article.excerpt ? article.excerpt.substring(0, 200) + '...' : '', // Limit excerpt
  category: article.category,
  categories: article.categories,
  status: article.status,
  created_at: article.created_at,
  createdAt: article.createdAt,
  date: article.date,
  type: article.type,
  author: article.author || 'Culture Alberta',
  imageUrl: article.imageUrl,
  
  // Keep trending/featured flags
  trendingHome: article.trendingHome,
  trendingEdmonton: article.trendingEdmonton,
  trendingCalgary: article.trendingCalgary,
  featuredHome: article.featuredHome,
  featuredEdmonton: article.featuredEdmonton,
  featuredCalgary: article.featuredCalgary,
}));

// Write minimal backup
fs.writeFileSync('articles-minimal.json', JSON.stringify(minimalArticles, null, 2));

// Check file sizes
const originalSize = fs.statSync('articles.json').size;
const minimalSize = fs.statSync('articles-minimal.json').size;

console.log(`Original articles.json: ${Math.round(originalSize / 1024 / 1024 * 100) / 100} MB`);
console.log(`Minimal articles-minimal.json: ${Math.round(minimalSize / 1024)} KB`);
console.log(`Size reduction: ${Math.round((1 - minimalSize / originalSize) * 100)}%`);
console.log(`Articles count: ${minimalArticles.length}`);

// Show sample article
console.log('\nSample article:');
console.log(JSON.stringify(minimalArticles[0], null, 2));
