/** @type {import('next').NextConfig} */
// Force cache clear: 2025-01-27 13:00 - REGENERATE FALLBACK WITH FULL CONTENT - DEPLOY NOW
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
    // BANDWIDTH OPTIMIZATION: Always use modern formats
    formats: ['image/avif', 'image/webp'],
    // Production image optimizations
    ...(process.env.NODE_ENV === 'production' && {
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
      {
        source: '/ads.txt',
        destination: 'https://adstxt.mediavine.com/sites/culturealberta/ads.txt',
        statusCode: 301,
      },
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
      // Article slug change: removed "Again" from Gracie Ann Gale title
      {
        source: '/articles/grande-prairie-rcmp-asking-for-help-finding-15-year-old-gracie-ann-gale-again',
        destination: '/articles/grande-prairie-rcmp-asking-for-help-finding-15-year-old-gracie-ann-gale',
        permanent: true,
      },
      // Article slug change: Alberta stat holidays 2026 renamed
      {
        source: '/articles/alberta-stat-holidays-2026-complete-list-of-dates-long-weekends-and-whats-open',
        destination: '/articles/alberta-stat-holidays-2026-full-list-dates-pay-rules-updated-may-2026',
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
      // Block access to shopping category
      {
        source: '/best-of/shopping',
        destination: '/404',
        permanent: true,
      },
      // Fix 404 errors reported in Google Search Console
      {
        source: '/terms',
        destination: '/terms-of-service',
        permanent: true,
      },
      {
        source: '/arts',
        destination: '/culture',
        permanent: true,
      },
      {
        source: '/guides',
        destination: '/articles',
        permanent: true,
      },
      // Fix additional 404s from Google Search Console
      {
        source: '/privacy',
        destination: '/privacy-policy',
        permanent: true,
      },
      {
        source: '/neighborhood',
        destination: '/articles',
        permanent: true,
      },
      {
        source: '/other-communities',
        destination: '/articles',
        permanent: true,
      },
      // REMOVED: This was causing redirect loop with the rule above
      // www.culturealberta.com should be the primary domain
    ]
  },
  async rewrites() {
    return [
      // Alternative sitemap URL that serves from API route
      {
        source: '/sitemap-api.xml',
        destination: '/api/sitemap',
      },
    ]
  },
  // Security + cache headers (applied in all environments)
  async headers() {
    const securityHeaders = [
      { key: 'X-Content-Type-Options',  value: 'nosniff' },
      { key: 'X-Frame-Options',         value: 'SAMEORIGIN' },
      { key: 'X-XSS-Protection',        value: '1; mode=block' },
      { key: 'Referrer-Policy',         value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy',      value: 'camera=(), microphone=(), geolocation=(), payment=()' },
      // HSTS: trust HTTPS for 1 year, include subdomains
      { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
      // Force all ad content to load over HTTPS (Mediavine requirement)
      { key: 'Content-Security-Policy', value: 'block-all-mixed-content' },
    ]

    if (process.env.NODE_ENV === 'production') {
      return [
        {
          source: '/(.*)',
          headers: securityHeaders,
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
        // BANDWIDTH OPTIMIZATION: Cache pages for CDN with revalidation window
        {
          source: '/((?!api|_next/static|_next/image|favicon.ico).*)',
          headers: [
            {
              key: 'Cache-Control',
              value: 'public, s-maxage=3600, stale-while-revalidate=86400',
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
