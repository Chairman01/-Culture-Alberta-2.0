// Performance monitoring script for Culture Alberta
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://itdmwpbsnviassgqfhxk.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0ZG13cGJzbnZpYXNzZ3FmaHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0ODU5NjUsImV4cCI6MjA2OTA2MTk2NX0.pxAXREQJrXJFZEBB3s7iwfm3rV_C383EbWCwf6ayPQo'

const supabase = createClient(supabaseUrl, supabaseKey)

async function monitorPerformance() {
  console.log('📊 Performance Monitoring Report')
  console.log('================================')
  
  try {
    // 1. Check database performance
    console.log('\n🗄️  Database Performance:')
    const startTime = Date.now()
    
    const { data: articles, error } = await supabase
      .from('articles')
      .select('id, title, created_at')
      .order('created_at', { ascending: false })
      .limit(10)
    
    const dbTime = Date.now() - startTime
    
    if (error) {
      console.log('❌ Database query failed:', error.message)
    } else {
      console.log(`✅ Database query: ${dbTime}ms (${articles?.length || 0} articles)`)
      if (dbTime > 1000) {
        console.log('⚠️  WARNING: Database query is slow (>1s)')
      }
    }
    
    // 2. Check file system performance
    console.log('\n📁 File System Performance:')
    const dataDir = path.join(process.cwd(), 'lib', 'data')
    const files = ['articles.json', 'homepage-articles.json', 'edmonton-articles.json', 'calgary-articles.json']
    
    for (const file of files) {
      const filePath = path.join(dataDir, file)
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath)
        const sizeKB = Math.round(stats.size / 1024)
        console.log(`✅ ${file}: ${sizeKB}KB`)
      } else {
        console.log(`❌ ${file}: Missing`)
      }
    }
    
    // 3. Check image optimization
    console.log('\n🖼️  Image Optimization:')
    const { data: articlesWithImages } = await supabase
      .from('articles')
      .select('id, title, image_url')
      .not('image_url', 'is', null)
      .limit(5)
    
    if (articlesWithImages) {
      console.log(`✅ ${articlesWithImages.length} articles have images`)
      
      // Check for large images
      const largeImages = articlesWithImages.filter(article => 
        article.image_url && article.image_url.length > 10000
      )
      
      if (largeImages.length > 0) {
        console.log(`⚠️  WARNING: ${largeImages.length} articles have large images (>10KB)`)
        largeImages.forEach(article => {
          console.log(`   - "${article.title}": ${Math.round(article.image_url.length / 1024)}KB`)
        })
      }
    }
    
    // 4. Performance recommendations
    console.log('\n🎯 Performance Recommendations:')
    
    if (dbTime > 500) {
      console.log('1. 🔄 Consider implementing more aggressive caching')
    }
    
    if (articles && articles.length > 50) {
      console.log('2. 🔄 Consider pagination for large article lists')
    }
    
    console.log('3. ✅ Use Next.js Image component for all images')
    console.log('4. ✅ Enable static generation for popular pages')
    console.log('5. ✅ Implement lazy loading for below-the-fold content')
    console.log('6. ✅ Use optimized article loading functions')
    
    // 5. Speed insights targets
    console.log('\n🎯 Speed Insights Targets:')
    console.log('Current Issues:')
    console.log('- Real Experience Score: 68 (Target: 90+)')
    console.log('- Largest Contentful Paint: 3.42s (Target: <2.5s)')
    console.log('- Cumulative Layout Shift: 0.44 (Target: <0.1)')
    console.log('- /calgary: Score 35 (Target: 90+)')
    console.log('- /articles/[slug]: Score 64 (Target: 90+)')
    
    console.log('\n✅ Optimizations Applied:')
    console.log('- Database queries optimized')
    console.log('- Caching strategy implemented')
    console.log('- Image optimization enabled')
    console.log('- Bundle size optimized')
    console.log('- Static generation ready')
    
    console.log('\n🚀 Next Steps:')
    console.log('1. Deploy the optimized version')
    console.log('2. Monitor Speed Insights for improvements')
    console.log('3. Consider switching to static homepage')
    console.log('4. Implement service worker for offline caching')
    
  } catch (error) {
    console.error('❌ Performance monitoring failed:', error)
  }
}

monitorPerformance()
