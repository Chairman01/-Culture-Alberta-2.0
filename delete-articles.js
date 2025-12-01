/**
 * Script to delete multiple articles from the database
 * Run with: node delete-articles.js
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Read env from .env.local file manually
const envPath = '.env.local'
let supabaseUrl, supabaseKey

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8')
  const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)
  const keyMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/)
  
  if (urlMatch) supabaseUrl = urlMatch[1].trim()
  if (keyMatch) supabaseKey = keyMatch[1].trim()
}

// Fallback to environment variables or hardcoded values
if (!supabaseUrl) supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://itdmwpbsnviassgqfhxk.supabase.co'
if (!supabaseKey) supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0ZG13cGJzbnZpYXNzZ3FmaHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0ODU5NjUsImV4cCI6MjA2OTA2MTk2NX0.pxAXREQJrXJFZEBB3s7iwfm3rV_C383EbWCwf6ayPQo'

const supabase = createClient(supabaseUrl, supabaseKey)

const articleIds = [
  'article-1755471413706-6x340tv5w',
  'article-1757443668525-it4u5nhfo',
  'article-1754957054981-fturxi4mi',
  'article-1755303180179-vp6mtvos2',
  'article-1755479611660-ikidiacz0',
  'article-1757236534668-edtcg186k',
  'article-1757317159902-bzajewmw0',
  'article-1754899686200-bvftipelh',
  'article-1754906674364-96gpllbq3',
  'article-1755044961288-d2jjptlq0',
  'article-1755737833735-4dpy9893u',
  'article-1755470408146-4r1ljnu1r',
  'article-1755917044327-nw8ghveg1'
]

async function deleteArticle(articleId) {
  try {
    // Delete from Supabase
    const { error } = await supabase
      .from('articles')
      .delete()
      .eq('id', articleId)

    if (error) {
      console.error(`❌ Failed to delete ${articleId}:`, error.message)
      return false
    }

    console.log(`✅ Deleted from Supabase: ${articleId}`)
    
    // Also remove from optimized fallback if it exists
    try {
      const fallbackPath = path.join(__dirname, 'optimized-fallback.json')
      if (fs.existsSync(fallbackPath)) {
        const fallbackContent = fs.readFileSync(fallbackPath, 'utf-8')
        const articles = JSON.parse(fallbackContent)
        const filteredArticles = articles.filter(article => article.id !== articleId)
        fs.writeFileSync(fallbackPath, JSON.stringify(filteredArticles, null, 2), 'utf-8')
        console.log(`✅ Removed from optimized fallback: ${articleId}`)
      }
    } catch (fallbackError) {
      console.warn(`⚠️ Could not update fallback file: ${fallbackError.message}`)
    }

    return true
  } catch (error) {
    console.error(`❌ Error deleting ${articleId}:`, error.message)
    return false
  }
}

async function deleteAllArticles() {
  console.log(`🗑️  Starting deletion of ${articleIds.length} articles...\n`)
  
  let successCount = 0
  let failCount = 0

  for (const articleId of articleIds) {
    const success = await deleteArticle(articleId)
    if (success) {
      successCount++
    } else {
      failCount++
    }
    // Small delay to avoid overwhelming the database
    await new Promise(resolve => setTimeout(resolve, 300))
  }

  console.log(`\n📊 Summary:`)
  console.log(`   ✅ Successfully deleted: ${successCount}`)
  console.log(`   ❌ Failed: ${failCount}`)
  console.log(`   📝 Total: ${articleIds.length}`)
  
  if (successCount > 0) {
    console.log(`\n💡 Note: You may need to rebuild your site or clear the cache for changes to take effect.`)
  }
}

// Run the script
deleteAllArticles().catch(console.error)

