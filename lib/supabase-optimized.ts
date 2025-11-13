/**
 * Optimized Supabase Configuration
 * 
 * This file provides optimized Supabase settings to prevent timeout errors
 * and ensure new articles appear immediately.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://itdmwpbsnviassgqfhxk.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0ZG13cGJzbnZpYXNzZ3FmaHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0ODU5NjUsImV4cCI6MjA2OTA2MTk2NX0.pxAXREQJrXJFZEBB3s7iwfm3rV_C383EbWCwf6ayPQo'

// Optimized Supabase client with better timeout handling
export const optimizedSupabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'X-Client-Info': 'culture-alberta-optimized',
    },
  },
  realtime: {
    params: {
      eventsPerSecond: 1,
    },
  },
})

// Optimized query function with better error handling
export async function optimizedQuery<T>(
  table: string,
  select: string = '*',
  filters: Record<string, any> = {},
  orderBy: { column: string; ascending?: boolean } = { column: 'created_at', ascending: false },
  limit: number = 50
): Promise<{ data: T[] | null; error: any }> {
  try {
    console.log(`🔍 Optimized query: ${table} with select: ${select}`)
    
    let query = optimizedSupabase
      .from(table)
      .select(select)
      .order(orderBy.column, { ascending: orderBy.ascending ?? false })
      .limit(limit)
    
    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          query = query.in(key, value)
        } else {
          query = query.eq(key, value)
        }
      }
    })
    
    // Use a reasonable timeout
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Query timeout')), 15000) // 15 seconds
    )
    
    const result = await Promise.race([
      query,
      timeoutPromise
    ]) as any
    
    return result
    
  } catch (error) {
    console.error(`❌ Optimized query failed for ${table}:`, error)
    return { data: null, error }
  }
}

// Quick article fetch for admin
export async function getQuickArticles() {
  try {
    const { data, error } = await optimizedQuery(
      'articles',
      'id, title, excerpt, category, categories, created_at, updated_at, status, type, author',
      { status: 'published' },
      { column: 'created_at', ascending: false },
      100
    )
    
    if (error) {
      console.error('Quick articles query failed:', error)
      return []
    }
    
    return data || []
  } catch (error) {
    console.error('Quick articles fetch failed:', error)
    return []
  }
}

// Quick event fetch
export async function getQuickEvents() {
  try {
    const { data, error } = await optimizedQuery(
      'events',
      'id, title, excerpt, category, location, event_date, status, type, author',
      { status: 'published' },
      { column: 'event_date', ascending: true },
      50
    )
    
    if (error) {
      console.error('Quick events query failed:', error)
      return []
    }
    
    return data || []
  } catch (error) {
    console.error('Quick events fetch failed:', error)
    return []
  }
}
