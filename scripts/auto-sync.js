#!/usr/bin/env node

/**
 * Auto-sync script that runs every 5 minutes to keep articles.json updated
 * Run this with: node scripts/auto-sync.js
 */

import { promises as fs } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Supabase configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://itdmwpbsnviassgqfhxk.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0ZG13cGJzbnZpYXNzZ3FmaHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0ODU5NjUsImV4cCI6MjA2OTA2MTk2NX0.pxAXREQJrXJFZEBB3s7iwfm3rV_C383EbWCwf6ayPQo'

async function syncArticles() {
  try {
    console.log(`🔄 [${new Date().toLocaleTimeString()}] Auto-syncing articles...`)
    
    // Fetch articles from Supabase
    const response = await fetch(`${SUPABASE_URL}/rest/v1/articles?select=*`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      throw new Error(`Supabase request failed: ${response.status} ${response.statusText}`)
    }
    
    const articles = await response.json()
    
    // Transform articles
    const transformedArticles = articles.map(article => ({
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
    }))
    
    // Write to articles.json
    const articlesPath = path.join(__dirname, '..', 'lib', 'data', 'articles.json')
    await fs.writeFile(articlesPath, JSON.stringify(transformedArticles, null, 2))
    
    console.log(`✅ [${new Date().toLocaleTimeString()}] Synced ${transformedArticles.length} articles`)
    
  } catch (error) {
    console.error(`❌ [${new Date().toLocaleTimeString()}] Sync failed:`, error.message)
  }
}

// Run sync every 5 minutes
console.log('🚀 Starting auto-sync (every 5 minutes)...')
console.log('Press Ctrl+C to stop')

// Initial sync
await syncArticles()

// Set up interval
setInterval(syncArticles, 5 * 60 * 1000) // 5 minutes
