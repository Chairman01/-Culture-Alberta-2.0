/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Production optimizations
  ...(process.env.NODE_ENV === 'production' && {
    // Enable compression in production
    compress: true,
    // Optimize bundle size
    swcMinify: true,
    // Enable experimental features for better performance
    experimental: {
      optimizeCss: true,
      optimizePackageImports: ['@radix-ui/react-icons', 'lucide-react'],
    },
  }),
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    // Production image optimizations
    ...(process.env.NODE_ENV === 'production' && {
      formats: ['image/webp', 'image/avif'],
      minimumCacheTTL: 60,
      dangerouslyAllowSVG: true,
      contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    }),
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
  },
  // Production-specific headers
  async headers() {
    if (process.env.NODE_ENV === 'production') {
      return [
        {
          source: '/(.*)',
          headers: [
            {
              key: 'X-Content-Type-Options',
              value: 'nosniff',
            },
            {
              key: 'X-Frame-Options',
              value: 'DENY',
            },
            {
              key: 'X-XSS-Protection',
              value: '1; mode=block',
            },
            {
              key: 'Referrer-Policy',
              value: 'origin-when-cross-origin',
            },
          ],
        },
        {
          source: '/api/(.*)',
          headers: [
            {
              key: 'Cache-Control',
              value: 'public, max-age=300, s-maxage=300',
            },
          ],
        },
      ]
    }
    return []
  },
}

export default nextConfig 