/** @type {import('next').NextConfig} */
/**
 * Next.js Configuration for Culture Alberta
 * 
 * Performance optimizations:
 * - Compression enabled
 * - CSS optimization
 * - Package import optimization
 * - Image optimization with AVIF/WebP
 * - Aggressive caching for static assets
 * 
 * Security:
 * - Restricted image domains (no wildcard)
 * - CSP headers for SVG images
 * - Security headers in production
 */

const nextConfig = {
  reactStrictMode: true,
  
  // PERFORMANCE: Enable compression (removed duplicate)
  compress: true,
  
  // Production-specific optimizations
  ...(process.env.NODE_ENV === 'production' && {
    experimental: {
      optimizeCss: true, // Optimize CSS output
      optimizePackageImports: [
        'lucide-react', 
        '@radix-ui/react-icons'
      ], // Tree-shake unused icons
      staticGenerationRetryCount: 3, // Retry failed static generation
      memoryBasedWorkersCount: true, // Optimize worker allocation
      // PERFORMANCE: Enable edge runtime for faster responses
      serverComponentsExternalPackages: ['@supabase/supabase-js'],
    },
  }),
  
  // Image optimization configuration
  images: {
    // SECURITY: Restrict to known domains instead of wildcard
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'itdmwpbsnviassgqfhxk.supabase.co', // Supabase storage
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co', // Supabase CDN
      },
      // Add other trusted image domains here as needed
    ],
    
    // Production image optimizations
    ...(process.env.NODE_ENV === 'production' && {
      formats: ['image/avif', 'image/webp'], // AVIF for best compression
      minimumCacheTTL: 31536000, // 1 year cache
      dangerouslyAllowSVG: true,
      contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
      // Optimized device sizes for responsive images
      deviceSizes: [640, 750, 828, 1080, 1200],
      imageSizes: [16, 32, 48, 64, 96, 128, 256],
      unoptimized: false, // Always optimize images
    }),
  },
  
  // URL redirects for SEO and user experience
  async redirects() {
    return [
      // Redirect non-www to www (SEO best practice)
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
      // Redirect old article URL format
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
      // Remove trailing slashes (SEO best practice)
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
    ]
  },
  
  // URL rewrites (currently empty - add as needed)
  async rewrites() {
    return []
  },
  
  // Security and performance headers
  async headers() {
    if (process.env.NODE_ENV === 'production') {
      return [
        // Security headers for all routes
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
        // No cache for API routes (always fresh data)
        {
          source: '/api/(.*)',
          headers: [
            {
              key: 'Cache-Control',
              value: 'public, max-age=0, s-maxage=0, must-revalidate',
            },
          ],
        },
        // No cache for dynamic pages (ISR handles caching)
        {
          source: '/((?!_next/static|_next/image|favicon.ico).*)',
          headers: [
            {
              key: 'Cache-Control',
              value: 'public, max-age=0, s-maxage=0, must-revalidate',
            },
          ],
        },
        // Long cache for static assets (performance)
        {
          source: '/_next/static/(.*)',
          headers: [
            {
              key: 'Cache-Control',
              value: 'public, max-age=31536000, immutable',
            },
          ],
        },
        // Long cache for images (performance)
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
