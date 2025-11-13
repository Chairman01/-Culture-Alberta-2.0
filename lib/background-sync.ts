// Background sync system to keep file system updated with Supabase data
// This runs in the background without blocking user requests

// Only import fs on server-side using dynamic imports
let fs: any = null
let path: any = null

// Dynamic import function for server-side modules
async function loadServerModules() {
  if (typeof window === 'undefined' && !fs && !path) {
    try {
      fs = (await import('fs')).promises
      path = await import('path')
    } catch (error) {
      console.warn('File system modules not available:', error)
    }
  }
}

interface SyncStatus {
  lastSync: number
  isRunning: boolean
  lastError?: string
}

let syncStatus: SyncStatus = {
  lastSync: 0,
  isRunning: false
}

// Background sync interval (5 minutes)
const SYNC_INTERVAL = 5 * 60 * 1000

// Check if we need to sync
export function shouldSync(): boolean {
  const now = Date.now()
  const timeSinceLastSync = now - syncStatus.lastSync
  
  // Sync if:
  // 1. Never synced before
  // 2. More than 5 minutes since last sync
  // 3. Not currently running
  return syncStatus.lastSync === 0 || 
         timeSinceLastSync > SYNC_INTERVAL || 
         !syncStatus.isRunning
}

// Background sync function
export async function backgroundSync(): Promise<void> {
  if (syncStatus.isRunning) {
    console.log('🔄 Background sync already running, skipping...')
    return
  }

  // Only run on server-side
  if (typeof window !== 'undefined') {
    console.log('🚀 Client-side - background sync disabled')
    return
  }

  // Only run in development (file system is read-only in production)
  if (process.env.NODE_ENV === 'production') {
    console.log('🚀 Production environment - background sync disabled')
    return
  }

  // Load server modules dynamically
  await loadServerModules()
  
  if (!fs || !path) {
    console.warn('⚠️ File system modules not available for background sync')
    return
  }

  syncStatus.isRunning = true
  console.log('🔄 Starting background sync...')

  try {
    // Fetch articles from Supabase
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://itdmwpbsnviassgqfhxk.supabase.co'
    const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0ZG13cGJzbnZpYXNzZ3FmaHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0ODU5NjUsImV4cCI6MjA2OTA2MTk2NX0.pxAXREQJrXJFZEBB3s7iwfm3rV_C383EbWCwf6ayPQo'
    
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
    console.log(`✅ Background sync: Fetched ${articles.length} articles from Supabase`)
    
    // Debug: Check if "hello" article is in the response
    const helloArticle = articles.find((a: any) => a.title?.toLowerCase().includes('hello'))
    if (helloArticle) {
      console.log('✅ Found "hello" article in Supabase:', helloArticle.title, helloArticle.status)
    } else {
      console.log('❌ "hello" article not found in Supabase response')
      console.log('Available articles:', articles.map((a: any) => a.title).slice(0, 5))
    }
    
    // Transform articles to match our interface
    const transformedArticles = articles.map((article: any) => ({
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
    
    // Write to file system
    const articlesPath = path.join(process.cwd(), 'lib', 'data', 'articles.json')
    await fs.writeFile(articlesPath, JSON.stringify(transformedArticles, null, 2))
    
    syncStatus.lastSync = Date.now()
    syncStatus.lastError = undefined
    console.log(`✅ Background sync completed: Updated articles.json with ${transformedArticles.length} articles`)
    
  } catch (error) {
    syncStatus.lastError = error instanceof Error ? error.message : 'Unknown error'
    console.error('❌ Background sync failed:', error)
  } finally {
    syncStatus.isRunning = false
  }
}

// Start background sync if needed
export async function startBackgroundSyncIfNeeded(): Promise<void> {
  if (shouldSync()) {
    // Run in background without blocking
    backgroundSync().catch(error => {
      console.error('Background sync error:', error)
    })
  }
}

// Get sync status
export function getSyncStatus(): SyncStatus {
  return { ...syncStatus }
}

// Force sync (for manual triggers)
export async function forceSync(): Promise<void> {
  syncStatus.lastSync = 0 // Reset to force sync
  await backgroundSync()
}
