#!/usr/bin/env node

/**
 * Fix the Witch Perfect event image URL in Supabase
 * Replace the base64 data with the proper Supabase Storage URL
 */

import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://itdmwpbsnviassgqfhxk.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0ZG13cGJzbnZpYXNzZ3FmaHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0ODU5NjUsImV4cCI6MjA2OTA2MTk2NX0.pxAXREQJrXJFZEBB3s7iwfm3rV_C383EbWCwf6ayPQo'

const EVENT_ID = 'event-1762024663804-nigd19ju1'
const CORRECT_IMAGE_URL = 'https://itdmwpbsnviassgqfhxk.supabase.co/storage/v1/object/public/Article-image/article-1766381118030-k6y4y6.jpg'

async function fixEvent() {
    try {
        console.log('Fixing Witch Perfect event image URL...\n')

        // First, check the current state
        console.log('Step 1: Checking current event data...')
        const checkResponse = await fetch(`${SUPABASE_URL}/rest/v1/events?id=eq.${EVENT_ID}&select=id,title,image_url`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            }
        })

        if (!checkResponse.ok) {
            throw new Error(`Failed to fetch event: ${checkResponse.status} ${checkResponse.statusText}`)
        }

        const events = await checkResponse.json()
        if (events.length === 0) {
            throw new Error('Event not found!')
        }

        const currentEvent = events[0]
        console.log(`  Current title: ${currentEvent.title}`)
        console.log(`  Current image_url starts with: ${currentEvent.image_url?.substring(0, 50)}...`)
        console.log(`  Is base64: ${currentEvent.image_url?.startsWith('data:image') || false}\n`)

        // Update the event
        console.log('Step 2: Updating event with correct image URL...')
        const updateResponse = await fetch(`${SUPABASE_URL}/rest/v1/events?id=eq.${EVENT_ID}`, {
            method: 'PATCH',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({
                image_url: CORRECT_IMAGE_URL
            })
        })

        if (!updateResponse.ok) {
            const errorText = await updateResponse.text()
            throw new Error(`Failed to update event: ${updateResponse.status} ${updateResponse.statusText}\n${errorText}`)
        }

        const updatedEvents = await updateResponse.json()
        console.log('  ✅ Update successful!\n')

        // Verify the update
        console.log('Step 3: Verifying the update...')
        const verifyResponse = await fetch(`${SUPABASE_URL}/rest/v1/events?id=eq.${EVENT_ID}&select=id,title,image_url`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            }
        })

        const verifiedEvents = await verifyResponse.json()
        const verifiedEvent = verifiedEvents[0]

        console.log(`  Updated title: ${verifiedEvent.title}`)
        console.log(`  Updated image_url: ${verifiedEvent.image_url}`)
        console.log(`  Is base64: ${verifiedEvent.image_url?.startsWith('data:image') || false}`)
        console.log(`  Is Storage URL: ${verifiedEvent.image_url?.includes('supabase.co/storage') || false}\n`)

        if (verifiedEvent.image_url === CORRECT_IMAGE_URL) {
            console.log('🎉 SUCCESS! Event image URL has been fixed!')
            console.log('\nNext step: Run the sync script to update optimized-fallback.json:')
            console.log('  node scripts/sync-optimized-fallback.js')
        } else {
            console.log('⚠️ WARNING: Update may not have worked as expected')
        }

    } catch (error) {
        console.error('❌ Error:', error.message)
        process.exit(1)
    }
}

fixEvent()
