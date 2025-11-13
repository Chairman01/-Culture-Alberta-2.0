import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { getProductionSupabaseSettings } from './production-optimizations'

/**
 * Creates and exports a singleton Supabase client instance
 * 
 * Performance optimizations:
 * - Uses environment variables for security (no hardcoded credentials)
 * - Disables session persistence for SSR (reduces memory usage)
 * - Minimal realtime configuration (reduces connection overhead)
 * - Production-optimized settings for better performance
 * 
 * @returns {SupabaseClient} Configured Supabase client instance
 * 
 * Used in:
 * - lib/supabase-articles.ts (data fetching)
 * - lib/events.ts (event management)
 * - API routes (admin operations)
 */
function createSupabaseClient(): SupabaseClient {
  // SECURITY: Use environment variables instead of hardcoded values
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Validate required environment variables
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. ' +
      'Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
    )
  }

  // Get production-optimized settings for better performance
  const supabaseSettings = getProductionSupabaseSettings()

  // Create optimized Supabase client configuration
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false, // Disable for SSR - reduces memory and improves performance
      autoRefreshToken: false, // Disable for SSR - reduces unnecessary network calls
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
        eventsPerSecond: 1, // Minimal realtime events - reduces server load
      },
    },
  })
}

// Export singleton instance to prevent multiple client initializations
// This improves performance by reusing the same connection
export const supabase: SupabaseClient = createSupabaseClient()
