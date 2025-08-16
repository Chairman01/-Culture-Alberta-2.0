// Custom Supabase client using fetch directly
const supabaseUrl = 'https://itdmwpbznviaszgqfxhk.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0ZG13cGJzbnZpYXNzZ3FmaHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0ODU5NjUsImV4cCI6MjA2OTA2MTk2NX0.pxAXREQJrXJFZEBB3s7iwfm3rV_C383EbWCwf6ayPQo'

// Simple fetch-based client
export const supabase = {
  from: (table: string) => ({
    select: (columns: string = '*') => ({
      async then(resolve: Function, reject: Function) {
        try {
          const response = await fetch(`${supabaseUrl}/rest/v1/${table}?select=${columns}`, {
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
            }
          })
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }
          
          const data = await response.json()
          resolve({ data, error: null })
        } catch (error) {
          resolve({ data: null, error })
        }
      }
    })
  })
}
