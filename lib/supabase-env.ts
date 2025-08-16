import { createClient } from '@supabase/supabase-js'

// Environment-based Supabase client
const getSupabaseConfig = () => {
  // Try to get from environment variables first
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 
              process.env.EXT_PUBLIC_SUPABASE_URL ||
              'https://itdmwpbznviaszgqfxhk.supabase.co'
  
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
              process.env.EXT_PUBLIC_SUPABASE_ANON_KEY ||
              'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0ZG13cGJzbnZpYXNzZ3FmaHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0ODU5NjUsImV4cCI6MjA2OTA2MTk2NX0.pxAXREQJrXJFZEBB3s7iwfm3rV_C383EbWCwf6ayPQo'
  
  return { url, key }
}

const { url, key } = getSupabaseConfig()

// Create client with no additional configuration
export const supabase = createClient(url, key)
