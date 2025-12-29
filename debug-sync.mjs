#!/usr/bin/env node

/**
 * Debug sync - with extra logging to see what's happening
 */

import { promises as fs } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://itdmwpbsnviassgqfhxk.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0ZG13cGJzbnZpYXNzZ3FmaHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0ODU5NjUsImV4cCI6MjA2OTA2MTk2NX0.pxAXREQJrXJFZEBB3s7iwfm3rV_C383EbWCwf6ayPQo'

async function debugSync() {
    try {
        console.log('🔍 DEBUG SYNC - Checking what events are being transformed...\n')

        // Fetch events from Supabase
        const eventsResponse = await fetch(`${SUPABASE_URL}/rest/v1/events?select=*&order=created_at.desc&limit=20`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            }
        })

        const events = await eventsResponse.json()
        console.log(`Fetched ${events.length} events from Supabase\n`)

        console.log('Raw event data:')
        events.forEach((event, idx) => {
            console.log(`\n--- Event ${idx + 1} ---`)
            console.log(`ID: ${event.id}`)
            console.log(`Title: ${event.title}`)
            console.log(`image_url: ${event.image_url?.substring(0, 80)}${event.image_url?.length > 80 ? '...' : ''}`)
            console.log(`Starts with data:image: ${event.image_url?.startsWith('data:image') || false}`)
        })

        console.log('\n' + '='.repeat(70))
        console.log('Transforming events...\n')

        const transformedEvents = events.map(event => {
            const imageUrl = (event.image_url && !event.image_url.startsWith('data:image'))
                ? event.image_url
                : ''

            console.log(`Transform: ${event.title}`)
            console.log(`  Original image_url: ${event.image_url?.substring(0, 60)}...`)
            console.log(`  Is base64: ${event.image_url?.startsWith('data:image') || false}`)
            console.log(`  Filtered imageUrl: ${imageUrl || '(empty)'}`)
            console.log()

            return {
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
                imageUrl: imageUrl,
                date: event.event_date || event.created_at,
                createdAt: event.created_at,
                updatedAt: event.updated_at,
                event_date: event.event_date,
                event_end_date: event.event_end_date,
                organizer: event.organizer,
                trendingHome: event.featured_home || false,
                trendingEdmonton: event.featured_edmonton || false,
                trendingCalgary: event.featured_calgary || false,
                featuredHome: event.featured_home || false,
                featuredEdmonton: event.featured_edmonton || false,
                featuredCalgary: event.featured_calgary || false
            }
        })

        console.log('='.repeat(70))
        console.log(`\n✅ Transformed ${transformedEvents.length} events`)
        console.log('\nEvents with images:')
        transformedEvents.forEach(event => {
            if (event.imageUrl) {
                console.log(`  ✓ ${event.title}: ${event.imageUrl}`)
            } else {
                console.log(`  ✗ ${event.title}: (no image)`)
            }
        })

    } catch (error) {
        console.error('❌ Error:', error.message)
    }
}

debugSync()
