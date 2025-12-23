import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs/promises'
import * as path from 'path'
import { fileURLToPath } from 'url'

// ES module path handling
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Supabase configuration
const supabaseUrl = 'https://itdmwpbsnviassgqfhxk.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0ZG13cGJzbnZpYXNzZ3FmaHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0ODU5NjUsImV4cCI6MjA2OTA2MTk2NX0.pxAXREQJrXJFZEBB3s7iwfm3rV_C383EbWCwf6ayPQo'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Configuration
const DRY_RUN = process.argv.includes('--dry-run')
const TEST_MODE = process.argv.includes('--test') // Only migrate first 5 articles
const BACKUP_FILE = path.join(__dirname, `image-migration-backup-${Date.now()}.json`)

interface Article {
    id: string
    title: string
    image_url: string | null
}

interface BackupRecord {
    id: string
    title: string
    old_image_url: string
    new_image_url?: string
    error?: string
    migrated_at?: string
}

/**
 * Check if a string is a base64 image data URL
 */
function isBase64Image(url: string | null): boolean {
    if (!url) return false
    return url.startsWith('data:image/') ||
        (url.length > 1000 && !url.includes('http') && !url.includes('supabase'))
}

/**
 * Convert base64 data URL to Buffer
 */
function base64ToBuffer(dataUrl: string): { buffer: Buffer; mimeType: string } {
    let base64Data: string
    let mimeType = 'image/jpeg' // Default

    if (dataUrl.startsWith('data:image/')) {
        // Extract mime type and base64 data
        const matches = dataUrl.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/)
        if (matches) {
            mimeType = `image/${matches[1]}`
            base64Data = matches[2]
        } else {
            throw new Error('Invalid data URL format')
        }
    } else {
        // Raw base64 string
        base64Data = dataUrl
    }

    const buffer = Buffer.from(base64Data, 'base64')
    return { buffer, mimeType }
}

/**
 * Upload image buffer to Supabase Storage
 */
async function uploadToStorage(
    buffer: Buffer,
    articleId: string,
    mimeType: string
): Promise<string> {
    // Determine file extension from mime type
    const extension = mimeType.split('/')[1] || 'jpg'
    const fileName = `${articleId}-${Date.now()}.${extension}`
    const filePath = `article-images/${fileName}`

    console.log(`  📤 Uploading to storage: ${filePath}`)

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
        .from('images') // Make sure this bucket exists!
        .upload(filePath, buffer, {
            contentType: mimeType,
            cacheControl: '31536000', // 1 year cache
            upsert: false, // Don't overwrite existing files
        })

    if (error) {
        throw new Error(`Storage upload failed: ${error.message}`)
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
        .from('images')
        .getPublicUrl(filePath)

    console.log(`  ✅ Uploaded successfully: ${publicUrlData.publicUrl}`)
    return publicUrlData.publicUrl
}

/**
 * Update article with new image URL
 */
async function updateArticle(articleId: string, newImageUrl: string): Promise<void> {
    const { error } = await supabase
        .from('articles')
        .update({ image_url: newImageUrl })
        .eq('id', articleId)

    if (error) {
        throw new Error(`Database update failed: ${error.message}`)
    }
}

/**
 * Save backup to JSON file
 */
async function saveBackup(backupRecords: BackupRecord[]): Promise<void> {
    await fs.writeFile(BACKUP_FILE, JSON.stringify(backupRecords, null, 2))
    console.log(`\n💾 Backup saved to: ${BACKUP_FILE}`)
}

/**
 * Main migration function
 */
async function migrate() {
    console.log('🚀 Starting Image Migration to Supabase Storage')
    console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no changes)' : TEST_MODE ? 'TEST (first 5 articles)' : 'FULL MIGRATION'}`)
    console.log(`Backup file: ${BACKUP_FILE}\n`)

    // Step 1: Query articles with base64 images
    console.log('📊 Step 1: Querying articles with base64 images...')
    const { data: articles, error: queryError } = await supabase
        .from('articles')
        .select('id, title, image_url')
        .not('image_url', 'is', null)
        .order('created_at', { ascending: false })

    if (queryError) {
        throw new Error(`Failed to query articles: ${queryError.message}`)
    }

    // Filter for base64 images
    const base64Articles = (articles || []).filter((article: Article) =>
        isBase64Image(article.image_url)
    )

    console.log(`Found ${base64Articles.length} articles with base64 images\n`)

    if (base64Articles.length === 0) {
        console.log('✨ No articles need migration!')
        return
    }

    // Apply test mode limit
    const articlesToMigrate = TEST_MODE ? base64Articles.slice(0, 5) : base64Articles
    console.log(`Will migrate ${articlesToMigrate.length} articles\n`)

    // Step 2: Migrate each article
    const backupRecords: BackupRecord[] = []
    let successCount = 0
    let errorCount = 0

    for (let i = 0; i < articlesToMigrate.length; i++) {
        const article = articlesToMigrate[i]
        const progress = `[${i + 1}/${articlesToMigrate.length}]`

        console.log(`${progress} Processing: "${article.title}" (${article.id})`)

        const backupRecord: BackupRecord = {
            id: article.id,
            title: article.title,
            old_image_url: article.image_url!.substring(0, 100) + '...', // Truncate for readability
        }

        try {
            if (DRY_RUN) {
                console.log('  🔍 DRY RUN: Would migrate this image')
                backupRecord.new_image_url = '[DRY RUN - not uploaded]'
            } else {
                // Convert base64 to buffer
                const { buffer, mimeType } = base64ToBuffer(article.image_url!)
                console.log(`  📝 Image size: ${(buffer.length / 1024).toFixed(2)} KB, Type: ${mimeType}`)

                // Upload to storage
                const newImageUrl = await uploadToStorage(buffer, article.id, mimeType)

                // Update database
                await updateArticle(article.id, newImageUrl)

                backupRecord.new_image_url = newImageUrl
                backupRecord.migrated_at = new Date().toISOString()
                successCount++

                console.log(`  ✅ Migration complete!\n`)
            }
        } catch (error) {
            errorCount++
            const errorMessage = error instanceof Error ? error.message : String(error)
            console.log(`  ❌ Error: ${errorMessage}\n`)
            backupRecord.error = errorMessage
        }

        backupRecords.push(backupRecord)

        // Small delay to avoid rate limiting
        if (!DRY_RUN && i < articlesToMigrate.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500))
        }
    }

    // Step 3: Save backup
    await saveBackup(backupRecords)

    // Step 4: Summary
    console.log('\n' + '='.repeat(60))
    console.log('📊 Migration Summary')
    console.log('='.repeat(60))
    console.log(`Total articles processed: ${articlesToMigrate.length}`)
    if (!DRY_RUN) {
        console.log(`✅ Successfully migrated: ${successCount}`)
        console.log(`❌ Failed: ${errorCount}`)
    }
    console.log(`💾 Backup saved to: ${BACKUP_FILE}`)
    console.log('='.repeat(60))

    if (DRY_RUN) {
        console.log('\n💡 This was a DRY RUN. No changes were made.')
        console.log('Run without --dry-run to perform the actual migration.')
    } else if (TEST_MODE) {
        console.log('\n💡 This was a TEST run (5 articles only).')
        console.log('Run without --test to migrate all articles.')
    } else {
        console.log('\n✨ Migration complete!')
        console.log('Check your Vercel analytics in 24-48 hours to see bandwidth reduction.')
    }
}

// Run migration
migrate().catch((error) => {
    console.error('\n❌ Fatal error:', error)
    process.exit(1)
})
