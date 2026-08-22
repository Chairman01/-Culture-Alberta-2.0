import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const ANON_FALLBACK =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0ZG13cGJzbnZpYXNzZ3FmaHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0ODU5NjUsImV4cCI6MjA2OTA2MTk2NX0.pxAXREQJrXJFZEBB3s7iwfm3rV_C383EbWCwf6ayPQo'

// Warn once per process, not once per call — this runs on every request.
let warnedAboutFallback = false

/**
 * Server-only Supabase client that uses the service-role key when available
 * (production) and falls back to the anon key otherwise. Use for trusted
 * server routes that need to bypass RLS (admin reads, moderation, writes that
 * span private tables). Never import into client components.
 *
 * The fallback used to be silent, which was its own trap. Every table these
 * routes write is now closed to anon, so without the service-role key the
 * client still constructs and every write fails at the database with a message
 * about missing policies -- pointing at the permissions rather than at the
 * missing key, which is the one thing actually wrong. Saying so here turns a
 * confusing failure into an obvious one.
 */
export function getServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://itdmwpbsnviassgqfhxk.supabase.co'
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!serviceKey && !warnedAboutFallback) {
    warnedAboutFallback = true
    console.warn(
      '[supabase] SUPABASE_SERVICE_ROLE_KEY is not set — falling back to the anon key. ' +
        'Writes to articles, comments, events, uploads and the newsletter will be refused by RLS. ' +
        'Set it in the environment; this is not a database permissions problem.',
    )
  }

  const key = serviceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ANON_FALLBACK

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}
