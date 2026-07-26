'use client'

import { useMemo, useState } from 'react'
import Link from "next/link"
import Image from "next/image"
import NewsletterSignup from "@/components/newsletter-signup"
import { Article } from "@/lib/types/article"
import { ArrowRight, Clock, MapPin } from "lucide-react"
import { getArticleUrl } from '@/lib/utils/article-url'

export interface SectionHubArticle extends Article {
  description?: string
}

type Accent = 'green' | 'purple' | 'orange' | 'blue'

// Static class strings so Tailwind keeps them (no dynamic class construction).
const ACCENTS: Record<Accent, {
  heroFrom: string
  chip: string
  hover: string
  link: string
  linkHover: string
  filterActive: string
}> = {
  green: {
    heroFrom: 'from-emerald-50 to-green-50',
    chip: 'bg-emerald-100 text-emerald-800',
    hover: 'group-hover:text-emerald-600',
    link: 'text-emerald-600',
    linkHover: 'hover:text-emerald-700',
    filterActive: 'bg-emerald-600 text-white border-emerald-600',
  },
  purple: {
    heroFrom: 'from-violet-50 to-purple-50',
    chip: 'bg-violet-100 text-violet-800',
    hover: 'group-hover:text-violet-600',
    link: 'text-violet-600',
    linkHover: 'hover:text-violet-700',
    filterActive: 'bg-violet-600 text-white border-violet-600',
  },
  orange: {
    heroFrom: 'from-orange-50 to-red-50',
    chip: 'bg-orange-100 text-orange-800',
    hover: 'group-hover:text-orange-600',
    link: 'text-orange-600',
    linkHover: 'hover:text-orange-700',
    filterActive: 'bg-orange-600 text-white border-orange-600',
  },
  blue: {
    heroFrom: 'from-sky-50 to-blue-50',
    chip: 'bg-blue-100 text-blue-800',
    hover: 'group-hover:text-blue-600',
    link: 'text-blue-600',
    linkHover: 'hover:text-blue-700',
    filterActive: 'bg-blue-600 text-white border-blue-600',
  },
}

// Cities we offer as filters, in priority order. Only those actually present in
// the section's articles get shown as chips.
const CITY_ORDER = ['Edmonton', 'Calgary', 'Red Deer', 'Lethbridge', 'Grande Prairie', 'Medicine Hat']

interface SectionHubProps {
  title: string
  description: string
  accent: Accent
  featuredArticle: SectionHubArticle | null
  articles: SectionHubArticle[]
  newsletterTitle: string
  newsletterDescription: string
}

function formatDate(dateString: string) {
  try {
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return 'Recently'
  }
}

function articleInCity(article: SectionHubArticle, city: string) {
  const hay = `${article.location || ''} ${article.category || ''} ${(article.categories || []).join(' ')}`.toLowerCase()
  return hay.includes(city.toLowerCase())
}

