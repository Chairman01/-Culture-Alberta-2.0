// Re-export from the simple client file
export { supabase } from './supabase-simple'
export type { SupabaseClient } from '@supabase/supabase-js'

// Debug function
export const debugSupabaseConfig = () => {
  if (typeof window !== 'undefined') {
    console.log('Using simple Supabase client (no configuration)')
    console.log('Supabase URL: https://itdmwpbznviaszgqfxhk.supabase.co')
    console.log('Testing simple client approach...')
  }
}