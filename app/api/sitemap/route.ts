import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAllEvents } from '@/lib/events'
import { getArticleUrl, getEventUrl } from '@/lib/utils/article-url'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
    try {
        const baseUrl = 'https://www.culturealberta.com'

        // Fetch articles from Supabase
        let articles: any[] = []
        try {
            const { data, error } = await supabase
                .from('articles')
                .select('id, title, created_at, updated_at, status, type, category, categories')
                .eq('status', 'published')
                .order('created_at', { ascending: false })

            if (!error && data) {
                articles = data
            }
        } catch (err) {
            console.error('API Sitemap: Error fetching articles:', err)
        }

        // Fetch events
        let events: any[] = []
        try {
            events = await getAllEvents()
        } catch (err) {
            console.error('API Sitemap: Error fetching events:', err)
        }

        // Static pages
        const staticPages = [
            { url: baseUrl, priority: '1', changefreq: 'daily' },
            { url: `${baseUrl}/articles`, priority: '0.8', changefreq: 'daily' },
            { url: `${baseUrl}/events`, priority: '0.9', changefreq: 'daily' },
            { url: `${baseUrl}/best-of`, priority: '0.8', changefreq: 'weekly' },
            { url: `${baseUrl}/calgary`, priority: '0.9', changefreq: 'weekly' },
            { url: `${baseUrl}/edmonton`, priority: '0.9', changefreq: 'weekly' },
            { url: `${baseUrl}/culture`, priority: '0.8', changefreq: 'weekly' },
            { url: `${baseUrl}/arts`, priority: '0.8', changefreq: 'weekly' },
            { url: `${baseUrl}/food-drink`, priority: '0.8', changefreq: 'weekly' },
            { url: `${baseUrl}/about`, priority: '0.6', changefreq: 'monthly' },
            { url: `${baseUrl}/contact`, priority: '0.6', changefreq: 'monthly' },
            { url: `${baseUrl}/privacy-policy`, priority: '0.5', changefreq: 'monthly' },
            { url: `${baseUrl}/terms-of-service`, priority: '0.5', changefreq: 'monthly' },
            { url: `${baseUrl}/partner`, priority: '0.6', changefreq: 'monthly' },
            { url: `${baseUrl}/careers`, priority: '0.6', changefreq: 'monthly' },
        ]

        const now = new Date().toISOString()

        // Build XML
        let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`

        // Add static pages
        for (const page of staticPages) {
            xml += `<url>
<loc>${page.url}</loc>
<lastmod>${now}</lastmod>
<changefreq>${page.changefreq}</changefreq>
<priority>${page.priority}</priority>
</url>
`
        }

        // Add articles
        for (const article of articles) {
            const url = `${baseUrl}${getArticleUrl(article)}`
            const lastmod = new Date(article.updated_at || article.created_at || new Date()).toISOString()
            xml += `<url>
<loc>${url}</loc>
<lastmod>${lastmod}</lastmod>
<changefreq>weekly</changefreq>
<priority>0.8</priority>
</url>
`
        }

        // Add events
        for (const event of events) {
            const url = `${baseUrl}${getEventUrl(event)}`
            const lastmod = new Date(event.updated_at || event.created_at || new Date()).toISOString()
            xml += `<url>
<loc>${url}</loc>
<lastmod>${lastmod}</lastmod>
<changefreq>daily</changefreq>
<priority>0.7</priority>
</url>
`
        }

        xml += `</urlset>`

        return new NextResponse(xml, {
            status: 200,
            headers: {
                'Content-Type': 'application/xml',
                'Cache-Control': 'public, max-age=3600, s-maxage=3600',
                'X-Robots-Tag': 'noindex', // Don't index the API route itself
            },
        })
    } catch (error) {
        console.error('API Sitemap error:', error)
        // Return a minimal valid sitemap on error
        const fallbackXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url>
<loc>https://www.culturealberta.com</loc>
<lastmod>${new Date().toISOString()}</lastmod>
<changefreq>daily</changefreq>
<priority>1</priority>
</url>
</urlset>`

        return new NextResponse(fallbackXml, {
            status: 200,
            headers: {
                'Content-Type': 'application/xml',
            },
        })
    }
}
