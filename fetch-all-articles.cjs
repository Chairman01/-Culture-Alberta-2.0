const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Read env from .env.local file manually
const envPath = '.env.local';
let supabaseUrl, supabaseKey;

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/);
  const keyMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/);
  
  if (urlMatch) supabaseUrl = urlMatch[1].trim();
  if (keyMatch) supabaseKey = keyMatch[1].trim();
}

// Fallback to environment variables
if (!supabaseUrl) supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!supabaseKey) supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials!');
  console.error('Please create a .env.local file with:');
  console.error('NEXT_PUBLIC_SUPABASE_URL=your_url');
  console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchAllArticles() {
  console.log('🔍 Fetching ALL articles from Supabase...\n');
  
  // Fetch ALL articles without limit
  const { data, error, count } = await supabase
    .from('articles')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('❌ Error:', error);
    return;
  }
  
  console.log(`✅ Found ${data.length} total articles in Supabase`);
  
  // Count articles vs events
  const articles = data.filter(item => item.type !== 'event');
  const events = data.filter(item => item.type === 'event');
  
  console.log(`   📄 Articles: ${articles.length}`);
  console.log(`   📅 Events: ${events.length}`);
  
  // Show breakdown by status
  const published = data.filter(item => item.status === 'published');
  const draft = data.filter(item => item.status === 'draft');
  
  console.log(`\n📊 By Status:`);
  console.log(`   ✅ Published: ${published.length}`);
  console.log(`   📝 Draft: ${draft.length}`);
  
  // Show most recent 10
  console.log(`\n📋 Most Recent 10 Items:\n`);
  data.slice(0, 10).forEach((item, i) => {
    const type = item.type === 'event' ? '📅 EVENT' : '📄 ARTICLE';
    console.log(`${i + 1}. ${type}: ${item.title}`);
    console.log(`   Status: ${item.status} | Created: ${item.created_at}\n`);
  });
  
  // Generate optimized fallback
  console.log('🔄 Generating optimized fallback...\n');
  
  const MAX_FALLBACK_CONTENT_SIZE = 500;
  const optimizedArticles = data.map(article => ({
    id: article.id,
    title: article.title,
    slug: article.slug,
    category: article.category,
    categories: article.categories,
    type: article.type,
    status: article.status,
    created_at: article.created_at,
    updated_at: article.updated_at,
    imageUrl: article.image_url || article.image,
    // Truncate content for fallback to keep file size small
    content: article.content && article.content.length > MAX_FALLBACK_CONTENT_SIZE
      ? article.content.substring(0, MAX_FALLBACK_CONTENT_SIZE) + '... [truncated]'
      : article.content,
    excerpt: article.excerpt && article.excerpt.length > MAX_FALLBACK_CONTENT_SIZE
      ? article.excerpt.substring(0, MAX_FALLBACK_CONTENT_SIZE) + '... [truncated]'
      : article.excerpt,
    // Include other essential fields
    trendingHome: article.trending_home,
    trendingEdmonton: article.trending_edmonton,
    trendingCalgary: article.trending_calgary,
    featuredHome: article.featured_home,
    featuredEdmonton: article.featured_edmonton,
    featuredCalgary: article.featured_calgary,
    date: article.created_at,
    author: article.author,
    location: article.location,
    tags: article.tags,
  }));
  
  fs.writeFileSync('optimized-fallback.json', JSON.stringify(optimizedArticles, null, 2), 'utf-8');
  
  const fileSize = Math.round(fs.statSync('optimized-fallback.json').size / 1024);
  console.log(`✅ Created optimized-fallback.json`);
  console.log(`   Size: ${fileSize} KB`);
  console.log(`   Articles: ${optimizedArticles.length}`);
  console.log(`\n🎉 Done! Your fallback is ready with ALL articles.`);
}

fetchAllArticles();

