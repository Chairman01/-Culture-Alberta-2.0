import fs from 'fs';

// Read the current articles.json
const articles = JSON.parse(fs.readFileSync('articles.json', 'utf-8'));

// Create optimized backup with only essential fields for homepage
const optimizedArticles = articles.map(article => ({
  id: article.id,
  title: article.title,
  excerpt: article.excerpt,
  category: article.category,
  categories: article.categories,
  status: article.status,
  created_at: article.created_at,
  createdAt: article.createdAt,
  date: article.date,
  type: article.type,
  author: article.author,
  imageUrl: article.imageUrl,
  // Remove the massive content field for homepage use
  // content: article.content, // This is what's making it huge!
  
  // Keep trending/featured flags
  trendingHome: article.trendingHome,
  trendingEdmonton: article.trendingEdmonton,
  trendingCalgary: article.trendingCalgary,
  featuredHome: article.featuredHome,
  featuredEdmonton: article.featuredEdmonton,
  featuredCalgary: article.featuredCalgary,
}));

// Write optimized backup
fs.writeFileSync('articles-homepage.json', JSON.stringify(optimizedArticles, null, 2));

// Check file sizes
const originalSize = fs.statSync('articles.json').size;
const optimizedSize = fs.statSync('articles-homepage.json').size;

console.log(`Original articles.json: ${Math.round(originalSize / 1024 / 1024 * 100) / 100} MB`);
console.log(`Optimized articles-homepage.json: ${Math.round(optimizedSize / 1024)} KB`);
console.log(`Size reduction: ${Math.round((1 - optimizedSize / originalSize) * 100)}%`);
console.log(`Articles count: ${optimizedArticles.length}`);
