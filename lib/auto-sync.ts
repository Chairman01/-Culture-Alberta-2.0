/**
 * Auto-Sync System
 * 
 * Automatically syncs articles when they're created or updated
 * This eliminates the need for manual sync operations
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://itdmwpbsnviassgqfhxk.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0ZG13cGJzbnZpYXNzZ3FmaHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0ODU5NjUsImV4cCI6MjA2OTA2MTk2NX0.pxAXREQJrXJFZEBB3s7iwfm3rV_C383EbWCwf6ayPQo'

const supabase = createClient(supabaseUrl, supabaseKey)

export interface Article {
  id: string
  title: string
  content: string
  excerpt: string
  category: string
  categories: string[]
  imageUrl: string
  author: string
  date: string
  createdAt: string
  updatedAt: string
  status: string
  featuredHome: boolean
  featuredEdmonton: boolean
  featuredCalgary: boolean
  trendingHome: boolean
  trendingEdmonton: boolean
  trendingCalgary: boolean
  type: 'article' | 'event'
}

/**
 * Auto-sync articles from Supabase to fallback file
 * This runs automatically when articles are created/updated
 */
export async function autoSyncArticles(): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    console.log('🔄 Auto-sync: Starting automatic article sync...')
    
    // ULTRA-OPTIMIZED: Fetch recent articles AND events with minimal fields
    // Add timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Auto-sync timeout after 8 seconds')), 8000)
    )
    
    // Fetch only articles (skip events to avoid timeout)
    const articlesResult = await Promise.race([
      supabase
        .from('articles')
        .select('id,title,excerpt,content,category,categories,location,author,tags,type,status,created_at,updated_at,trending_home,trending_edmonton,trending_calgary,featured_home,featured_edmonton,featured_calgary,image_url')
        .order('created_at', { ascending: false })
        .limit(50),
      timeoutPromise
    ]) as any
    
    const { data: articles, error: articlesError } = articlesResult
    const events: any[] = [] // Skip events for now to avoid timeout
    const eventsError = null
    
    if (articlesError) {
      console.error('❌ Auto-sync: Articles error:', articlesError)
      return { success: false, count: 0, error: articlesError.message }
    }
    
    if (eventsError) {
      console.error('❌ Auto-sync: Events error:', eventsError)
      return { success: false, count: 0, error: eventsError.message }
    }
    
    console.log(`📊 Auto-sync: Found ${articles?.length || 0} articles and ${events?.length || 0} events`)
    
    // Debug: Check if articles have content
    if (articles && articles.length > 0) {
      console.log(`🔍 First article content length: ${articles[0].content?.length || 0}`)
      console.log(`🔍 First article has content field: ${'content' in articles[0]}`)
      console.log(`🔍 First article keys: ${Object.keys(articles[0]).join(', ')}`)
    }
    
    // Map articles to our format
    const mappedArticles: Article[] = (articles || []).map(article => {
      console.log(`📝 Mapping article: ${article.title} - Content length: ${article.content?.length || 0}`)
      return {
        ...article,
        imageUrl: article.image_url,
        date: article.created_at,
        content: article.content || '', // Ensure content is preserved
        trendingHome: article.trending_home || false,
        trendingEdmonton: article.trending_edmonton || false,
        trendingCalgary: article.trending_calgary || false,
        featuredHome: article.featured_home || false,
        featuredEdmonton: article.featured_edmonton || false,
        featuredCalgary: article.featured_calgary || false,
        createdAt: article.created_at,
        updatedAt: article.updated_at,
        type: 'article' as const
      }
    })
    
    // Map events to our format
    const mappedEvents: Article[] = (events || []).map(event => ({
      ...event,
      imageUrl: event.image_url,
      date: event.event_date || event.created_at,
      content: event.description || event.excerpt || '', // Use description or excerpt instead of content
      excerpt: event.excerpt || '',
      author: 'Event Organizer', // Events don't have author field
      tags: [], // Events don't have tags field
      categories: [event.category || 'Events'], // Events use single category
      trendingHome: event.trending_home || false,
      trendingEdmonton: event.trending_edmonton || false,
      trendingCalgary: event.trending_calgary || false,
      featuredHome: event.featured_home || false,
      featuredEdmonton: event.featured_edmonton || false,
      featuredCalgary: event.featured_calgary || false,
      createdAt: event.created_at,
      updatedAt: event.updated_at,
      type: 'event' as const,
      event_date: event.event_date,
      event_end_date: event.event_end_date,
      organizer: event.organizer
    }))
    
    // Combine articles and events
    const allContent = [...mappedArticles, ...mappedEvents]
    
    // Write to fallback file
    const fallbackPath = path.join(process.cwd(), 'optimized-fallback.json')
    fs.writeFileSync(fallbackPath, JSON.stringify(allContent, null, 2))
    
    console.log(`✅ Auto-sync: Successfully synced ${allContent.length} items (${mappedArticles.length} articles, ${mappedEvents.length} events)`)
    
    // Log content lengths for verification
    const articlesWithContent = mappedArticles.filter(a => a.content && a.content.length > 100)
    console.log(`📊 Auto-sync: ${articlesWithContent.length} articles have substantial content`)
    
    if (articlesWithContent.length > 0) {
      console.log('📝 Auto-sync: Content length samples:')
      articlesWithContent.slice(0, 3).forEach(article => {
        console.log(`  - ${article.title}: ${article.content.length} chars`)
      })
    }
    
    return { success: true, count: allContent.length }
    
  } catch (error) {
    console.error('❌ Auto-sync failed:', error)
    return { 
      success: false, 
      count: 0, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * Quick sync for a single article (used after create/update)
 */
export async function quickSyncArticle(articleId: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`🔄 Quick-sync: Syncing article ${articleId}...`)
    
    // Fetch the specific article
    const { data: article, error } = await supabase
      .from('articles')
      .select('id,title,excerpt,content,category,categories,location,author,tags,type,status,created_at,updated_at,trending_home,trending_edmonton,trending_calgary,featured_home,featured_edmonton,featured_calgary,image_url')
      .eq('id', articleId)
      .single()
    
    if (error) {
      console.error('❌ Quick-sync: Error fetching article:', error)
      return { success: false, error: error.message }
    }
    
    if (!article) {
      return { success: false, error: 'Article not found' }
    }
    
    // Load existing fallback
    const fallbackPath = path.join(process.cwd(), 'optimized-fallback.json')
    let existingArticles: Article[] = []
    
    try {
      const fallbackData = fs.readFileSync(fallbackPath, 'utf8')
      existingArticles = JSON.parse(fallbackData)
    } catch (e) {
      console.log('📝 Quick-sync: Creating new fallback file')
    }
    
    // Map the article
    const mappedArticle: Article = {
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
      type: 'article' as const
    }
    
    // Update or add the article
    const existingIndex = existingArticles.findIndex(a => a.id === articleId)
    if (existingIndex >= 0) {
      existingArticles[existingIndex] = mappedArticle
      console.log(`✅ Quick-sync: Updated article ${articleId}`)
    } else {
      existingArticles.unshift(mappedArticle) // Add to beginning
      console.log(`✅ Quick-sync: Added new article ${articleId}`)
    }
    
    // Write back to fallback
    fs.writeFileSync(fallbackPath, JSON.stringify(existingArticles, null, 2))
    
    console.log(`📊 Quick-sync: Article content length: ${mappedArticle.content?.length || 0} chars`)
    
    return { success: true }
    
  } catch (error) {
    console.error('❌ Quick-sync failed:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}
