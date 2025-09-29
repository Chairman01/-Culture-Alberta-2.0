import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { getProductionSupabaseSettings, isProduction } from './production-optimizations'

// Supabase configuration - using hardcoded values for production reliability
const supabaseUrl = 'https://itdmwpbsnviassgqfhxk.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0ZG13cGJzbnZpYXNzZ3FmaHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0ODU5NjUsImV4cCI6MjA2OTA2MTk2NX0.pxAXREQJrXJFZEBB3s7iwfm3rV_C383EbWCwf6ayPQo'

// Log configuration for debugging
console.log('🔧 Supabase Configuration:')
console.log('- URL:', supabaseUrl)
console.log('- Key:', supabaseAnonKey ? 'SET' : 'NOT SET')
console.log('- Environment:', process.env.NODE_ENV)
console.log('- Vercel:', process.env.VERCEL)

// Get production-optimized settings
const supabaseSettings = getProductionSupabaseSettings()

// Create the Supabase client with proper configuration
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // Disable session persistence for SSR
    autoRefreshToken: false, // Disable auto refresh for SSR
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'X-Client-Info': 'culture-alberta-app',
    },
  },
  realtime: {
    params: {
      eventsPerSecond: 1, // Minimal events per second
    },
  },
})