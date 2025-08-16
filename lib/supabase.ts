// Re-export from the environment-based client file
export { supabase } from './supabase-env'
export type { SupabaseClient } from '@supabase/supabase-js'

// Debug function
export const debugSupabaseConfig = () => {
  if (typeof window !== 'undefined') {
    console.log('Using environment-based Supabase client')
    console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.EXT_PUBLIC_SUPABASE_URL || 'https://itdmwpbznviaszgqfxhk.supabase.co')
    console.log('Environment variables available:', {
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      EXT_PUBLIC_SUPABASE_URL: !!process.env.EXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      EXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.EXT_PUBLIC_SUPABASE_ANON_KEY,
    })
  }
}