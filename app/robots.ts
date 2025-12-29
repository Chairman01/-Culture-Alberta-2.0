import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin/',
        '/api/',
        // Next.js build artifacts - should never be indexed
        '/_next/static/css/*',
        '/_next/static/chunks/*',
        '/_next/static/*',
        '/_next/data/*',
        // Utility files
        '/favicon.ico',
        '/files/*.pdf',
        // Broken/edge case URLs
        '/articles/e',
        '/debug/',
        '/debug-simple/',
        // Test routes - block with and without trailing slashes
        '/test',
        '/test/',
        '/test-connection',
        '/test-connection/',
        '/test-env',
        '/test-env/',
        '/test-supabase',
        '/test-supabase/',
        '/test-supabase-connection',
        '/test-supabase-connection/',
        '/test-table',
        '/test-table/',
        '/populate',
        '/populate/',
        // Invalid/junk URLs found in Google Search Console
        '/2',
        '/3',
        // Remove specific article URLs from indexing (placeholder/test articles)
        '/articles/article-1755471413706-6x340tv5w',
        '/articles/article-1757443668525-it4u5nhfo',
        '/articles/article-1754957054981-fturxi4mi',
        '/articles/article-1755303180179-vp6mtvos2',
        '/articles/article-1755479611660-ikidiacz0',
        '/articles/article-1757236534668-edtcg186k',
        '/articles/article-1757317159902-bzajewmw0',
        '/articles/article-1754899686200-bvftipelh',
        '/articles/article-1754906674364-96gpllbq3',
        '/articles/article-1755044961288-d2jjptlq0',
        '/articles/article-1755737833735-4dpy9893u',
        '/articles/article-1755470408146-4r1ljnu1r',
        '/articles/article-1755917044327-nw8ghveg1',
        // Additional test articles from noindex report
        '/articles/article-1765775179976-8ckzfvlun',
        '/articles/article-1765435206227-z3f7y8f1e',
        '/articles/article-2',
        '/articles/article-1766002547858-dem6yogey',
        // Inactive articles that should not be indexed
        '/articles/redditors-top-romantic-edmonton-spots',
        '/articles/the-5-best-brunch-spots-in-edmonton-you-need-to-try-at-least-once',
        // Test articles to be deleted
        '/articles/afro-music-fest',
        '/articles/hello-this-is-a-tet',
        // Remove best-of pages that don't have content or have thin content
        '/best-of/shopping',
        '/best-of/dentists',
        '/best-of/accountants',
        '/best-of/restaurants',
        '/best-of/culture',
        '/best-of/attractions',
        '/best-of/lawyers',
        '/best-of/food',
      ],
    },
    sitemap: 'https://www.culturealberta.com/sitemap.xml',
  }
}
