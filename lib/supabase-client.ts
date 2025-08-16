import { createClient } from '@supabase/supabase-js'

// Get environment variables with fallbacks
const getSupabaseUrl = () => {
  // Check multiple possible environment variable names
  return process.env.NEXT_PUBLIC_SUPABASE_URL || 
         process.env.EXT_PUBLIC_SUPABASE_URL ||
         'https://itdmwpbznviaszgqfxhk.supabase.co'
}

const getSupabaseKey = () => {
  // Check multiple possible environment variable names
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
         process.env.EXT_PUBLIC_SUPABASE_ANON_KEY ||
         'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0ZG13cGJzbnZpYXNzZ3FmaHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0ODU5NjUsImV4cCI6MjA2OTA2MTk2NX0.pxAXREQJrXJFZEBB3s7iwfm3rV_C383EbWCwf6ayPQo'
}

// Create Supabase client with minimal configuration
export const supabase = createClient(getSupabaseUrl(), getSupabaseKey(), {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
})

// Debug function to check environment variables
export const debugSupabaseConfig = () => {
  if (typeof window !== 'undefined') {
    console.log('Supabase URL:', getSupabaseUrl())
    console.log('Supabase Key exists:', !!getSupabaseKey())
    console.log('Environment check:', {
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      EXT_PUBLIC_SUPABASE_URL: !!process.env.EXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      EXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.EXT_PUBLIC_SUPABASE_ANON_KEY,
    })
  }
}
