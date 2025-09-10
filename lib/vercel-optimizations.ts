// Vercel resource optimization utilities
// This file helps reduce resource usage to stay within Vercel's free tier limits

export const isVercelProduction = () => {
  return process.env.VERCEL === '1' && process.env.VERCEL_ENV === 'production'
}

// Optimize image loading to reduce Fast Origin Transfer
export const optimizeImageLoading = () => {
  if (isVercelProduction()) {
    return {
      // Use smaller image sizes in production
      maxWidth: 800,
      maxHeight: 600,
      quality: 75, // Reduce quality to save bandwidth
      // Enable aggressive caching
      cacheControl: 'public, max-age=31536000, immutable',
      // Use WebP format
      formats: ['image/webp', 'image/avif'],
    }
  }
  
  return {
    maxWidth: 1200,
    maxHeight: 800,
    quality: 90,
    cacheControl: 'public, max-age=3600',
    formats: ['image/webp'],
  }
}

// Optimize data fetching to reduce ISR reads
export const optimizeDataFetching = () => {
  if (isVercelProduction()) {
    return {
      // Reduce cache duration to minimize ISR reads
      cacheDuration: 2 * 60 * 1000, // 2 minutes
      // Use static generation where possible
      useStaticGeneration: true,
      // Reduce data transfer
      limitResults: 20, // Limit to 20 items per page
      // Enable compression
      enableCompression: true,
    }
  }
  
  return {
    cacheDuration: 10 * 60 * 1000, // 10 minutes
    useStaticGeneration: false,
    limitResults: 50,
    enableCompression: false,
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
