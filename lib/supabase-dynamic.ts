import { createClient } from '@supabase/supabase-js'

// Dynamic Supabase client
const supabaseUrl = 'https://itdmwpbznviaszgqfxhk.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0ZG13cGJzbnZpYXNzZ3FmaHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0ODU5NjUsImV4cCI6MjA2OTA2MTk2NX0.pxAXREQJrXJFZEBB3s7iwfm3rV_C383EbWCwf6ayPQo'

// Create client dynamically
const createSupabaseClient = () => {
  try {
    return createClient(supabaseUrl, supabaseKey)
  } catch (error) {
    console.error('Error creating Supabase client:', error)
    return null
  }
}

export const supabase = createSupabaseClient()
