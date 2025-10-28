/**
 * Sync New Articles Script
 * 
 * This script fetches the latest articles from Supabase and updates the fallback file
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://itdmwpbsnviassgqfhxk.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0ZG13cGJzbnZpYXNzZ3FmaHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0ODU5NjUsImV4cCI6MjA2OTA2MTk2NX0.pxAXREQJrXJFZEBB3s7iwfm3rV_C383EbWCwf6ayPQo'

const supabase = createClient(supabaseUrl, supabaseKey)

async function syncArticles() {
  try {
    console.log('🔄 Syncing articles from Supabase...')
    
    // First, try to get recent articles only (last 50) with a longer timeout
    const { data: recentArticles, error: recentError } = await supabase
      .from('articles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
      .abortSignal(AbortSignal.timeout(30000)) // 30 second timeout
    
    if (recentError) {
      console.error('❌ Recent articles error:', recentError)
      
      // If recent articles fail, try with a smaller limit
      console.log('🔄 Trying with smaller limit...')
      const { data: smallArticles, error: smallError } = await supabase
        .from('articles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)
      
      if (smallError) {
        console.error('❌ Small articles error:', smallError)
        console.log('⚠️ Using existing fallback file...')
        return
      }
      
      console.log(`✅ Fetched ${smallArticles?.length || 0} recent articles from Supabase`)
      await processArticles(smallArticles)
      return
    }
    
    console.log(`✅ Fetched ${recentArticles?.length || 0} recent articles from Supabase`)
    await processArticles(recentArticles)
    
  } catch (error) {
    console.error('❌ Sync failed:', error)
  }
}

async function processArticles(articles) {
  if (!articles || articles.length === 0) {
    console.log('⚠️ No articles found')
    return
  }
  
  // Map articles to match the expected format
  const mappedArticles = articles.map(article => ({
    ...article,
    imageUrl: article.image_url,
    date: article.created_at,
    trendingHome: article.trending_home || false,
    trendingEdmonton: article.trending_edmonton || false,
    trendingCalgary: article.trending_calgary || false,
    featuredHome: article.featured_home || false,
    featuredEdmonton: article.featured_edmonton || false,
    featuredCalgary: article.featured_calgary || false,
    createdAt: article.created_at,
    updatedAt: article.updated_at,
  }))
  
  // Write to fallback file
  const fallbackPath = path.join(__dirname, '..', 'optimized-fallback.json')
  fs.writeFileSync(fallbackPath, JSON.stringify(mappedArticles, null, 2))
  
  console.log(`✅ Updated fallback file with ${mappedArticles.length} articles`)
  console.log('📝 Recent articles:')
  
  // Show recent articles
  mappedArticles.slice(0, 5).forEach((article, index) => {
    console.log(`  ${index + 1}. ${article.title} (${article.type}) - ${article.createdAt}`)
  })
}

// Run the sync
syncArticles()
