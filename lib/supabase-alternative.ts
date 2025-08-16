import { createClient } from '@supabase/supabase-js'

// Alternative Supabase client approach
const supabaseUrl = 'https://itdmwpbznviaszgqfxhk.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0ZG13cGJzbnZpYXNzZ3FmaHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0ODU5NjUsImV4cCI6MjA2OTA2MTk2NX0.pxAXREQJrXJFZEBB3s7iwfm3rV_C383EbWCwf6ayPQo'

// Create client with minimal configuration
const client = createClient(supabaseUrl, supabaseKey)

// Export with error handling
export const supabase = {
  ...client,
  from: (table: string) => {
    try {
      return client.from(table)
    } catch (error) {
      console.error('Supabase client error:', error)
      throw error
    }
  }
}
