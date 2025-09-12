// Build-time configuration to handle different environments
export const isBuildTime = () => {
  // Only use file system during local build process, not in production runtime
  return process.env.NODE_ENV === 'production' && !process.env.VERCEL
}

export const isVercelBuild = () => {
  return process.env.VERCEL === '1'
}

export const shouldUseFileSystem = () => {
  // Use file system only during local build time, not in production runtime
  // Always use Supabase in both development and production runtime
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
