// Request deduplication utility to prevent duplicate database calls
// This helps improve performance by avoiding multiple identical requests

interface PendingRequest<T> {
  promise: Promise<T>
  timestamp: number
}

// Store for pending requests
const pendingRequests = new Map<string, PendingRequest<any>>()

// Clean up old requests (older than 30 seconds)
const cleanupOldRequests = () => {
  const now = Date.now()
  const maxAge = 30 * 1000 // 30 seconds
  
  for (const [key, request] of pendingRequests.entries()) {
    if (now - request.timestamp > maxAge) {
      pendingRequests.delete(key)
    }
  }
}

// Deduplicate requests
export function deduplicateRequest<T>(
  key: string,
  requestFn: () => Promise<T>
): Promise<T> {
  // Clean up old requests first
  cleanupOldRequests()
  
  // Check if there's already a pending request for this key
  const existingRequest = pendingRequests.get(key)
  if (existingRequest) {
    console.log(`🔄 Deduplicating request: ${key}`)
    return existingRequest.promise
  }
  
  // Create new request
  const promise = requestFn().finally(() => {
    // Remove from pending requests when done
    pendingRequests.delete(key)
  })
  
  // Store the request
  pendingRequests.set(key, {
    promise,
    timestamp: Date.now()
  })
  
  console.log(`🚀 New request: ${key}`)
  return promise
}

// Generate cache key for database queries
export function generateCacheKey(
  operation: string,
  params: Record<string, any> = {}
): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}:${params[key]}`)
    .join('|')
  
  return `${operation}:${sortedParams}`
}

// Clear all pending requests (useful for testing or manual cleanup)
export function clearAllPendingRequests(): void {
  pendingRequests.clear()
  console.log('🧹 Cleared all pending requests')
}

// Get current pending requests count (for monitoring)
export function getPendingRequestsCount(): number {
  return pendingRequests.size
}

// Get pending requests info (for debugging)
export function getPendingRequestsInfo(): Array<{ key: string; age: number }> {
  const now = Date.now()
  return Array.from(pendingRequests.entries()).map(([key, request]) => ({
    key,
    age: now - request.timestamp
  }))
}
