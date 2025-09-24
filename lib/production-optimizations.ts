// Production-specific optimizations for Culture Alberta
// This file contains optimizations that are only applied in production

export const isProduction = () => {
  return process.env.NODE_ENV === 'production'
}

export const isVercelProduction = () => {
  return process.env.VERCEL === '1' && process.env.VERCEL_ENV === 'production'
}

// SPEED OPTIMIZED: Production cache settings for maximum performance
export const getProductionCacheSettings = () => {
  if (isProduction()) {
    return {
      // SPEED OPTIMIZATION: Much longer cache duration for maximum speed
      cacheDuration: 60 * 60 * 1000, // 1 hour in production
      // SPEED OPTIMIZATION: Shorter timeout for faster fallback
      timeoutDuration: 2000, // 2 seconds in production
      // Enable more aggressive caching
      enableAggressiveCaching: true,
      // Enable request deduplication
      enableRequestDeduplication: true,
    }
  }
  
  return {
    cacheDuration: 10 * 60 * 1000, // 10 minutes in development
    timeoutDuration: 5000, // 5 seconds in development
    enableAggressiveCaching: false,
    enableRequestDeduplication: false,
  }
}

// Production-optimized Supabase settings
export const getProductionSupabaseSettings = () => {
  if (isProduction()) {
    return {
      // Disable realtime in production for better performance
      realtime: {
        enabled: false,
        eventsPerSecond: 5,
      },
      // Optimize connection settings
      connection: {
        poolSize: 10,
        maxConnections: 20,
      },
      // Enable query optimization
      queryOptimization: {
        enableIndexing: true,
        enableQueryCaching: true,
      }
    }
  }
  
  return {
    realtime: {
      enabled: true,
      eventsPerSecond: 10,
    },
    connection: {
      poolSize: 5,
      maxConnections: 10,
    },
    queryOptimization: {
      enableIndexing: false,
      enableQueryCaching: false,
    }
  }
}

// Production-specific error handling
export const handleProductionError = (error: any, context: string) => {
  if (isProduction()) {
    // In production, log errors but don't expose sensitive information
    console.error(`Production Error in ${context}:`, {
      message: error.message || 'Unknown error',
      code: error.code || 'NO_CODE',
      timestamp: new Date().toISOString(),
    })
    
    // Return user-friendly error messages
    return {
      message: 'Something went wrong. Please try again.',
      code: 'PRODUCTION_ERROR',
      retryable: true,
    }
  }
  
  // In development, return full error details
  return {
    message: error.message || 'Unknown error',
    code: error.code || 'NO_CODE',
    fullError: error,
    retryable: false,
  }
}

// Production-specific performance monitoring
export const trackProductionPerformance = (operation: string, duration: number) => {
  if (isProduction() && duration > 1000) { // Log slow operations (>1s)
    console.warn(`Slow operation detected: ${operation} took ${duration}ms`)
  }
}

// Production-specific database query optimization
export const optimizeQueryForProduction = (query: string, params: any) => {
  if (isProduction()) {
    // Add production-specific query optimizations
    return {
      query: query,
      params: params,
      timeout: 2000, // 2 second timeout in production
      retries: 1, // Only 1 retry in production
      cache: true, // Enable query caching
    }
  }
  
  return {
    query: query,
    params: params,
    timeout: 5000, // 5 second timeout in development
    retries: 3, // 3 retries in development
    cache: false, // Disable caching in development
  }
}
