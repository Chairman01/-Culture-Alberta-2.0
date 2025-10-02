// Vercel resource optimization utilities
// This file helps reduce resource usage to stay within Vercel's free tier limits

export const isVercelProduction = () => {
  return process.env.VERCEL === '1' && process.env.VERCEL_ENV === 'production'
}

// Optimize image loading to reduce Fast Origin Transfer
export const optimizeImageLoading = () => {
  if (isVercelProduction()) {
    return {
      // Use much smaller image sizes in production to reduce bandwidth
      maxWidth: 600,
      maxHeight: 400,
      quality: 60, // Further reduce quality to save bandwidth
      // Enable aggressive caching
      cacheControl: 'public, max-age=31536000, immutable',
      // Use most efficient formats
      formats: ['image/avif', 'image/webp'],
      // Add lazy loading by default
      loading: 'lazy',
    }
  }
  
  return {
    maxWidth: 1200,
    maxHeight: 800,
    quality: 90,
    cacheControl: 'public, max-age=3600',
    formats: ['image/webp'],
    loading: 'eager',
  }
}

// Optimize data fetching to reduce ISR reads
export const optimizeDataFetching = () => {
  if (isVercelProduction()) {
    return {
      // Reduce cache duration to minimize ISR reads
      cacheDuration: 5 * 60 * 1000, // 5 minutes (increased for better caching)
      // Use static generation where possible
      useStaticGeneration: true,
      // Reduce data transfer significantly
      limitResults: 12, // Limit to 12 items per page (reduced from 20)
      // Enable compression
      enableCompression: true,
      // Add stale-while-revalidate for better performance
      staleWhileRevalidate: 60 * 60 * 1000, // 1 hour
    }
  }
  
  return {
    cacheDuration: 10 * 60 * 1000, // 10 minutes
    useStaticGeneration: false,
    limitResults: 50,
    enableCompression: false,
    staleWhileRevalidate: 0,
  }
}

// Optimize function invocations
export const optimizeFunctionUsage = () => {
  if (isVercelProduction()) {
    return {
      // Reduce function execution time
      maxExecutionTime: 5000, // 5 seconds
      // Use edge functions where possible
      useEdgeFunctions: true,
      // Minimize memory usage
      maxMemoryUsage: 128, // 128MB
      // Enable function caching
      enableFunctionCaching: true,
    }
  }
  
  return {
    maxExecutionTime: 10000, // 10 seconds
    useEdgeFunctions: false,
    maxMemoryUsage: 256, // 256MB
    enableFunctionCaching: false,
  }
}

// Resource usage monitoring
export const trackResourceUsage = (operation: string, startTime: number) => {
  if (isVercelProduction()) {
    const duration = Date.now() - startTime
    const memoryUsage = process.memoryUsage()
    
    // Log slow operations
    if (duration > 2000) {
      console.warn(`Slow operation: ${operation} took ${duration}ms`)
    }
    
    // Log high memory usage
    if (memoryUsage.heapUsed > 100 * 1024 * 1024) { // 100MB
      console.warn(`High memory usage: ${operation} used ${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`)
    }
    
    return {
      duration,
      memoryUsage: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      operation,
    }
  }
  
  return null
}

// Optimize bundle size
export const optimizeBundleSize = () => {
  if (isVercelProduction()) {
    return {
      // Enable tree shaking
      enableTreeShaking: true,
      // Minimize CSS
      minimizeCSS: true,
      // Optimize imports
      optimizeImports: true,
      // Remove unused code
      removeUnusedCode: true,
    }
  }
  
  return {
    enableTreeShaking: false,
    minimizeCSS: false,
    optimizeImports: false,
    removeUnusedCode: false,
  }
}

// Reduce Speed Insights data collection to stay within limits
export const optimizeSpeedInsights = () => {
  if (isVercelProduction()) {
    return {
      // Reduce data collection frequency
      sampleRate: 0.1, // Only collect 10% of data points
      // Limit to essential metrics only
      collectCoreWebVitals: true,
      collectNavigation: false, // Disable navigation tracking
      collectResourceTiming: false, // Disable resource timing
      collectLongTasks: false, // Disable long task tracking
      // Batch data collection
      batchSize: 5, // Send data in batches of 5
      batchTimeout: 30000, // Wait 30 seconds before sending batch
    }
  }
  
  return {
    sampleRate: 1.0, // Full data collection in development
    collectCoreWebVitals: true,
    collectNavigation: true,
    collectResourceTiming: true,
    collectLongTasks: true,
    batchSize: 1,
    batchTimeout: 0,
  }
}
