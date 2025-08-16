// Re-export from the dynamic client file
export { supabase } from './supabase-dynamic'
export type { SupabaseClient } from '@supabase/supabase-js'

// Debug function
export const debugSupabaseConfig = () => {
  if (typeof window !== 'undefined') {
    console.log('Using dynamic Supabase client with error handling')
    console.log('Supabase URL: https://itdmwpbznviaszgqfxhk.supabase.co')
    console.log('Testing dynamic client approach...')
  }
}