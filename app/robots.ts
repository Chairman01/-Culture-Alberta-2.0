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
      ],
    },
    sitemap: 'https://www.culturealberta.com/sitemap.xml',
  }
}
