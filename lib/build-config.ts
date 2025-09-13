// Build-time configuration to handle different environments
export const isBuildTime = () => {
  // Only use file system during local build process, not in production runtime
  return process.env.NODE_ENV === 'production' && !process.env.VERCEL
}

export const isVercelBuild = () => {
  return process.env.VERCEL === '1'
}

export const shouldUseFileSystem = () => {
  // Always use file system for faster loading in both development and production
  // The articles.json file is built during deployment and should be the primary source
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
