import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin/',
        '/api/',
        '/debug/',
        '/debug-simple/',
        '/test/',
        '/test-connection/',
        '/test-env/',
        '/test-supabase/',
        '/test-supabase-connection/',
        '/test-table/',
        '/populate/',
        '/$',
        '/&',
        '/*$*',
        '/*&*',
        // Remove specific article URLs from indexing
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
        // Remove best-of shopping page
        '/best-of/shopping',
        // Remove favicon and robots.txt from indexing
        '/favicon.ico',
        '/robots.txt',
      ],
    },
    sitemap: 'https://www.culturealberta.com/sitemap.xml',
  }
}
