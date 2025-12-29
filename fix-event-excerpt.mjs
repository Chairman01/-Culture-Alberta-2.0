#!/usr/bin/env node

/**
 * Fix Witch Perfect event excerpt in Supabase
 * Copy full text from description to excerpt field
 */

import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://itdmwpbsnviassgqfhxk.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0ZG13cGJzbnZpYXNzZ3FmaHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0ODU5NjUsImV4cCI6MjA2OTA2MTk2NX0.pxAXREQJrXJFZEBB3s7iwfm3rV_C383EbWCwf6ayPQo'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY

const EVENT_ID = 'event-1762024663804-nigd19ju1'

async function fixEventExcerpt() {
    try {
        console.log('🔧 Fixing Witch Perfect event excerpt in Supabase...\n')

        // First, fetch the current event to get the full description
        console.log('1. Fetching current event data...')
        const getResponse = await fetch(`${SUPABASE_URL}/rest/v1/events?id=eq.${EVENT_ID}&select=*`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            }
        })

        if (!getResponse.ok) {
            throw new Error(`Fetch failed: ${getResponse.status} ${getResponse.statusText}`)
        }

        const events = await getResponse.json()

        if (events.length === 0) {
            console.log('❌ Event not found!')
            return
        }

        const event = events[0]

        console.log(`✅ Found event: "${event.title}"`)
        console.log(`Current excerpt length: ${event.excerpt?.length || 0}`)
        console.log(`Description length: ${event.description?.length || 0}`)

        // Create a proper excerpt from the description (first ~300 chars at sentence boundary)
        let newExcerpt = event.description || event.excerpt || ''

        // For this specific event, use the full description as the excerpt
        // (It's already a good summary length ~230 chars)
        if (newExcerpt.length > 300) {
            // Find the last sentence end before 300 chars
            const truncated = newExcerpt.substring(0, 300)
            const lastPeriod = truncated.lastIndexOf('.')
            const lastExclamation = truncated.lastIndexOf('!')
            const lastQuestion = truncated.lastIndexOf('?')
            const lastSentenceEnd = Math.max(lastPeriod, lastExclamation, lastQuestion)

            if (lastSentenceEnd > 150) {
                newExcerpt = newExcerpt.substring(0, lastSentenceEnd + 1).trim()
            }
        }

        console.log(`\nNew excerpt length: ${newExcerpt.length}`)
        console.log(`New excerpt: ${newExcerpt}\n`)

        // Update the event with service role key (anon key doesn't have UPDATE permission)
        console.log('2. Updating event excerpt...')

        const authKey = SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY

        const updateResponse = await fetch(`${SUPABASE_URL}/rest/v1/events?id=eq.${EVENT_ID}`, {
            method: 'PATCH',
            headers: {
                'apikey': authKey,
                'Authorization': `Bearer ${authKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({
                excerpt: newExcerpt
            })
        })

        if (!updateResponse.ok) {
            const errorText = await updateResponse.text()
            throw new Error(`Update failed: ${updateResponse.status} ${updateResponse.statusText}\n${errorText}`)
        }

        const updated = await updateResponse.json()
        console.log('\n✅ SUCCESS! Event excerpt updated!')
        console.log(`New excerpt: "${updated[0]?.excerpt?.substring(0, 100)}..."`)
        console.log(`\nNext step: Run the sync script to update optimized-fallback.json:`)
        console.log('  node scripts/sync-optimized-fallback.js')

    } catch (error) {
        console.error('❌ Error:', error.message)
        if (error.message.includes('JWT')) {
            console.log('\n💡 Tip: You may need to use SUPABASE_SERVICE_ROLE_KEY for UPDATE permissions')
        }
    }
}

fixEventExcerpt()
