/**
 * Check Database for Base64 Images
 * 
 * This script checks the Supabase database for articles that still have
 * base64-encoded images and reports them for cleanup.
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://itdmwpbsnviassgqfhxk.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0ZG13cGJzbnZpYXNzZ3FmaHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0ODU5NjUsImV4cCI6MjA2OTA2MTk2NX0.pxAXREQJrXJFZEBB3s7iwfm3rV_C383EbWCwf6ayPQo'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkForBase64Images() {
    console.log('🔍 Checking database for base64-encoded images...\n')

    try {
        // Fetch all articles with their image data
        const { data: articles, error } = await supabase
            .from('articles')
            .select('id, title, image, image_url')
            .order('created_at', { ascending: false })

        if (error) {
            console.error('❌ Error fetching articles:', error.message)
            return
        }

        console.log(`✅ Found ${articles?.length || 0} total articles\n`)

        // Check for base64 images
        const base64InImage = []
        const base64InImageUrl = []
        const noImage = []
        const validUrls = []

        for (const article of articles || []) {
            // Check 'image' column for base64
            if (article.image && article.image.startsWith('data:')) {
                base64InImage.push({
                    id: article.id,
                    title: article.title,
                    imageSize: Math.round(article.image.length / 1024) + ' KB'
                })
            }

            // Check 'image_url' column for base64 (shouldn't happen with our fix)
            if (article.image_url && article.image_url.startsWith('data:')) {
                base64InImageUrl.push({
                    id: article.id,
                    title: article.title,
                    imageSize: Math.round(article.image_url.length / 1024) + ' KB'
                })
            }

            // Check for articles with no image at all
            if (!article.image && !article.image_url) {
                noImage.push({
                    id: article.id,
                    title: article.title
                })
            }

            // Check for valid URLs
            if (article.image_url && article.image_url.startsWith('http')) {
                validUrls.push({
                    id: article.id,
                    title: article.title,
                    url: article.image_url
                })
            }
        }

        // Report results
        console.log('📊 RESULTS:\n')

        console.log(`✅ Articles with valid URLs: ${validUrls.length}`)
        if (validUrls.length > 0 && validUrls.length <= 5) {
            validUrls.forEach(a => console.log(`   - ${a.title}: ${a.url.substring(0, 50)}...`))
        }
        console.log('')

        console.log(`⚠️  Base64 in 'image' column (legacy): ${base64InImage.length}`)
        if (base64InImage.length > 0) {
            base64InImage.slice(0, 10).forEach(a => console.log(`   - ${a.title} (${a.imageSize})`))
            if (base64InImage.length > 10) {
                console.log(`   ... and ${base64InImage.length - 10} more`)
            }
        }
        console.log('')

        console.log(`🚨 Base64 in 'image_url' column (SHOULD BE ZERO): ${base64InImageUrl.length}`)
        if (base64InImageUrl.length > 0) {
            base64InImageUrl.forEach(a => console.log(`   - ${a.title} (${a.imageSize})`))
        }
        console.log('')

        console.log(`❓ Articles with no image: ${noImage.length}`)
        if (noImage.length > 0 && noImage.length <= 10) {
            noImage.forEach(a => console.log(`   - ${a.title}`))
        }
        console.log('')

        // Summary
        console.log('══════════════════════════════════════════════════════')
        console.log('SUMMARY:')
        console.log(`  Total articles: ${articles?.length || 0}`)
        console.log(`  ✅ Using Supabase Storage URLs: ${validUrls.length}`)
        console.log(`  ⚠️  Using legacy base64 (will be ignored): ${base64InImage.length}`)
        console.log(`  🚨 Using base64 in image_url (BUG!): ${base64InImageUrl.length}`)
        console.log(`  ❓ No image at all: ${noImage.length}`)
        console.log('══════════════════════════════════════════════════════')
        console.log('')

        if (base64InImageUrl.length === 0) {
            console.log('✅ SUCCESS: No base64 data in image_url column!')
            console.log('   All new uploads are using Supabase Storage URLs.')
            console.log('')
        }

        if (base64InImage.length > 0) {
            console.log('ℹ️  NOTE: Legacy base64 data in "image" column is OK.')
            console.log('   The code now ignores this column and uses "image_url" instead.')
            console.log('   These articles will show placeholder images until re-uploaded.')
            console.log('')
        }

        // Estimate bandwidth savings
        if (base64InImage.length > 0) {
            const avgBase64Size = base64InImage.reduce((sum, a) => {
                return sum + parseInt(a.imageSize)
            }, 0) / base64InImage.length

            console.log('💰 ESTIMATED BANDWIDTH SAVINGS:')
            console.log(`   Average base64 image size: ${Math.round(avgBase64Size)} KB`)
            console.log(`   If all ${base64InImage.length} articles are viewed 100 times/month:`)
            console.log(`   Before: ${Math.round(avgBase64Size * base64InImage.length * 100 / 1024)} MB/month`)
            console.log(`   After: ~${Math.round(avgBase64Size * base64InImage.length * 100 * 0.1 / 1024)} MB/month (90% reduction with WebP/AVIF)`)
            console.log('')
        }

    } catch (error) {
        console.error('❌ Error:', error)
    }
}

// Run the check
checkForBase64Images()
