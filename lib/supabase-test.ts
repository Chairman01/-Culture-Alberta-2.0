// Test Supabase connection
const testSupabaseConnection = async () => {
  const supabaseUrl = 'https://itdmwpbznviaszgqfxhk.supabase.co'
  
  try {
    console.log('Testing Supabase URL:', supabaseUrl)
    
    // Test basic connectivity
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'GET',
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0ZG13cGJzbnZpYXNzZ3FmaHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0ODU5NjUsImV4cCI6MjA2OTA2MTk2NX0.pxAXREQJrXJFZEBB3s7iwfm3rV_C383EbWCwf6ayPQo',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0ZG13cGJzbnZpYXNzZ3FmaHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0ODU5NjUsImV4cCI6MjA2OTA2MTk2NX0.pxAXREQJrXJFZEBB3s7iwfm3rV_C383EbWCwf6ayPQo'
      }
    })
    
    console.log('Supabase test response status:', response.status)
    console.log('Supabase test response ok:', response.ok)
    
    if (response.ok) {
      console.log('✅ Supabase connection successful!')
    } else {
      console.log('❌ Supabase connection failed:', response.status, response.statusText)
    }
    
  } catch (error) {
    console.log('❌ Supabase connection error:', error)
  }
}

// Run test if in browser
if (typeof window !== 'undefined') {
  testSupabaseConnection()
}

export { testSupabaseConnection }
