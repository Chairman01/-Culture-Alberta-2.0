#!/usr/bin/env node

/**
 * Debug what fields are being returned from Supabase for the Witch Perfect event
 */

import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://itdmwpbsnviassgqfhxk.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0ZG13cGJzbnZpYXNzZ3FmaHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0ODU5NjUsImV4cCI6MjA2OTA2MTk2NX0.pxAXREQJrXJFZEBB3s7iwfm3rV_C383EbWCwf6ayPQo'

async function debugWitchPerfect() {
    try {
        console.log('Fetching Witch Perfect event from Supabase...\n')

        const response = await fetch(`${SUPABASE_URL}/rest/v1/events?id=eq.event-1762024663804-nigd19ju1&select=*`, {
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

        console.log('Event Fields:')
        console.log('='.repeat(50))

        // Show all fields
        for (const [key, value] of Object.entries(event)) {
            if (key === 'image' && typeof value === 'string' && value.startsWith('data:image')) {
                console.log(`${key}: [BASE64 IMAGE - ${value.length} characters]`)
            } else if (typeof value === 'string' && value.length > 100) {
                console.log(`${key}: ${value.substring(0, 100)}...`)
            } else {
                console.log(`${key}: ${value}`)
            }
        }

        console.log('\n' + '='.repeat(50))
        console.log('\nImage Analysis:')
        console.log(`image_url exists: ${!!event.image_url}`)
        console.log(`image_url value: ${event.image_url || '(null)'}`)
        console.log(`image_url starts with data:image: ${event.image_url?.startsWith('data:image') || false}`)
        console.log(`image field exists: ${!!event.image}`)
        console.log(`image starts with data:image: ${event.image?.startsWith('data:image') || false}`)

    } catch (error) {
        console.error('Error:', error.message)
    }
}

debugWitchPerfect()
