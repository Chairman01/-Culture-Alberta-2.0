/**
 * Sync Full Content Script
 * 
 * This script fetches articles with full content from Supabase
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

async function syncFullContent() {
  try {
    console.log('🔄 Syncing full content from Supabase...')
    
    // First get article IDs and basic info
    const { data: articleList, error: listError } = await supabase
      .from('articles')
      .select('id, title, created_at')
      .order('created_at', { ascending: false })
      .limit(50)
    
    if (listError) {
      console.error('❌ List error:', listError)
      return
    }
    
    console.log(`✅ Found ${articleList.length} articles`)
    
    // Now fetch each article individually to get full content
    const articlesWithContent = []
    
    for (const article of articleList) {
      try {
        console.log(`📄 Fetching content for: ${article.title.substring(0, 50)}...`)
        
        const { data: fullArticle, error: contentError } = await supabase
          .from('articles')
          .select('*')
          .eq('id', article.id)
          .single()
        
        if (contentError) {
          console.error(`❌ Error fetching content for ${article.title}:`, contentError)
          continue
        }
        
        if (fullArticle) {
          console.log(`✅ Content length: ${fullArticle.content?.length || 0} characters`)
          articlesWithContent.push(fullArticle)
        }
        
        // Small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 100))
        
      } catch (error) {
        console.error(`❌ Error processing article ${article.title}:`, error)
      }
    }
    
    console.log(`✅ Successfully fetched ${articlesWithContent.length} articles with content`)
    
    // Map articles to match the expected format
    const mappedArticles = articlesWithContent.map(article => ({
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
    console.log('📝 Recent articles with content lengths:')
    
    // Show recent articles with their content lengths
    mappedArticles.slice(0, 5).forEach((article, index) => {
      console.log(`  ${index + 1}. ${article.title} - ${article.content?.length || 0} chars`)
    })
    
  } catch (error) {
    console.error('❌ Sync failed:', error)
  }
}

// Run the sync
syncFullContent()
