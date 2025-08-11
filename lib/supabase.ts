import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Supabase configuration - using environment variables with fallback
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://itdmwpbsnviassgqfhxk.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_1dTeZ_JIZ2sOWXveqFBb0g_tTFPrml-'

// Create the Supabase client
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey)