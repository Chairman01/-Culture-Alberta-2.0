/** @type {import('next').NextConfig} */
// Force cache clear: 2025-01-27 12:45 - FINAL TRUNCATION FIX - ALL LIMITS REMOVED - DEPLOY NOW
const nextConfig = {
  reactStrictMode: true,
  // Performance optimizations
  compress: true,
  // Production optimizations
  ...(process.env.NODE_ENV === 'production' && {
    // Enable compression in production
    compress: true,
    // Optimize bundle
    experimental: {
      optimizeCss: true,
      optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
      // Enable static optimization
      staticGenerationRetryCount: 3,
      // Optimize memory usage
      memoryBasedWorkersCount: true,
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
      formats: ['image/avif', 'image/webp'], // Prioritize AVIF for better compression
      minimumCacheTTL: 31536000, // 1 year
      dangerouslyAllowSVG: true,
      contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
      // Reduced device sizes to minimize bandwidth
      deviceSizes: [640, 750, 828, 1080, 1200],
      imageSizes: [16, 32, 48, 64, 96, 128, 256],
      // Enable aggressive caching
      unoptimized: false,
    }),
  },
  async redirects() {
    return [
      // Fix domain redirect loop - force www as primary
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'culturealberta.com',
          },
        ],
        destination: 'https://www.culturealberta.com/:path*',
        permanent: true,
      },
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
      // Redirect old event URLs
      {
        source: '/event/:slug',
        destination: '/events/:slug',
        permanent: true,
      },
      // Redirect trailing slashes to non-trailing
      {
        source: '/articles/:path*/',
        destination: '/articles/:path*',
        permanent: true,
      },
      {
        source: '/events/:path*/',
        destination: '/events/:path*',
        permanent: true,
      },
      // REMOVED: This was causing redirect loop with the rule above
      // www.culturealberta.com should be the primary domain
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
              value: 'public, max-age=0, s-maxage=0, must-revalidate',
            },
          ],
        },
        {
          source: '/((?!_next/static|_next/image|favicon.ico).*)',
          headers: [
            {
              key: 'Cache-Control',
              value: 'public, max-age=0, s-maxage=0, must-revalidate',
            },
          ],
        },
        {
          source: '/articles/(.*)',
          headers: [
            {
              key: 'Cache-Control',
              value: 'public, max-age=0, s-maxage=0, must-revalidate',
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