import { Metadata } from 'next'
import Link from 'next/link'
import { Instagram, Youtube, Facebook } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import ArticleFeed from './ArticleFeed'

export const revalidate = 120

export const metadata: Metadata = {
  title: 'Culture Alberta — Latest Alberta Stories',
  description:
    'The latest stories from across Alberta. Breaking stories from Calgary, Edmonton, Lethbridge, Red Deer, Grande Prairie, Fort McMurray, Medicine Hat, and everywhere in between.',
  openGraph: {
    title: 'Culture Alberta — Latest Alberta Stories',
    description:
      'The latest stories from across Alberta — Calgary, Edmonton, Lethbridge, Red Deer, Grande Prairie, Fort McMurray, and Medicine Hat.',
    url: 'https://www.culturealberta.com/link-in-bio',
    siteName: 'Culture Alberta',
    type: 'website',
    locale: 'en_CA',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Culture Alberta — Latest Alberta Stories',
    description: 'The latest stories from across Alberta.',
  },
  alternates: {
    canonical: 'https://www.culturealberta.com/link-in-bio',
  },
  keywords: [
    'Alberta stories',
    'Culture Alberta',
  ],
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Culture Alberta',
  url: 'https://www.culturealberta.com',
  sameAs: [
    'https://www.instagram.com/culturealberta._/',
    'https://www.youtube.com/@CultureAlberta_',
    'https://www.facebook.com/profile.php?id=100064044099295',
    'https://www.pinterest.com/culturealberta/',
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
              <a
                href="https://www.pinterest.com/culturealberta/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Culture Alberta on Pinterest"
                className="text-gray-400 hover:text-gray-900 transition-colors"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z" />
                </svg>
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
