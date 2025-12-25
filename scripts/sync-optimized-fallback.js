#!/usr/bin/env node

/**
 * Script to sync BOTH articles AND events from Supabase to optimized-fallback.json
 * This ensures events like "Witch Perfect" are included with their images
 */

import { promises as fs } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

// Load .env.local file
dotenv.config({ path: '.env.local' })

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Supabase configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://itdmwpbsnviassgqfhxk.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0ZG13cGJzbnZpYXNzZ3FmaHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0ODU5NjUsImV4cCI6MjA2OTA2MTk2NX0.pxAXREQJrXJFZEBB3s7iwfm3rV_C383EbWCwf6ayPQo'

async function syncAllContent() {
    try {
        console.log('🔄 Syncing articles AND events from Supabase to optimized-fallback.json...')

        // Fetch articles from Supabase
        console.log('📰 Fetching articles...')
        const articlesResponse = await fetch(`${SUPABASE_URL}/rest/v1/articles?select=*&order=created_at.desc&limit=50`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            }
        })

        if (!articlesResponse.ok) {
            throw new Error(`Articles request failed: ${articlesResponse.status} ${articlesResponse.statusText}`)
        }

        const articles = await articlesResponse.json()
        console.log(`✅ Fetched ${articles.length} articles from Supabase`)

        // Fetch events from Supabase
        console.log('🎭 Fetching events...')
        const eventsResponse = await fetch(`${SUPABASE_URL}/rest/v1/events?select=*&order=created_at.desc&limit=20`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            }
        })

        if (!eventsResponse.ok) {
            throw new Error(`Events request failed: ${eventsResponse.status} ${eventsResponse.statusText}`)
        }

        const events = await eventsResponse.json()
        console.log(`✅ Fetched ${events.length} events from Supabase`)

        // Transform articles to match our interface
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
            type: 'article',
            status: article.status || 'published',
            imageUrl: article.image_url,
            date: article.created_at,
            createdAt: article.created_at,
            updatedAt: article.updated_at,
            // Trending flags
            trendingHome: article.trending_home || false,
            trendingEdmonton: article.trending_edmonton || false,
            trendingCalgary: article.trending_calgary || false,
            // Featured flags
            featuredHome: article.featured_home || false,
            featuredEdmonton: article.featured_edmonton || false,
            featuredCalgary: article.featured_calgary || false
        }))

        // Transform events to match our interface
        const transformedEvents = events.map(event => ({
            id: event.id,
            title: event.title,
            content: event.description || event.excerpt || '',
            excerpt: event.excerpt || '',
            category: event.category || 'Events',
            categories: [event.category || 'Events'],
            location: event.location || 'Alberta',
            author: event.organizer || 'Event Organizer',
            tags: [],
            type: 'event',
            status: event.status || 'published',
            // FIX: Filter out base64 images - only use proper Supabase Storage URLs
            // This prevents gray placeholders on the homepage (which rejects base64 for bandwidth reasons)
            imageUrl: (event.image_url && !event.image_url.startsWith('data:image'))
                ? event.image_url
                : '',
            date: event.event_date || event.created_at,
            createdAt: event.created_at,
            updatedAt: event.updated_at,
            // Event-specific fields
            event_date: event.event_date,
            event_end_date: event.event_end_date,
            organizer: event.organizer,
            // Trending flags
            trendingHome: event.featured_home || false,
            trendingEdmonton: event.featured_edmonton || false,
            trendingCalgary: event.featured_calgary || false,
            // Featured flags
            featuredHome: event.featured_home || false,
            featuredEdmonton: event.featured_edmonton || false,
            featuredCalgary: event.featured_calgary || false
        }))

        // Combine all content
        const allContent = [...transformedArticles, ...transformedEvents]

        // Write to optimized-fallback.json file
        const fallbackPath = path.join(__dirname, '..', 'optimized-fallback.json')
        await fs.writeFile(fallbackPath, JSON.stringify(allContent, null, 2))

        console.log(`💾 Saved ${allContent.length} items to ${fallbackPath}`)
        console.log(`   📰 ${transformedArticles.length} articles`)
        console.log(`   🎭 ${transformedEvents.length} events`)

        // Also update lib/data/articles.json for compatibility
        const articlesPath = path.join(__dirname, '..', 'lib', 'data', 'articles.json')
        await fs.writeFile(articlesPath, JSON.stringify(transformedArticles, null, 2))
        console.log(`✅ Also updated ${articlesPath}`)

        console.log('🎉 SYNC COMPLETE!')
        console.log('📝 Next steps:')
        console.log('1. Refresh your website to see the new articles and events')
        console.log('2. If still not showing, restart the dev server: npm run dev')

    } catch (error) {
        console.error('❌ Error syncing content:', error.message)
        process.exit(1)
    }
}

// Run the sync
syncAllContent()
