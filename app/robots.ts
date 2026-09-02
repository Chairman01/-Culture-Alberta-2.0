import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/og-image/'],
      disallow: [
        '/admin/',
        '/api/',
        // Sign-in and account pages. Every "Create a free account" link carries
        // a ?next= parameter, so one page generates a new URL for every article
        // and employer it is linked from — Bing had crawled 108 of them, all
        // canonicalising back to the same two pages. Nothing here can rank, and
        // an account page is private by definition.
        '/auth/',
        '/account/',
        // Next.js data routes - JSON API data, not content pages
        // NOTE: Do NOT block /_next/static/ - Google needs CSS/JS to render pages properly
        '/_next/data/*',
        // Utility files
        // NOTE: /favicon.ico must NOT be blocked — Bing/Yahoo/Google fetch it to
        // show the site logo next to search results; blocking it = generic globe icon
        '/files/*.pdf',
        // Broken/edge case URLs — NOTE: removed '/articles/e' (too broad, was blocking /articles/edmonton-* URLs)
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
        // Individual /articles/... URLs are deliberately NOT listed here any more.
        //
        // Until 2026-09-01 this file blocked 21 test/placeholder article URLs.
        // A robots.txt block stops the crawler fetching the page, so it can
        // never see the 404 (19 of the 21 no longer exist in the database) or
        // the 301 to the canonical slug (the other two were the raw-ID URLs of
        // live articles). Blocked, they sit in the index as URL-only entries
        // indefinitely — the "excluded" rows in Search Console. Unblocked, one
        // crawl resolves each of them. Keep dead articles out of the index by
        // deleting them (the page then 404s), not by listing them here.
        //
        // NOTE: best-of pages re-enabled for indexing — they are valuable SEO landing pages
        // Only block specific best-of pages if they are genuinely empty/thin
        // '/best-of/shopping',  // unblocked - indexable content
        // '/best-of/dentists',  // unblocked - indexable content
        // '/best-of/accountants', // unblocked
        // '/best-of/restaurants', // unblocked - high value SEO page
        // '/best-of/culture',   // unblocked
        // '/best-of/attractions', // unblocked
        // '/best-of/lawyers',   // unblocked
        // '/best-of/food',      // unblocked - high value SEO page
      ],
    },
    sitemap: [
      'https://www.culturealberta.com/sitemap.xml',
      'https://www.culturealberta.com/news-sitemap.xml',
    ],
  }
}
