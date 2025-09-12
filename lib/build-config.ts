// Build-time configuration to handle different environments
export const isBuildTime = () => {
  // Only use file system during local build process, not in production runtime
  return process.env.NODE_ENV === 'production' && !process.env.VERCEL
}

export const isVercelBuild = () => {
  return process.env.VERCEL === '1'
}

export const shouldUseFileSystem = () => {
  // Always use file system in development for faster loading
  // Use file system during local build time, not in production runtime
  if (process.env.NODE_ENV === 'development') {
    return true
  }
  // Only use file system if we're in a local build environment
  return process.env.NODE_ENV === 'production' && !process.env.VERCEL && !process.env.NEXT_PUBLIC_SUPABASE_URL
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
