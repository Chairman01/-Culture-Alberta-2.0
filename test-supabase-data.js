// Test script to check what's actually in the Supabase database
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://itdmwpbsnviassgqfhxk.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0ZG13cGJzbnZpYXNzZ3FmaHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0ODU5NjUsImV4cCI6MjA2OTA2MTk2NX0.pxAXREQJrXJFZEBB3s7iwfm3rV_C383EbWCwf6ayPQo'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testSupabaseData() {
  console.log('Testing Supabase connection...')
  
  try {
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .limit(5)
    
    if (error) {
      console.error('Error:', error)
      return
    }
    
    console.log('Articles in Supabase database:')
    console.log('Count:', data?.length || 0)
    
    if (data && data.length > 0) {
      console.log('First article:')
      console.log('ID:', data[0].id)
      console.log('Title:', data[0].title)
      console.log('Content:', data[0].content?.substring(0, 100) + '...')
      console.log('Category:', data[0].category)
    }
    
  } catch (err) {
    console.error('Connection error:', err)
  }
}

testSupabaseData()
