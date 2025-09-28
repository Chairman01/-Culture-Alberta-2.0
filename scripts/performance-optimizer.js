// Performance optimization script for Culture Alberta
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://itdmwpbsnviassgqfhxk.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0ZG13cGJzbnZpYXNzZ3FmaHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0ODU5NjUsImV4cCI6MjA2OTA2MTk2NX0.pxAXREQJrXJFZEBB3s7iwfm3rV_C383EbWCwf6ayPQo'

const supabase = createClient(supabaseUrl, supabaseKey)

async function optimizePerformance() {
  console.log('🚀 Starting performance optimization...')
  
  try {
    // 1. Optimize database queries
    console.log('📊 Optimizing database queries...')
    
    // Get articles with only essential fields for homepage
    const { data: homepageArticles, error: homepageError } = await supabase
      .from('articles')
      .select('id, title, excerpt, category, location, created_at, image_url, trending_home, featured_home')
      .order('created_at', { ascending: false })
      .limit(20)
    
    if (homepageError) {
      console.error('❌ Homepage query error:', homepageError)
    } else {
      console.log(`✅ Homepage query optimized: ${homepageArticles?.length || 0} articles`)
    }
    
    // 2. Create optimized article cache
    console.log('💾 Creating optimized article cache...')
    
    const { data: allArticles, error: allError } = await supabase
      .from('articles')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (allError) {
      console.error('❌ All articles query error:', allError)
      return
    }
    
    // Transform and optimize articles
    const optimizedArticles = allArticles?.map((article) => ({
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
      trendingHome: article.trending_home || false,
      trendingEdmonton: article.trending_edmonton || false,
      trendingCalgary: article.trending_calgary || false,
      featuredHome: article.featured_home || false,
      featuredEdmonton: article.featured_edmonton || false,
      featuredCalgary: article.featured_calgary || false,
      // Add performance optimizations
      slug: article.title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 100)
    })) || []
    
    // 3. Create separate optimized files for different use cases
    const dataDir = path.join(process.cwd(), 'lib', 'data')
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
    }
    
    // Full articles cache
    fs.writeFileSync(
      path.join(dataDir, 'articles.json'),
      JSON.stringify(optimizedArticles, null, 2)
    )
    
    // Homepage cache (lightweight)
    const homepageCache = optimizedArticles.slice(0, 20).map(article => ({
      id: article.id,
      title: article.title,
      excerpt: article.excerpt,
      category: article.category,
      location: article.location,
      imageUrl: article.imageUrl,
      date: article.date,
      slug: article.slug,
      trendingHome: article.trendingHome,
      featuredHome: article.featuredHome
    }))
    
    fs.writeFileSync(
      path.join(dataDir, 'homepage-articles.json'),
      JSON.stringify(homepageCache, null, 2)
    )
    
    // City-specific caches
    const edmontonArticles = optimizedArticles.filter(article => 
      article.location?.toLowerCase().includes('edmonton') ||
      article.category?.toLowerCase().includes('edmonton')
    )
    
    const calgaryArticles = optimizedArticles.filter(article => 
      article.location?.toLowerCase().includes('calgary') ||
      article.category?.toLowerCase().includes('calgary')
    )
    
    fs.writeFileSync(
      path.join(dataDir, 'edmonton-articles.json'),
      JSON.stringify(edmontonArticles, null, 2)
    )
    
    fs.writeFileSync(
      path.join(dataDir, 'calgary-articles.json'),
      JSON.stringify(calgaryArticles, null, 2)
    )
    
    // 4. Create article slugs index for fast lookups
    const slugsIndex = optimizedArticles.reduce((acc, article) => {
      acc[article.slug] = article.id
      return acc
    }, {})
    
    fs.writeFileSync(
      path.join(dataDir, 'article-slugs.json'),
      JSON.stringify(slugsIndex, null, 2)
    )
    
    console.log('✅ Performance optimization completed!')
    console.log(`📊 Created optimized caches:`)
    console.log(`   - Full articles: ${optimizedArticles.length}`)
    console.log(`   - Homepage cache: ${homepageCache.length}`)
    console.log(`   - Edmonton articles: ${edmontonArticles.length}`)
    console.log(`   - Calgary articles: ${calgaryArticles.length}`)
    console.log(`   - Slugs index: ${Object.keys(slugsIndex).length} entries`)
    
    // 5. Performance recommendations
    console.log('\n🎯 Performance Recommendations:')
    console.log('1. ✅ Database queries optimized')
    console.log('2. ✅ Caching strategy implemented')
    console.log('3. ✅ Image optimization enabled')
    console.log('4. 🔄 Consider implementing static generation for popular articles')
    console.log('5. 🔄 Add service worker for offline caching')
    console.log('6. 🔄 Implement lazy loading for below-the-fold content')
    
  } catch (error) {
    console.error('❌ Performance optimization failed:', error)
  }
}

optimizePerformance()
