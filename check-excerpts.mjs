#!/usr/bin/env node

/**
 * Check article excerpts in Supabase and optimized-fallback.json
 */

import dotenv from 'dotenv'
import { promises as fs } from 'fs'

dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://itdmwpbsnviassgqfhxk.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0ZG13cGJzbnZpYXNzZ3FmaHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0ODU5NjUsImV4cCI6MjA2OTA2MTk2NX0.pxAXREQJrXJFZEBB3s7iwfm3rV_C383EbWCwf6ayPQo'

async function checkExcerpts() {
    try {
        console.log('🔍 Checking article excerpts...\n')

        // Fetch recent articles from Supabase
        console.log('1. Checking Supabase database...')
        const response = await fetch(`${SUPABASE_URL}/rest/v1/articles?select=id,title,excerpt,description&order=created_at.desc&limit=5`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            }
        })

        if (!response.ok) {
            throw new Error(`Request failed: ${response.status} ${response.statusText}`)
        }

        const articles = await response.json()
        console.log(`\nFound ${articles.length} recent articles in Supabase:\n`)

        articles.forEach((article, idx) => {
            console.log(`--- Article ${idx + 1}: ${article.title.substring(0, 60)}...`)
            console.log(`ID: ${article.id}`)
            console.log(`Excerpt length: ${article.excerpt?.length || 0} characters`)
            console.log(`Excerpt: ${article.excerpt || '(null)'}`)
            console.log(`Description length: ${article.description?.length || 0} characters`)
            console.log(`Description: ${article.description || '(null)'}`)
            console.log()
        })

        // Check optimized-fallback.json
        console.log('='.repeat(70))
        console.log('\n2. Checking optimized-fallback.json file...\n')

        const fallbackData = await fs.readFile('./optimized-fallback.json', 'utf8')
        const fallbackArticles = JSON.parse(fallbackData)
        const articleItems = fallbackArticles.filter(item => item.type === 'article')

        console.log(`Found ${articleItems.length} articles in optimized-fallback.json\n`)

        // Check the same articles
        articleItems.slice(0, 5).forEach((article, idx) => {
            console.log(`--- Article ${idx + 1}: ${article.title.substring(0, 60)}...`)
            console.log(`ID: ${article.id}`)
            console.log(`Excerpt length: ${article.excerpt?.length || 0} characters`)
            console.log(`Excerpt: ${article.excerpt || '(null)'}`)
            console.log()
        })

        // Look for the specific articles from screenshots
        console.log('='.repeat(70))
        console.log('\n3. Checking specific articles from screenshots...\n')

        const greyNuns = articles.find(a => a.title.toLowerCase().includes('grey nuns') || a.title.toLowerCase().includes('hospital'))
        if (greyNuns) {
            console.log('Grey Nuns Hospital Article:')
            console.log(`Title: ${greyNuns.title}`)
            console.log(`Excerpt: ${greyNuns.excerpt}`)
            console.log(`Excerpt length: ${greyNuns.excerpt?.length || 0}`)
            console.log()
        }

        const coronation = articles.find(a => a.title.toLowerCase().includes('coronation'))
        if (coronation) {
            console.log('Coronation Park Article:')
            console.log(`Title: coronation.title}`)
            console.log(`Excerpt: ${coronation.excerpt}`)
            console.log(`Excerpt length: ${coronation.excerpt?.length || 0}`)
            console.log()
        }

    } catch (error) {
        console.error('Error:', error.message)
    }
}

checkExcerpts()
