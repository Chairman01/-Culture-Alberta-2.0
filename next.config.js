/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Production optimizations
  ...(process.env.NODE_ENV === 'production' && {
    // Enable compression in production
    compress: true,
    // Optimize bundle
    experimental: {
      optimizeCss: true,
      optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
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
      minimumCacheTTL: 31536000, // 1 year
      dangerouslyAllowSVG: true,
      contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
      deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
      imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
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
        {
          source: '/articles/(.*)',
          headers: [
            {
              key: 'Cache-Control',
              value: 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
            },
          ],
        },
        {
          source: '/_next/static/(.*)',
          headers: [
            {
              key: 'Cache-Control',
              value: 'public, max-age=31536000, immutable',
            },
          ],
        },
        {
          source: '/images/(.*)',
          headers: [
            {
              key: 'Cache-Control',
              value: 'public, max-age=31536000, immutable',
            },
          ],
        },
      ]
    }
    return []
  },
}

export default nextConfig 