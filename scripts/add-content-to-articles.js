// Script to help add content to articles that are missing content
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://itdmwpbsnviassgqfhxk.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0ZG13cGJzbnZpYXNzZ3FmaHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0ODU5NjUsImV4cCI6MjA2OTA2MTk2NX0.pxAXREQJrXJFZEBB3s7iwfm3rV_C383EbWCwf6ayPQo'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkArticlesWithoutContent() {
  console.log('🔍 Checking for articles without content...')
  
  try {
    // Get all articles
    const { data: articles, error } = await supabase
      .from('articles')
      .select('id, title, content, excerpt, category, location')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('❌ Error fetching articles:', error)
      return
    }
    
    console.log(`📊 Total articles: ${articles?.length || 0}`)
    
    // Find articles without content
    const articlesWithoutContent = articles?.filter(article => 
      !article.content || article.content.trim() === ''
    ) || []
    
    console.log(`⚠️  Articles without content: ${articlesWithoutContent.length}`)
    
    if (articlesWithoutContent.length > 0) {
      console.log('\n📝 Articles that need content:')
      articlesWithoutContent.forEach((article, index) => {
        console.log(`${index + 1}. "${article.title}" (${article.category || 'No category'})`)
        console.log(`   ID: ${article.id}`)
        console.log(`   Excerpt: ${article.excerpt ? article.excerpt.substring(0, 100) + '...' : 'No excerpt'}`)
        console.log('')
      })
      
      console.log('\n💡 To fix these articles:')
      console.log('1. Go to your admin panel: /admin/articles')
      console.log('2. Edit each article and add proper content')
      console.log('3. Or use the updateArticle function to add content programmatically')
      
      // Example of how to add content to an article
      console.log('\n🔧 Example: Adding content to an article')
      if (articlesWithoutContent.length > 0) {
        const firstArticle = articlesWithoutContent[0]
        console.log(`Example for article: "${firstArticle.title}"`)
        console.log(`
// Example content you could add:
const sampleContent = \`
<p>This is a sample article about ${firstArticle.category || 'Alberta culture'}.</p>

<h2>Introduction</h2>
<p>Welcome to our comprehensive guide about ${firstArticle.title.toLowerCase()}.</p>

<h2>Key Points</h2>
<ul>
  <li>Point 1: Important information</li>
  <li>Point 2: More details</li>
  <li>Point 3: Additional insights</li>
</ul>

<h2>Conclusion</h2>
<p>In conclusion, this article provides valuable insights into ${firstArticle.category || 'Alberta culture'}.</p>
\`

// To update the article:
await supabase
  .from('articles')
  .update({ content: sampleContent })
  .eq('id', '${firstArticle.id}')
        `)
      }
    } else {
      console.log('✅ All articles have content!')
    }
    
  } catch (err) {
    console.error('❌ Connection error:', err)
  }
}

// Function to add sample content to articles without content
async function addSampleContentToArticles() {
  console.log('🔧 Adding sample content to articles without content...')
  
  try {
    // Get articles without content
    const { data: articles, error } = await supabase
      .from('articles')
      .select('id, title, content, excerpt, category, location')
      .or('content.is.null,content.eq.')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('❌ Error fetching articles:', error)
      return
    }
    
    if (!articles || articles.length === 0) {
      console.log('✅ No articles need content!')
      return
    }
    
    console.log(`📝 Found ${articles.length} articles without content`)
    
    for (const article of articles) {
      const sampleContent = generateSampleContent(article)
      
      console.log(`📝 Adding content to: "${article.title}"`)
      
      const { error: updateError } = await supabase
        .from('articles')
        .update({ 
          content: sampleContent,
          updated_at: new Date().toISOString()
        })
        .eq('id', article.id)
      
      if (updateError) {
        console.error(`❌ Error updating article "${article.title}":`, updateError)
      } else {
        console.log(`✅ Successfully added content to: "${article.title}"`)
      }
    }
    
    console.log('🎉 Finished adding sample content to articles!')
    
  } catch (err) {
    console.error('❌ Error:', err)
  }
}

function generateSampleContent(article) {
  const category = article.category || 'Alberta Culture'
  const location = article.location || 'Alberta'
  const title = article.title
  
  return `
<p>Welcome to our comprehensive guide about ${title} in ${location}. This article explores the rich cultural landscape and provides valuable insights for residents and visitors alike.</p>

<h2>Overview</h2>
<p>${location} is home to a vibrant cultural scene, and ${title} represents an important aspect of our community. Whether you're a local resident or planning a visit, this guide will help you discover the best that ${location} has to offer.</p>

<h2>Key Highlights</h2>
<ul>
  <li><strong>Cultural Significance:</strong> Understanding the importance of ${title} in ${location}'s cultural landscape</li>
  <li><strong>Local Insights:</strong> Expert recommendations and insider tips</li>
  <li><strong>Practical Information:</strong> Everything you need to know to make the most of your experience</li>
</ul>

<h2>What Makes This Special</h2>
<p>${location} offers unique opportunities to experience ${title} in an authentic and meaningful way. The local community has worked hard to preserve and promote these cultural treasures, making them accessible to everyone.</p>

<h2>Getting Started</h2>
<p>Whether you're new to ${location} or a long-time resident, there's always something new to discover. We recommend starting with the basics and gradually exploring more specialized aspects of ${title}.</p>

<h2>Conclusion</h2>
<p>${title} in ${location} represents the best of what our community has to offer. We hope this guide helps you discover and appreciate the rich cultural heritage that makes ${location} such a special place to live and visit.</p>

<p><em>For more information about ${category} in ${location}, be sure to check out our other articles and resources.</em></p>
  `.trim()
}

// Main execution
async function main() {
  const args = process.argv.slice(2)
  
  if (args.includes('--add-content')) {
    await addSampleContentToArticles()
  } else {
    await checkArticlesWithoutContent()
  }
}

main().catch(console.error)
