import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Supabase configuration - using hardcoded values since env vars are being truncated
const supabaseUrl = 'https://itdmwpbznviaszgqfxhk.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0ZG13cGJzbnZpYXNzZ3FmaHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0ODU5NjUsImV4cCI6MjA2OTA2MTk2NX0.pxAXREQJrXJFZEBB3s7iwfm3rV_C383EbWCwf6ayPQo'

// Create the Supabase client
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey)