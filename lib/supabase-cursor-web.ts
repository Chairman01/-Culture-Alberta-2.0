/**
 * Enhanced Supabase Integration with Cursor Web Features
 * 
 * This file demonstrates how Cursor web can help create robust, type-safe
 * database integration patterns with intelligent error handling and caching.
 */

import { supabase } from './supabase'
import { createApiResponse, type ApiResponse } from './cursor-web-utils'

// Types that Cursor web can enhance with better IntelliSense
export interface SupabaseQueryOptions {
  select?: string
  filters?: Record<string, any>
  orderBy?: { column: string; ascending?: boolean }
  limit?: number
  offset?: number
  single?: boolean
}

export interface SupabaseMutationOptions {
  onSuccess?: (data: any) => void
  onError?: (error: Error) => void
  optimisticUpdate?: boolean
}

// Generic query function that Cursor web can optimize
export async function querySupabase<T = any>(
  table: string,
  options: SupabaseQueryOptions = {}
): Promise<ApiResponse<T>> {
  try {
    console.log(`🔍 Querying ${table} with options:`, options)
    
    let query = supabase.from(table)
    
    // Apply select
    if (options.select) {
      query = query.select(options.select)
    }
    
    // Apply filters
    if (options.filters) {
      Object.entries(options.filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            query = query.in(key, value)
          } else if (typeof value === 'string' && value.includes('*')) {
            query = query.ilike(key, value.replace(/\*/g, '%'))
          } else {
            query = query.eq(key, value)
          }
        }
      })
    }
    
    // Apply ordering
    if (options.orderBy) {
      query = query.order(options.orderBy.column, { 
        ascending: options.orderBy.ascending ?? true 
      })
    }
    
    // Apply pagination
    if (options.limit) {
      query = query.limit(options.limit)
    }
    
    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1)
    }
    
    // Execute query
    const { data, error } = options.single 
      ? await query.single()
      : await query
    
    if (error) {
      console.error(`❌ Supabase query error for ${table}:`, error)
      return createApiResponse(false, undefined, error.message, `Failed to query ${table}`)
    }
    
    console.log(`✅ Successfully queried ${table}:`, data ? 'Found data' : 'No data')
    return createApiResponse(true, data, undefined, `Successfully queried ${table}`)
    
  } catch (error) {
    console.error(`❌ Unexpected error querying ${table}:`, error)
    return createApiResponse(
      false, 
      undefined, 
      error instanceof Error ? error.message : 'Unknown error',
      `Failed to query ${table}`
    )
  }
}

// Generic insert function with Cursor web optimizations
export async function insertSupabase<T = any>(
  table: string,
  data: Partial<T>,
  options: SupabaseMutationOptions = {}
): Promise<ApiResponse<T>> {
  try {
    console.log(`➕ Inserting into ${table}:`, data)
    
    const { data: result, error } = await supabase
      .from(table)
      .insert(data)
      .select()
      .single()
    
    if (error) {
      console.error(`❌ Supabase insert error for ${table}:`, error)
      const errorResponse = createApiResponse(false, undefined, error.message, `Failed to insert into ${table}`)
      options.onError?.(new Error(error.message))
      return errorResponse
    }
    
    console.log(`✅ Successfully inserted into ${table}`)
    const successResponse = createApiResponse(true, result, undefined, `Successfully inserted into ${table}`)
    options.onSuccess?.(result)
    return successResponse
    
  } catch (error) {
    console.error(`❌ Unexpected error inserting into ${table}:`, error)
    const errorResponse = createApiResponse(
      false, 
      undefined, 
      error instanceof Error ? error.message : 'Unknown error',
      `Failed to insert into ${table}`
    )
    options.onError?.(error instanceof Error ? error : new Error('Unknown error'))
    return errorResponse
  }
}

// Generic update function with intelligent conflict resolution
export async function updateSupabase<T = any>(
  table: string,
  id: string,
  data: Partial<T>,
  options: SupabaseMutationOptions = {}
): Promise<ApiResponse<T>> {
  try {
    console.log(`🔄 Updating ${table} record ${id}:`, data)
    
    // Remove undefined values for cleaner updates
    const cleanedData = Object.fromEntries(
      Object.entries(data).filter(([_, value]) => value !== undefined)
    )
    
    const { data: result, error } = await supabase
      .from(table)
      .update({
        ...cleanedData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()
    
    if (error) {
      console.error(`❌ Supabase update error for ${table}:`, error)
      const errorResponse = createApiResponse(false, undefined, error.message, `Failed to update ${table}`)
      options.onError?.(new Error(error.message))
      return errorResponse
    }
    
    console.log(`✅ Successfully updated ${table} record ${id}`)
    const successResponse = createApiResponse(true, result, undefined, `Successfully updated ${table}`)
    options.onSuccess?.(result)
    return successResponse
    
  } catch (error) {
    console.error(`❌ Unexpected error updating ${table}:`, error)
    const errorResponse = createApiResponse(
      false, 
      undefined, 
      error instanceof Error ? error.message : 'Unknown error',
      `Failed to update ${table}`
    )
    options.onError?.(error instanceof Error ? error : new Error('Unknown error'))
    return errorResponse
  }
}

// Generic delete function with soft delete support
export async function deleteSupabase<T = any>(
  table: string,
  id: string,
  softDelete: boolean = false,
  options: SupabaseMutationOptions = {}
): Promise<ApiResponse<T>> {
  try {
    console.log(`🗑️ Deleting ${table} record ${id} (soft: ${softDelete})`)
    
    let result, error
    
    if (softDelete) {
      // Soft delete by setting deleted_at timestamp
      const { data, error: updateError } = await supabase
        .from(table)
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      
      result = data
      error = updateError
    } else {
      // Hard delete
      const { data, error: deleteError } = await supabase
        .from(table)
        .delete()
        .eq('id', id)
        .select()
        .single()
      
      result = data
      error = deleteError
    }
    
    if (error) {
      console.error(`❌ Supabase delete error for ${table}:`, error)
      const errorResponse = createApiResponse(false, undefined, error.message, `Failed to delete from ${table}`)
      options.onError?.(new Error(error.message))
      return errorResponse
    }
    
    console.log(`✅ Successfully deleted ${table} record ${id}`)
    const successResponse = createApiResponse(true, result, undefined, `Successfully deleted from ${table}`)
    options.onSuccess?.(result)
    return successResponse
    
  } catch (error) {
    console.error(`❌ Unexpected error deleting from ${table}:`, error)
    const errorResponse = createApiResponse(
      false, 
      undefined, 
      error instanceof Error ? error.message : 'Unknown error',
      `Failed to delete from ${table}`
    )
    options.onError?.(error instanceof Error ? error : new Error('Unknown error'))
    return errorResponse
  }
}

// Specialized functions for your specific tables
export const EventsAPI = {
  // Get all events with filtering
  async getAll(filters: {
    category?: string
    location?: string
    status?: string
    featured?: boolean
    trending?: boolean
    limit?: number
    offset?: number
  } = {}) {
    return querySupabase('events', {
      select: '*',
      filters: {
        ...filters,
        deleted_at: null // Exclude soft-deleted records
      },
      orderBy: { column: 'event_date', ascending: true },
      limit: filters.limit,
      offset: filters.offset
    })
  },
  
  // Get event by ID
  async getById(id: string) {
    return querySupabase('events', {
      select: '*',
      filters: { id, deleted_at: null },
      single: true
    })
  },
  
  // Create new event
  async create(eventData: any) {
    return insertSupabase('events', {
      ...eventData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
  },
  
  // Update event
  async update(id: string, eventData: any) {
    return updateSupabase('events', id, eventData)
  },
  
  // Delete event (soft delete by default)
  async delete(id: string, hardDelete: boolean = false) {
    return deleteSupabase('events', id, !hardDelete)
  },
  
  // Search events
  async search(searchTerm: string, filters: any = {}) {
    return querySupabase('events', {
      select: '*',
      filters: {
        ...filters,
        deleted_at: null,
        title: `*${searchTerm}*` // ILIKE search
      },
      orderBy: { column: 'event_date', ascending: true }
    })
  }
}

export const ArticlesAPI = {
  // Get all articles with filtering
  async getAll(filters: {
    category?: string
    location?: string
    status?: string
    featured?: boolean
    trending?: boolean
    limit?: number
    offset?: number
  } = {}) {
    return querySupabase('articles', {
      select: '*',
      filters: {
        ...filters,
        deleted_at: null
      },
      orderBy: { column: 'created_at', ascending: false },
      limit: filters.limit,
      offset: filters.offset
    })
  },
  
  // Get article by ID
  async getById(id: string) {
    return querySupabase('articles', {
      select: '*',
      filters: { id, deleted_at: null },
      single: true
    })
  },
  
  // Create new article
  async create(articleData: any) {
    return insertSupabase('articles', {
      ...articleData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
  },
  
  // Update article
  async update(id: string, articleData: any) {
    return updateSupabase('articles', id, articleData)
  },
  
  // Delete article (soft delete by default)
  async delete(id: string, hardDelete: boolean = false) {
    return deleteSupabase('articles', id, !hardDelete)
  }
}

// Export types for better Cursor web assistance
export type { SupabaseQueryOptions, SupabaseMutationOptions }
