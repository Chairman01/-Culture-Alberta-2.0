'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Mail } from 'lucide-react'
import { NEWSLETTER_CITIES } from '@/lib/newsletter-cities'

interface Article {
  id: string
  title: string
  slug?: string
  imageUrl?: string
  category?: string
  categories?: string[]
  location?: string
  date?: string
  createdAt?: string
  excerpt?: string
}

interface ArticleFeedProps {
  articles: Article[]
}

// ---------- constants ----------

// Add article slugs here to pin them at the top (max 4 recommended)
const PINNED_SLUGS: string[] = []

const PAGE_SIZE = 12
const NEWSLETTER_INSERT_AFTER = 8 // insert newsletter banner after this many cards

const CITY_FILTERS = [
  { label: 'All Alberta', value: '' },
  { label: 'Calgary', value: 'calgary' },
  { label: 'Edmonton', value: 'edmonton' },
  { label: 'Lethbridge', value: 'lethbridge' },
  { label: 'Red Deer', value: 'red deer' },
  { label: 'Grande Prairie', value: 'grande prairie' },
  { label: 'Fort McMurray', value: 'fort mcmurray' },
  { label: 'Medicine Hat', value: 'medicine hat' },
]

// ---------- helpers ----------

function formatDate(dateStr?: string) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
}

function matchesCity(article: Article, city: string): boolean {
  if (!city) return true
  const loc = (article.location || '').toLowerCase()
  const cat = (article.category || '').toLowerCase()
  const cats = (article.categories || []).map((c: string) => c.toLowerCase())
  return loc.includes(city) || cat.includes(city) || cats.some((c) => c.includes(city))
}

// ---------- inline newsletter ----------

function InlineNewsletter() {
  const [email, setEmail] = useState('')
  const [city, setCity] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !city) return
    setStatus('loading')
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, city, optIn: true, source: 'link-in-bio' }),
      })
      const data = await res.json()
      setStatus(res.ok && data.success ? 'success' : 'error')
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="bg-gray-900 rounded-2xl p-5 sm:p-6 text-white">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
          <Mail className="w-4 h-4 text-white" />
        </div>
        <div>
          <h2 className="text-sm font-bold leading-tight">Get Alberta news in your inbox</h2>
          <p className="text-xs text-gray-400 mt-0.5">Daily stories from your city, free.</p>
        </div>
      </div>

      {status === 'success' ? (
        <p className="text-sm font-semibold text-green-400 py-1">
          You&apos;re subscribed! Check your inbox.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            required
            className="flex-1 bg-white/10 text-white text-sm rounded-xl px-3 py-2.5 border border-white/10 focus:outline-none focus:border-white/30 [&>option]:text-gray-900"
          >
            <option value="">Your city…</option>
            {NEWSLETTER_CITIES.filter((c) => c.value).map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            required
            className="flex-1 bg-white/10 text-white text-sm rounded-xl px-3 py-2.5 border border-white/10 focus:outline-none focus:border-white/30 placeholder:text-gray-500"
          />
          <button
            type="submit"
            disabled={status === 'loading'}
            className="px-5 py-2.5 bg-white text-gray-900 text-sm font-semibold rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {status === 'loading' ? 'Subscribing…' : 'Subscribe →'}
          </button>
        </form>
      )}

      {status === 'error' && (
        <p className="text-xs text-red-400 mt-2">Something went wrong — please try again.</p>
      )}
    </div>
  )
}

// ---------- article card ----------

