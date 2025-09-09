/**
 * Script to generate slugs for existing articles that don't have them
 * Run this with: node scripts/generate-slugs.js
 */

import { createClient } from '@supabase/supabase-js'
import { createSlug, generateUniqueSlug } from '../lib/utils/slug.js'

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://itdmwpbsnviassgqfhxk.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key'

if (!supabaseKey || supabaseKey === 'your-anon-key') {
  console.error('❌ Please set NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function generateSlugsForArticles() {
  try {
    console.log('🔄 Fetching articles without slugs...')
    
    // Get all articles that don't have slugs
    const { data: articles, error: fetchError } = await supabase
      .from('articles')
      .select('id, title, slug')
      .is('slug', null)
    
    if (fetchError) {
      console.error('❌ Error fetching articles:', fetchError)
      return
    }
    
    if (!articles || articles.length === 0) {
      console.log('✅ All articles already have slugs!')
      return
    }
    
    console.log(`📝 Found ${articles.length} articles without slugs`)
    
    // Get all existing slugs to avoid duplicates
    const { data: allArticles, error: allError } = await supabase
      .from('articles')
      .select('slug')
      .not('slug', 'is', null)
    
    if (allError) {
      console.error('❌ Error fetching existing slugs:', allError)
      return
    }
    
    const existingSlugs = allArticles.map(a => a.slug).filter(Boolean)
    console.log(`📋 Found ${existingSlugs.length} existing slugs`)
    
    // Generate slugs for articles without them
    const updates = []
    
    for (const article of articles) {
      const baseSlug = createSlug(article.title)
      const uniqueSlug = generateUniqueSlug(baseSlug, existingSlugs)
      
      updates.push({
        id: article.id,
        slug: uniqueSlug
      })
      
      // Add to existing slugs to avoid duplicates in this batch
      existingSlugs.push(uniqueSlug)
      
      console.log(`📄 "${article.title}" → "${uniqueSlug}"`)
    }
    
    // Update articles with new slugs
    console.log('🔄 Updating articles with slugs...')
    
    for (const update of updates) {
      const { error: updateError } = await supabase
        .from('articles')
        .update({ slug: update.slug })
        .eq('id', update.id)
      
      if (updateError) {
        console.error(`❌ Error updating article ${update.id}:`, updateError)
      } else {
        console.log(`✅ Updated article ${update.id} with slug: ${update.slug}`)
      }
    }
    
    console.log('🎉 Slug generation completed!')
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

// Run the script
generateSlugsForArticles()
