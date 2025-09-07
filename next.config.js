/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  async redirects() {
    return [
      // Redirect old article URLs to new format
      {
        source: '/articles/:id/:slug',
        destination: '/articles/:id',
        permanent: true,
      },
      // Redirect common misspellings
      {
        source: '/calagry',
        destination: '/calgary',
        permanent: true,
      },
      // Redirect old admin paths
      {
        source: '/admin/posts',
        destination: '/admin/articles',
        permanent: true,
      },
    ]
  },
  async rewrites() {
    return []
  }
}

export default nextConfig 