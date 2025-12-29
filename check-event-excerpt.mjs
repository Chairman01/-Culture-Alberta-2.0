#!/usr/bin/env node

/**
 * Check Witch Perfect event excerpt in Supabase
 */

import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://itdmwpbsnviassgqfhxk.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0ZG13cGJzbnZpYXNzZ3FmaHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0ODU5NjUsImV4cCI6MjA2OTA2MTk2NX0.pxAXREQJrXJFZEBB3s7iwfm3rV_C383EbWCwf6ayPQo'

const EVENT_ID = 'event-1762024663804-nigd19ju1'

async function checkEvent() {
    try {
        console.log('🔍 Checking Witch Perfect event in Supabase...\n')

        const response = await fetch(`${SUPABASE_URL}/rest/v1/events?id=eq.${EVENT_ID}&select=id,title,excerpt,description`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            }
        })

        if (!response.ok) {
            throw new Error(`Request failed: ${response.status} ${response.statusText}`)
        }

        const events = await response.json()

        if (events.length === 0) {
            console.log('❌ Event not found!')
            return
        }

        const event = events[0]

        console.log('Event found:')
        console.log(`ID: ${event.id}`)
        console.log(`Title: ${event.title}`)
        console.log(`\nExcerpt length: ${event.excerpt?.length || 0} characters`)
        console.log(`Excerpt: ${event.excerpt || '(null)'}`)
        console.log(`\nDescription length: ${event.description?.length || 0} characters`)
        console.log(`Description: ${event.description?.substring(0, 200) || '(null)'}...`)

        if (event.excerpt && event.excerpt.length === 150) {
            console.log('\n⚠️ WARNING: Excerpt is exactly 150 characters - likely truncated in database!')
        } else if (event.excerpt && event.excerpt.endsWith('...')) {
            console.log('\n⚠️ WARNING: Excerpt ends with "..." - likely truncated!')
        } else {
            console.log('\n✅ Excerpt looks complete')
        }

    } catch (error) {
        console.error('❌ Error:', error.message)
    }
}

checkEvent()
