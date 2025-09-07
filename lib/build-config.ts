// Build-time configuration to handle different environments
export const isBuildTime = () => {
  return process.env.NODE_ENV === 'production' && !process.env.VERCEL_ENV
}

export const isVercelBuild = () => {
  return process.env.VERCEL === '1'
}

export const shouldUseFileSystem = () => {
  // Use file system during build or when Supabase is not available
  return isBuildTime() || isVercelBuild() || !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NODE_ENV === 'production'
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
