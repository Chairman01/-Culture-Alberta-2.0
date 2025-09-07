// Build-time configuration to handle different environments
export const isBuildTime = () => {
  return process.env.NODE_ENV === 'production' && !process.env.VERCEL_ENV
}

export const isVercelBuild = () => {
  return process.env.VERCEL === '1'
}

export const shouldUseFileSystem = () => {
  // Use file system only during build time, not in production runtime
  // Always use Supabase in both development and production runtime
  return isBuildTime() // Only use file system during actual build process
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
