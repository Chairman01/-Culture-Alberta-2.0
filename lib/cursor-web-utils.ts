/**
 * Cursor Web Development Utilities
 * 
 * This file demonstrates how Cursor web features can enhance your development workflow
 * with intelligent code generation, type safety, and pattern recognition.
 */

// Type definitions for better Cursor web assistance
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
  timestamp: string
}

export interface PaginationParams {
  page?: number
  limit?: number
  offset?: number
}

export interface FilterParams {
  category?: string
  location?: string
  status?: string
  featured?: boolean
  trending?: boolean
}

// Generic API response handler using Cursor web's pattern recognition
export function createApiResponse<T>(
  success: boolean,
  data?: T,
  error?: string,
  message?: string
): ApiResponse<T> {
  return {
    success,
    data,
    error,
    message,
    timestamp: new Date().toISOString()
  }
}

// Error handling utility that Cursor web can suggest and auto-complete
export function handleApiError(error: unknown, context: string): ApiResponse {
  console.error(`❌ ${context}:`, error)
  
  const errorMessage = error instanceof Error 
    ? error.message 
    : 'An unknown error occurred'
  
  return createApiResponse(false, undefined, errorMessage, `Failed to ${context}`)
}

// Database query builder that leverages Cursor web's understanding of your patterns
export function buildEventQuery(filters: FilterParams = {}) {
  const query: any = {}
  
  if (filters.category) {
    query.category = filters.category
  }
  
  if (filters.location) {
    query.location = filters.location
  }
  
  if (filters.status) {
    query.status = filters.status
  }
  
  if (filters.featured !== undefined) {
    query.featured_home = filters.featured
  }
  
  if (filters.trending !== undefined) {
    query.trending_home = filters.trending
  }
  
  return query
}

// Validation utility that Cursor web can enhance with your specific requirements
export function validateEventData(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (!data.title || data.title.trim().length === 0) {
    errors.push('Title is required')
  }
  
  if (!data.description || data.description.trim().length === 0) {
    errors.push('Description is required')
  }
  
  if (!data.event_date) {
    errors.push('Event date is required')
  }
  
  if (data.event_date && new Date(data.event_date) < new Date()) {
    errors.push('Event date cannot be in the past')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

// Cache management utility that Cursor web can optimize based on your patterns
export function generateCacheKey(prefix: string, params: Record<string, any> = {}): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}:${params[key]}`)
    .join('|')
  
  return `${prefix}:${sortedParams}`
}

// Type-safe environment variable access
export function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key]
  
  if (!value && !defaultValue) {
    throw new Error(`Environment variable ${key} is required but not set`)
  }
  
  return value || defaultValue!
}

// Cursor web can suggest improvements and optimizations for these utilities
export const CURSOR_WEB_FEATURES = {
  // Intelligent code completion
  AUTO_COMPLETE: 'Context-aware suggestions based on your codebase',
  
  // Pattern recognition
  PATTERN_RECOGNITION: 'Suggests improvements based on existing code patterns',
  
  // Type safety
  TYPE_SAFETY: 'Enhanced TypeScript support with better error detection',
  
  // Code generation
  CODE_GENERATION: 'Generate boilerplate code and common patterns',
  
  // Refactoring
  REFACTORING: 'Smart refactoring suggestions and automated improvements',
  
  // Documentation
  DOCUMENTATION: 'Auto-generate documentation and comments'
} as const
