import { Metadata } from 'next'
import Link from 'next/link'
import { Instagram, Youtube, Facebook } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import ArticleFeed from './ArticleFeed'

export const revalidate = 120

export const metadata: Metadata = {
  title: 'Culture Alberta — Latest Alberta News & Stories',
  description:
    'The latest news and stories from across Alberta. Breaking stories from Calgary, Edmonton, Lethbridge, Red Deer, Grande Prairie, Fort McMurray, Medicine Hat, and everywhere in between.',
  openGraph: {
    title: 'Culture Alberta — Latest Alberta News & Stories',
    description:
      'The latest news and stories from across Alberta — Calgary, Edmonton, Lethbridge, Red Deer, Grande Prairie, Fort McMurray, and Medicine Hat.',
    url: 'https://www.culturealberta.com/link-in-bio',
    siteName: 'Culture Alberta',
    type: 'website',
    locale: 'en_CA',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Culture Alberta — Latest Alberta News & Stories',
    description: 'The latest news and stories from across Alberta.',
  },
  alternates: {
    canonical: 'https://www.culturealberta.com/link-in-bio',
  },
  keywords: [
    'Alberta news',
    'Calgary news',
    'Edmonton news',
    'Alberta stories',
    'Culture Alberta',
    'Lethbridge news',
    'Grande Prairie news',
    'Fort McMurray news',
  ],
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'NewsMediaOrganization',
  name: 'Culture Alberta',
  url: 'https://www.culturealberta.com',
  sameAs: [
    'https://www.instagram.com/culturealberta._/',
    'https://www.youtube.com/@CultureAlberta_',
    'https://www.facebook.com/profile.php?id=100064044099295',
  ],
  areaServed: [
    { '@type': 'City', name: 'Calgary', containedIn: { '@type': 'State', name: 'Alberta' } },
    { '@type': 'City', name: 'Edmonton', containedIn: { '@type': 'State', name: 'Alberta' } },
    { '@type': 'City', name: 'Lethbridge', containedIn: { '@type': 'State', name: 'Alberta' } },
    { '@type': 'City', name: 'Red Deer', containedIn: { '@type': 'State', name: 'Alberta' } },
    { '@type': 'City', name: 'Grande Prairie', containedIn: { '@type': 'State', name: 'Alberta' } },
    { '@type': 'City', name: 'Fort McMurray', containedIn: { '@type': 'State', name: 'Alberta' } },
    { '@type': 'City', name: 'Medicine Hat', containedIn: { '@type': 'State', name: 'Alberta' } },
  ],
}

export default async function LinkInBioPage() {
  let articles: any[] = []
  let pinnedArticles: any[] = []

  try {
    const [allRes, pinnedRes] = await Promise.all([
      supabase
        .from('articles')
        .select('id, title, slug, image_url, category, categories, created_at, date, location, excerpt')
        .eq('status', 'published')
        .neq('type', 'event')
        .order('created_at', { ascending: false })
        .limit(1000),
      supabase
        .from('articles')
        .select('id, title, slug, image_url, category, categories, created_at, date, location, excerpt')
        .eq('status', 'published')
        .eq('pinned_link_in_bio', true)
        .neq('type', 'event')
        .order('link_in_bio_order', { ascending: true, nullsFirst: false })
        .limit(50),
    ])

    const mapArticle = (a: any) => ({
      id: a.id,
      title: a.title,
      slug: a.slug,
      imageUrl: a.image_url,
      category: a.category || (a.categories?.[0] ?? null),
      categories: a.categories,
      location: a.location,
      date: a.date || a.created_at,
      excerpt: a.excerpt,
    })

    const pinnedIds = new Set((pinnedRes.data || []).map((a: any) => a.id))
    pinnedArticles = (pinnedRes.data || []).map(mapArticle)
    articles = (allRes.data || [])
      .filter((a: any) => !pinnedIds.has(a.id))
      .map(mapArticle)
  } catch {
    articles = []
    pinnedArticles = []
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="min-h-screen bg-white">
        {/* Sticky header */}
        <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-gray-100">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
            {/* Logo */}
            <span className="text-base font-bold text-gray-900 tracking-tight mr-auto">
              Culture Alberta
            </span>

            {/* Social icons */}
            <div className="flex items-center gap-3.5">
              <a
                href="https://www.instagram.com/culturealberta._/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Follow Culture Alberta on Instagram"
                className="text-gray-400 hover:text-gray-900 transition-colors"
              >
                <Instagram size={17} strokeWidth={1.8} />
              </a>
              <a
                href="https://www.youtube.com/@CultureAlberta_"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Culture Alberta on YouTube"
                className="text-gray-400 hover:text-gray-900 transition-colors"
              >
                <Youtube size={17} strokeWidth={1.8} />
              </a>
              <a
                href="https://www.facebook.com/profile.php?id=100064044099295"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Culture Alberta on Facebook"
                className="text-gray-400 hover:text-gray-900 transition-colors"
              >
                <Facebook size={17} strokeWidth={1.8} />
              </a>
            </div>

            <Link
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold px-3.5 py-1.5 rounded-full bg-gray-900 text-white hover:bg-gray-700 transition-colors whitespace-nowrap"
            >
              Visit site
            </Link>
          </div>
        </header>

        {/* Tagline */}
        <div className="max-w-6xl mx-auto px-4 pt-4 pb-0">
          <h1 className="text-sm text-gray-400 font-medium text-center">
            Alberta&apos;s latest stories
          </h1>
        </div>

        {/* Main content — filters + grid */}
        <main>
          <ArticleFeed articles={articles} pinnedArticles={pinnedArticles} />
        </main>

        {/* Footer */}
        <footer className="text-center text-xs text-gray-300 pb-10 pt-4">
          <Link
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-gray-500 transition-colors"
          >
            culturealberta.com
          </Link>
        </footer>
      </div>
    </>
  )
}
