#!/usr/bin/env node

/**
 * Check all events in Supabase
 */

import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://itdmwpbsnviassgqfhxk.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0ZG13cGJzbnZpYXNzZ3FmaHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0ODU5NjUsImV4cCI6MjA2OTA2MTk2NX0.pxAXREQJrXJFZEBB3s7iwfm3rV_C383EbWCwf6ayPQo'

async function checkEvents() {
    try {
        console.log('Checking all events in Supabase...\n')

        const response = await fetch(`${SUPABASE_URL}/rest/v1/events?select=*`, {
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

        console.log(`Total events found: ${events.length}\n`)

        events.forEach(event => {
            console.log(`Title: ${event.title}`)
            console.log(`ID: ${event.id}`)
            console.log(`Status: ${event.status}`)
            console.log(`image_url: ${event.image_url || '(empty)'}`)
            console.log(`Created: ${event.created_at}`)
            console.log('---')
        })

    } catch (error) {
        console.error('Error:', error.message)
    }
}

checkEvents()
