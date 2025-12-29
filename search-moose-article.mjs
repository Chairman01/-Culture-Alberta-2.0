#!/usr/bin/env node

/**
 * Search for the Alberta moose article in Supabase
 */

import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://itdmwpbsnviassgqfhxk.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0ZG13cGJzbnZpYXNzZ3FmaHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0ODU5NjUsImV4cCI6MjA2OTA2MTk2NX0.pxAXREQJrXJFZEBB3s7iwfm3rV_C383EbWCwf6ayPQo'

async function searchArticle() {
    try {
        console.log('🔍 Searching for Alberta moose article in Supabase...\n')

        // Search articles with title containing "moose" or "alberta"
        const response = await fetch(`${SUPABASE_URL}/rest/v1/articles?select=id,title,created_at,status&or=(title.ilike.%moose%,title.ilike.%alberta%)&order=created_at.desc`, {
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
        console.log(`Found ${articles.length} articles matching "moose" or "alberta":\n`)

        articles.forEach((article, idx) => {
            console.log(`${idx + 1}. ${article.title}`)
            console.log(`   ID: ${article.id}`)
            console.log(`   Created: ${article.created_at}`)
            console.log(`   Status: ${article.status}`)
            console.log()
        })

        // Check for the specific problematic slug
        const problematicSlug = 'alberta-moose-the-moosetheirding-closure-and-tsarino-teaches-artis'
        console.log(`\nChecking if any article matches the problematic slug: "${problematicSlug}"\n`)

        const matchingArticle = articles.find(article => {
            const slug = article.title
                .toLowerCase()
                .replace(/[^a-z0-9\\s-]/g, '')
                .replace(/\\s+/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '')

            return slug.includes('moose') && slug.includes('alberta')
        })

        if (matchingArticle) {
            console.log('✅ Found matching article:')
            console.log(`   Title: ${matchingArticle.title}`)
            console.log(`   ID: ${matchingArticle.id}`)
            console.log(`   Status: ${matchingArticle.status}`)
        } else {
            console.log('❌ No exact match found')
            console.log('This article might have been deleted or the URL is malformed')
        }

    } catch (error) {
        console.error('❌ Error:', error.message)
    }
}

searchArticle()
