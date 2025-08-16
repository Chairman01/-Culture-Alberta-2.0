// Re-export from the fetch-based client file
export { supabase } from './supabase-fetch'
export type { SupabaseClient } from '@supabase/supabase-js'

// Debug function
export const debugSupabaseConfig = () => {
  if (typeof window !== 'undefined') {
    console.log('Using custom fetch-based Supabase client')
    console.log('Supabase URL: https://itdmwpbznviaszgqfxhk.supabase.co')
    console.log('Testing custom fetch approach to avoid Headers error...')
  }
}