// Script to export all data from current Supabase project
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const supabaseUrl = 'https://itdmwpbsnviassgqfhxk.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0ZG13cGJzbnZpYXNzZ3FmaHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0ODU5NjUsImV4cCI6MjA2OTA2MTk2NX0.pxAXREQJrXJFZEBB3s7iwfm3rV_C383EbWCwf6ayPQo'

const supabase = createClient(supabaseUrl, supabaseKey)

async function exportAllData() {
  try {
    console.log('🔄 Starting data export...')
    
    // Export articles
    console.log('📰 Exporting articles...')
    const { data: articles, error: articlesError } = await supabase
      .from('articles')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (articlesError) {
      console.error('❌ Error exporting articles:', articlesError)
    } else {
      fs.writeFileSync('exported-articles.json', JSON.stringify(articles, null, 2))
      console.log(`✅ Exported ${articles.length} articles`)
    }
    
    // Export analytics_page_views
    console.log('📊 Exporting analytics_page_views...')
    const { data: pageViews, error: pageViewsError } = await supabase
      .from('analytics_page_views')
      .select('*')
    
    if (pageViewsError) {
      console.error('❌ Error exporting page views:', pageViewsError)
    } else {
      fs.writeFileSync('exported-page-views.json', JSON.stringify(pageViews, null, 2))
      console.log(`✅ Exported ${pageViews.length} page views`)
    }
    
    // Export analytics_events
    console.log('📈 Exporting analytics_events...')
    const { data: events, error: eventsError } = await supabase
      .from('analytics_events')
      .select('*')
    
    if (eventsError) {
      console.error('❌ Error exporting events:', eventsError)
    } else {
      fs.writeFileSync('exported-events.json', JSON.stringify(events, null, 2))
      console.log(`✅ Exported ${events.length} events`)
    }
    
    // Export analytics_content_views
    console.log('📄 Exporting analytics_content_views...')
    const { data: contentViews, error: contentViewsError } = await supabase
      .from('analytics_content_views')
      .select('*')
    
    if (contentViewsError) {
      console.error('❌ Error exporting content views:', contentViewsError)
    } else {
      fs.writeFileSync('exported-content-views.json', JSON.stringify(contentViews, null, 2))
      console.log(`✅ Exported ${contentViews.length} content views`)
    }
    
    // Create summary
    const summary = {
      exportDate: new Date().toISOString(),
      articles: articles?.length || 0,
      pageViews: pageViews?.length || 0,
      events: events?.length || 0,
      contentViews: contentViews?.length || 0,
      totalRecords: (articles?.length || 0) + (pageViews?.length || 0) + (events?.length || 0) + (contentViews?.length || 0)
    }
    
    fs.writeFileSync('export-summary.json', JSON.stringify(summary, null, 2))
    console.log('\n📋 Export Summary:')
    console.log(`- Articles: ${summary.articles}`)
    console.log(`- Page Views: ${summary.pageViews}`)
    console.log(`- Events: ${summary.events}`)
    console.log(`- Content Views: ${summary.contentViews}`)
    console.log(`- Total Records: ${summary.totalRecords}`)
    
    console.log('\n✅ Data export completed successfully!')
    console.log('📁 Files created:')
    console.log('- exported-articles.json')
    console.log('- exported-page-views.json')
    console.log('- exported-events.json')
    console.log('- exported-content-views.json')
    console.log('- export-summary.json')
    
  } catch (error) {
    console.error('❌ Export failed:', error)
  }
}

exportAllData()