export default function SectionHub({
  title,
  description,
  accent,
  featuredArticle,
  articles,
  newsletterTitle,
  newsletterDescription,
}: SectionHubProps) {
  const a = ACCENTS[accent]
  const [city, setCity] = useState<string>('All')

  // Work from one combined, date-sorted list so the featured slot re-picks
  // itself when a city filter is applied.
  const allArticles = useMemo(
    () => (featuredArticle ? [featuredArticle, ...articles] : articles),
    [featuredArticle, articles],
  )

  const availableCities = useMemo(
    () => CITY_ORDER.filter(c => allArticles.some(article => articleInCity(article, c))),
    [allArticles],
  )

  const filtered = useMemo(
    () => (city === 'All' ? allArticles : allArticles.filter(article => articleInCity(article, city))),
    [allArticles, city],
  )

  const featured = filtered[0] || null
  const rest = filtered.length > 1 ? filtered.slice(1) : []

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className={`bg-gradient-to-br ${a.heroFrom} py-6`}>
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-2 text-center">
            <div className="space-y-1">
              <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl">{title}</h1>
              <p className="max-w-[900px] text-muted-foreground md:text-xl mx-auto">{description}</p>
            </div>
          </div>
        </div>
      </section>

      {/* City filter */}
      {availableCities.length > 0 && (
        <section className="border-b border-gray-100 bg-white">
          <div className="container mx-auto px-4 max-w-7xl py-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-gray-400 mr-1 hidden sm:inline">Filter by city:</span>
              {['All', ...availableCities].map(c => (
                <button
                  key={c}
                  onClick={() => setCity(c)}
                  className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    city === c ? a.filterActive : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured */}
      {featured && (
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4 max-w-7xl">
            <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-12 items-center">
              <div className="space-y-6">
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span className={`${a.chip} px-3 py-1 rounded-full font-medium`}>{featured.category}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {formatDate(featured.date || '')}
                  </span>
                </div>
                <Link href={getArticleUrl(featured)} className="group block">
                  <h2 className={`text-4xl md:text-5xl font-bold text-gray-900 ${a.hover} transition-colors leading-tight`}>
                    {featured.title}
                  </h2>
                </Link>
                <p className="text-xl text-gray-600 leading-relaxed">{featured.excerpt}</p>
                <Link href={getArticleUrl(featured)} className={`inline-flex items-center ${a.link} ${a.linkHover} font-semibold text-lg group`}>
                  Read More
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
              <Link href={getArticleUrl(featured)} className="group relative block">
                <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl">
                  <Image
                    src={featured.imageUrl || "/placeholder.svg"}
                    alt={featured.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    priority
                  />
                </div>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Main content */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-12">
            {/* Articles */}
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold text-gray-900">Latest Stories</h2>
                <div className="text-sm text-gray-500">{rest.length} article{rest.length === 1 ? '' : 's'}</div>
              </div>

              <div className="grid gap-8">
                {rest.map((article) => (
                  <Link key={article.id} href={getArticleUrl(article)} className="group">
                    <article className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="relative aspect-[4/3] overflow-hidden">
                          <Image
                            src={article.imageUrl || "/placeholder.svg"}
                            alt={article.title}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                        <div className="p-6 space-y-4">
                          <div className="flex items-center gap-3 text-sm text-gray-600">
                            <span className={`${a.chip} px-3 py-1 rounded-full font-medium`}>{article.category}</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {formatDate(article.date || '')}
                            </span>
                          </div>
                          <h3 className={`text-2xl font-bold text-gray-900 ${a.hover} transition-colors leading-tight`}>
                            {article.title}
                          </h3>
                          <p className="text-gray-600 leading-relaxed line-clamp-3">{article.excerpt}</p>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <MapPin className="w-4 h-4" />
                            <span>{article.location || 'Alberta'}</span>
                          </div>
                        </div>
                      </div>
                    </article>
                  </Link>
                ))}
              </div>

              {filtered.length === 0 && (
                <div className="text-center py-12">
                  <h3 className="text-2xl font-semibold text-gray-900 mb-4">No stories{city === 'All' ? ' yet' : ` for ${city}`}</h3>
                  <p className="text-gray-600">
                    {city === 'All' ? "Check back soon — we're working on this section." : 'Try another city or clear the filter.'}
                  </p>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-8">
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                <NewsletterSignup title={newsletterTitle} description={newsletterDescription} defaultCity="" />
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Browse by City</h3>
                <div className="space-y-1">
                  {[
                    { name: 'Calgary', href: '/calgary' },
                    { name: 'Edmonton', href: '/edmonton' },
                    { name: 'Lethbridge', href: '/lethbridge' },
                    { name: 'Grande Prairie', href: '/grande-prairie' },
                    { name: 'Red Deer', href: '/red-deer' },
                  ].map((city) => (
                    <Link
                      key={city.name}
                      href={city.href}
                      className={`flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0 text-gray-700 ${a.linkHover} font-medium transition-colors`}
                    >
                      {city.name}
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  ))}
                </div>
              </div>

              {rest.length > 0 && (
                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Popular Stories</h3>
                  <div className="space-y-4">
                    {rest.slice(0, 4).map((article) => (
                      <Link key={article.id} href={getArticleUrl(article)} className="group flex gap-3">
                        <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
                          <Image
                            src={article.imageUrl || '/placeholder.svg'}
                            alt={article.title}
                            width={64}
                            height={64}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold text-gray-900 ${a.hover} transition-colors line-clamp-2 leading-tight`}>
                            {article.title}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">{formatDate(article.date || '')}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
