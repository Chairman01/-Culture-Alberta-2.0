// Build-time configuration to handle different environments
export const isBuildTime = () => {
  // Only use file system during local build process, not in production runtime
  return process.env.NODE_ENV === 'production' && !process.env.VERCEL
}

export const isVercelBuild = () => {
  return process.env.VERCEL === '1'
}

export const shouldUseFileSystem = () => {
  // Use file system only for read operations during build time
  // Admin operations (create/update/delete) should always use Supabase
  return process.env.NODE_ENV === 'production' && !process.env.VERCEL && typeof window === 'undefined'
}

export const shouldUseSupabaseForAdmin = () => {
  // Admin operations should always use Supabase for write operations
  return true
}

export const getBuildEnvironment = () => {
  return {
    nodeEnv: process.env.NODE_ENV,
    vercel: process.env.VERCEL,
    vercelEnv: process.env.VERCEL_ENV,
    isBuildTime: isBuildTime(),
    isVercelBuild: isVercelBuild(),
    shouldUseFileSystem: shouldUseFileSystem()
  }
}
