const fs = require('fs');

console.log('📦 Generating optimized fallback from lib/data/articles.json...\n');

const articles = require('./lib/data/articles.json');
const MAX_SIZE = 1000000; // Increased to 1MB to allow full articles

const optimized = articles.map(a => ({
  id: a.id,
  title: a.title,
  slug: a.slug,
  category: a.category,
  categories: a.categories,
  type: a.type,
  status: a.status,
  created_at: a.created_at,
  updated_at: a.updated_at,
  // Strip out embedded image data
  imageUrl: typeof a.imageUrl === 'string' && a.imageUrl.startsWith('data:') ? null : a.imageUrl,
  // Use full content without truncation
  content: a.content || '',
  excerpt: a.excerpt || '',
  trendingHome: a.trendingHome,
  trendingEdmonton: a.trendingEdmonton,
  trendingCalgary: a.trendingCalgary,
  featuredHome: a.featuredHome,
  featuredEdmonton: a.featuredEdmonton,
  featuredCalgary: a.featuredCalgary,
  date: a.date,
  author: a.author,
  location: a.location,
  tags: a.tags
}));

fs.writeFileSync('optimized-fallback.json', JSON.stringify(optimized, null, 2));

const size = Math.round(fs.statSync('optimized-fallback.json').size / 1024);
const events = optimized.filter(a => a.type === 'event');

console.log('✅ Created optimized-fallback.json');
console.log(`   Size: ${size} KB`);
console.log(`   Total items: ${optimized.length}`);
console.log(`   Articles: ${optimized.length - events.length}`);
console.log(`   Events: ${events.length}`);
console.log('\n🎉 Done! Ready to deploy.');

