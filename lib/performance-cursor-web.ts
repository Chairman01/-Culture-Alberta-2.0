/**
 * Performance Optimizations with Cursor Web Features
 * 
 * This file demonstrates how Cursor web can help optimize your Next.js application
 * with intelligent caching, lazy loading, and performance monitoring.
 */

import { useMemo, useCallback, useEffect, useState } from 'react'
import { createApiResponse, type ApiResponse } from './cursor-web-utils'

// Types for performance monitoring
interface PerformanceMetrics {
  loadTime: number
  renderTime: number
  memoryUsage: number
  cacheHitRate: number
}

interface CacheConfig {
  ttl: number // Time to live in milliseconds
  maxSize: number // Maximum number of items
  strategy: 'lru' | 'fifo' | 'ttl'
}

// LRU Cache implementation that Cursor web can optimize
class LRUCache<T> {
  private cache = new Map<string, { value: T; timestamp: number }>()
  private maxSize: number
  private ttl: number

  constructor(maxSize: number = 100, ttl: number = 5 * 60 * 1000) {
    this.maxSize = maxSize
    this.ttl = ttl
  }

  get(key: string): T | null {
    const item = this.cache.get(key)
    
    if (!item) return null
    
    // Check if item has expired
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key)
      return null
    }
    
    // Move to end (most recently used)
    this.cache.delete(key)
    this.cache.set(key, item)
    
    return item.value
  }

  set(key: string, value: T): void {
    // Remove oldest items if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      if (firstKey !== undefined) {
        this.cache.delete(firstKey)
      }
    }
    
    this.cache.set(key, { value, timestamp: Date.now() })
  }

  clear(): void {
    this.cache.clear()
  }

  size(): number {
    return this.cache.size
  }
}

// Global cache instances
const apiCache = new LRUCache<ApiResponse<any>>(50, 5 * 60 * 1000) // 5 minutes
const componentCache = new LRUCache<React.ReactNode>(20, 10 * 60 * 1000) // 10 minutes

// Performance monitoring hook
export function usePerformanceMonitor(componentName: string) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    loadTime: 0,
    renderTime: 0,
    memoryUsage: 0,
    cacheHitRate: 0
  })

  useEffect(() => {
    const startTime = performance.now()
    
    // Monitor memory usage
    const updateMemoryUsage = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory
        setMetrics(prev => ({
          ...prev,
          memoryUsage: memory.usedJSHeapSize / 1024 / 1024 // MB
        }))
      }
    }

    const interval = setInterval(updateMemoryUsage, 1000)
    
    // Calculate load time
    const endTime = performance.now()
    setMetrics(prev => ({
      ...prev,
      loadTime: endTime - startTime
    }))

    return () => {
      clearInterval(interval)
    }
  }, [componentName])

  return metrics
}

// Debounced API call hook with caching
export function useDebouncedApi<T>(
  apiCall: () => Promise<ApiResponse<T>>,
  delay: number = 300,
  cacheKey?: string
) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const execute = useCallback(async () => {
    // Check cache first
    if (cacheKey) {
      const cached = apiCache.get(cacheKey)
      if (cached) {
        setData(cached.data || null)
        setError(cached.error || null)
        return
      }
    }

    setLoading(true)
    setError(null)

    try {
      const response = await apiCall()
      
      if (response.success) {
        setData(response.data || null)
        
        // Cache successful responses
        if (cacheKey) {
          apiCache.set(cacheKey, response)
        }
      } else {
        setError(response.error || 'API call failed')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [apiCall, cacheKey])

  // Debounce the execution
  useEffect(() => {
    const timer = setTimeout(execute, delay)
    return () => clearTimeout(timer)
  }, [execute, delay])

  return { data, loading, error, execute }
}

// Image optimization hook
export function useOptimizedImage(
  src: string,
  options: {
    width?: number
    height?: number
    quality?: number
    priority?: boolean
  } = {}
) {
  const [imageState, setImageState] = useState<{
    src: string
    loading: boolean
    error: boolean
  }>({
    src: '',
    loading: true,
    error: false
  })

  const optimizedSrc = useMemo(() => {
    if (!src) return ''
    
    // Add Next.js image optimization parameters
    const params = new URLSearchParams()
    if (options.width) params.set('w', options.width.toString())
    if (options.height) params.set('h', options.height.toString())
    if (options.quality) params.set('q', options.quality.toString())
    
    const queryString = params.toString()
    return queryString ? `${src}?${queryString}` : src
  }, [src, options])

  useEffect(() => {
    if (!optimizedSrc) return

    setImageState({ src: optimizedSrc, loading: true, error: false })

    const img = new Image()
    
    img.onload = () => {
      setImageState({ src: optimizedSrc, loading: false, error: false })
    }
    
    img.onerror = () => {
      setImageState({ src: '', loading: false, error: true })
    }
    
    img.src = optimizedSrc
  }, [optimizedSrc])

  return imageState
}

// Lazy loading hook for components
export function useLazyComponent<T extends React.ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  fallback?: React.ReactNode
) {
  const [Component, setComponent] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    importFunc()
      .then((module) => {
        setComponent(() => module.default)
        setLoading(false)
      })
      .catch((err) => {
        setError(err)
        setLoading(false)
      })
  }, [importFunc])

  if (loading) return fallback || null
  if (error) return null
  if (!Component) return null

  return Component
}

// Virtual scrolling hook for large lists
export function useVirtualScrolling<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  overscan: number = 5
) {
  const [scrollTop, setScrollTop] = useState(0)

  const visibleRange = useMemo(() => {
    const start = Math.floor(scrollTop / itemHeight)
    const end = Math.min(
      start + Math.ceil(containerHeight / itemHeight) + overscan,
      items.length
    )
    
    return { start: Math.max(0, start - overscan), end }
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan])

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end).map((item, index) => ({
      item,
      index: visibleRange.start + index
    }))
  }, [items, visibleRange])

  const totalHeight = items.length * itemHeight
  const offsetY = visibleRange.start * itemHeight

  return {
    visibleItems,
    totalHeight,
    offsetY,
    setScrollTop
  }
}

// Bundle analyzer hook (for development)
export function useBundleAnalyzer() {
  const [bundleSize, setBundleSize] = useState<number | null>(null)

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // This would integrate with webpack-bundle-analyzer
      // For now, we'll just log the current bundle info
      console.log('Bundle analysis available in development mode')
    }
  }, [])

  return { bundleSize }
}

// Cache management utilities
export const CacheManager = {
  // Clear all caches
  clearAll: () => {
    apiCache.clear()
    componentCache.clear()
  },
  
  // Clear specific cache
  clearApiCache: () => apiCache.clear(),
  clearComponentCache: () => componentCache.clear(),
  
  // Get cache statistics
  getStats: () => ({
    apiCacheSize: apiCache.size(),
    componentCacheSize: componentCache.size()
  }),
  
  // Preload data
  preload: async <T>(key: string, apiCall: () => Promise<ApiResponse<T>>) => {
    try {
      const response = await apiCall()
      if (response.success) {
        apiCache.set(key, response)
      }
    } catch (error) {
      console.warn('Failed to preload data:', error)
    }
  }
}

// Performance optimization constants
export const PERFORMANCE_CONFIG = {
  // Image optimization
  IMAGE_QUALITY: 80,
  IMAGE_SIZES: [640, 750, 828, 1080, 1200],
  
  // Caching
  API_CACHE_TTL: 5 * 60 * 1000, // 5 minutes
  COMPONENT_CACHE_TTL: 10 * 60 * 1000, // 10 minutes
  
  // Virtual scrolling
  DEFAULT_ITEM_HEIGHT: 200,
  OVERSCAN_COUNT: 5,
  
  // Debouncing
  SEARCH_DEBOUNCE: 300,
  API_DEBOUNCE: 500
} as const

// Export types for better Cursor web assistance
export type { PerformanceMetrics, CacheConfig }
