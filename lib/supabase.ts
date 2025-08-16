import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Supabase configuration - using environment variables with fallback
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://itdmwpbznviaszgqfxhk.supabase.co'
const supabaseAnonKey = process.env.EXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0ZG13cGJzbnZpYXNzZ3FmaHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0ODU5NjUsImV4cCI6MjA2OTA2MTk2NX0.pxAXREQJrXJFZEBB3s7iwfm3rV_C383EbWCwf6ayPQo'

// Debug environment variables (only in development)
if (process.env.NODE_ENV === 'development') {
  console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set from env' : 'Using fallback')
  console.log('Supabase Key (NEXT_PUBLIC):', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set from env' : 'Not set')
  console.log('Supabase Key (EXT_PUBLIC):', process.env.EXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set from env' : 'Not set')
}

// Create the Supabase client with minimal configuration
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
})