function ArticleCard({ article }: { article: Article }) {
  const href = `/articles/${article.slug || article.id}`
  const date = formatDate(article.date || article.createdAt)

  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col bg-white rounded-xl overflow-hidden border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all duration-200 active:scale-[0.98]"
    >
      {/* Image */}
      <div className="relative w-full aspect-video bg-gray-100 overflow-hidden">
        {article.imageUrl ? (
          <Image
            src={article.imageUrl}
            alt={article.title}
            fill
            className="object-cover group-hover:scale-[1.03] transition-transform duration-300"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
            <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
              No image
            </span>
          </div>
        )}
      </div>

      {/* Text */}
      <div className="p-2.5 flex flex-col gap-1 flex-1">
        {article.category && (
          <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400 truncate leading-none">
            {article.category}
          </span>
        )}
        <span className="text-[11px] sm:text-xs font-semibold text-gray-900 leading-snug line-clamp-3 group-hover:text-gray-600 transition-colors">
          {article.title}
        </span>
        {date && (
          <span className="text-[10px] text-gray-400 mt-auto pt-1 leading-none">{date}</span>
        )}
      </div>
    </Link>
  )
}

// ---------- main feed ----------

export default function ArticleFeed({ articles }: ArticleFeedProps) {
  const [selectedCity, setSelectedCity] = useState('')
  const [visible, setVisible] = useState(PAGE_SIZE)

  // Separate pinned articles from the main feed
  const pinnedArticles = useMemo(
    () =>
      PINNED_SLUGS.length > 0
        ? (PINNED_SLUGS.map(slug => articles.find(a => a.slug === slug)).filter(Boolean) as Article[])
        : [],
    [articles],
  )

  const unpinnedArticles = useMemo(
    () =>
      PINNED_SLUGS.length > 0
        ? articles.filter(a => !PINNED_SLUGS.includes(a.slug ?? ''))
        : articles,
    [articles],
  )

  const filtered = useMemo(
    () => unpinnedArticles.filter((a) => matchesCity(a, selectedCity)),
    [unpinnedArticles, selectedCity]
  )

  const shown = filtered.slice(0, visible)
  const hasMore = visible < filtered.length

  const handleCityChange = (city: string) => {
    setSelectedCity(city)
    setVisible(PAGE_SIZE)
  }

  // Build grid items, inserting the newsletter banner after NEWSLETTER_INSERT_AFTER cards
  const gridItems: React.ReactNode[] = []
  shown.forEach((article, index) => {
    if (index === NEWSLETTER_INSERT_AFTER) {
      gridItems.push(
        <div
          key="newsletter-insert"
          className="col-span-2 sm:col-span-2 md:col-span-3 lg:col-span-4"
        >
          <InlineNewsletter />
        </div>
      )
    }
    gridItems.push(<ArticleCard key={article.id} article={article} />)
  })

  return (
    <>
      {/* ---------- Pinned / Featured articles ---------- */}
      {pinnedArticles.length > 0 && (
        <div className="max-w-6xl mx-auto px-3 sm:px-4 pt-4 pb-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-3">
            Featured
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3">
            {pinnedArticles.map(article => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
          <div className="mt-4 border-b border-gray-100" />
        </div>
      )}

      {/* ---------- City filter chips ---------- */}
      <div className="sticky top-[52px] z-10 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div
          className="flex gap-2 px-4 py-2.5 overflow-x-auto"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
        >
          {CITY_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => handleCityChange(f.value)}
              aria-pressed={selectedCity === f.value}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-[11px] font-semibold transition-colors ${
                selectedCity === f.value
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ---------- Article grid ---------- */}
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-5">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400 text-sm">No stories found for this city yet.</p>
            <button
              onClick={() => handleCityChange('')}
              className="mt-3 text-xs font-semibold text-gray-900 underline underline-offset-2"
            >
              Show all Alberta
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3 md:gap-4">
              {gridItems}
            </div>

            {/* Newsletter at bottom if fewer than NEWSLETTER_INSERT_AFTER shown */}
            {shown.length <= NEWSLETTER_INSERT_AFTER && (
              <div className="mt-5">
                <InlineNewsletter />
              </div>
            )}

            {/* Load more */}
            {hasMore && (
              <div className="flex justify-center mt-6">
                <button
                  onClick={() => setVisible((v) => v + PAGE_SIZE)}
                  className="px-7 py-2.5 rounded-full bg-gray-900 text-white text-xs font-semibold hover:bg-gray-700 transition-colors"
                >
                  Load more stories
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}
