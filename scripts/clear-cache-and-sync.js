// Script to clear cache and sync articles
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://itdmwpbsnviassgqfhxk.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0ZG13cGJzbnZpYXNzZ3FmaHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0ODU5NjUsImV4cCI6MjA2OTA2MTk2NX0.pxAXREQJrXJFZEBB3s7iwfm3rV_C383EbWCwf6ayPQo'

const supabase = createClient(supabaseUrl, supabaseKey)

async function clearCacheAndSync() {
  console.log('🧹 Clearing cache and syncing articles...')
  
  try {
    // 1. Clear any existing cache files
    const cacheFiles = [
      'lib/data/articles.json',
      '.next/cache',
      'node_modules/.cache'
    ]
    
    for (const file of cacheFiles) {
      try {
        if (fs.existsSync(file)) {
          if (fs.statSync(file).isDirectory()) {
            fs.rmSync(file, { recursive: true, force: true })
            console.log(`🗑️  Cleared directory: ${file}`)
          } else {
            fs.unlinkSync(file)
            console.log(`🗑️  Cleared file: ${file}`)
          }
        }
      } catch (error) {
        console.log(`⚠️  Could not clear ${file}:`, error.message)
      }
    }
    
    // 2. Fetch fresh articles from Supabase
    console.log('📡 Fetching fresh articles from Supabase...')
    const { data: articles, error } = await supabase
      .from('articles')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('❌ Error fetching articles:', error)
      return
    }
    
    console.log(`✅ Fetched ${articles?.length || 0} articles from Supabase`)
    
    // 3. Transform articles to match our interface
    const transformedArticles = articles?.map((article) => ({
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
      featuredCalgary: article.featured_calgary || false
    })) || []
    
    // 4. Ensure the data directory exists
    const dataDir = path.join(process.cwd(), 'lib', 'data')
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
    }
    
    // 5. Write articles to file
    const articlesPath = path.join(dataDir, 'articles.json')
    fs.writeFileSync(articlesPath, JSON.stringify(transformedArticles, null, 2))
    console.log(`💾 Saved ${transformedArticles.length} articles to ${articlesPath}`)
    
    // 6. Check for articles without content
    const articlesWithoutContent = transformedArticles.filter(article => 
      !article.content || article.content.trim() === ''
    )
    
    if (articlesWithoutContent.length > 0) {
      console.log(`⚠️  Found ${articlesWithoutContent.length} articles without content:`)
      articlesWithoutContent.forEach((article, index) => {
        console.log(`   ${index + 1}. "${article.title}" (ID: ${article.id})`)
      })
    } else {
      console.log('✅ All articles have content!')
    }
    
    console.log('🎉 Cache cleared and articles synced successfully!')
    console.log('🚀 Your website should now show proper content instead of placeholders.')
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

clearCacheAndSync()
