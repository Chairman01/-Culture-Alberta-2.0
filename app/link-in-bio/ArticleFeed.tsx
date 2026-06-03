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
  pinnedArticles?: Article[]
}

// ---------- constants ----------

const PAGE_SIZE = 30
const NEWSLETTER_INSERT_AFTER = 15 // insert after 15 items (5 rows of 3)

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
    <div className="col-span-3 md:col-span-4 bg-gray-900 rounded-2xl p-5 text-white">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
          <Mail className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold leading-tight">Get Alberta news in your inbox</p>
          <p className="text-xs text-gray-400 mt-0.5">Daily stories from your city, free.</p>
        </div>
      </div>
      {status === 'success' ? (
        <p className="text-sm font-semibold text-green-400">You&apos;re subscribed! Check your inbox.</p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            required
            className="flex-1 bg-white/10 text-white text-sm rounded-xl px-3 py-2.5 border border-white/10 focus:outline-none [&>option]:text-gray-900"
          >
            <option value="">Your city…</option>
            {NEWSLETTER_CITIES.filter((c) => c.value).map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            required
            className="flex-1 bg-white/10 text-white text-sm rounded-xl px-3 py-2.5 border border-white/10 focus:outline-none placeholder:text-gray-500"
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

// ---------- Instagram-style tile with persistent text overlay ----------

function GridTile({ article }: { article: Article }) {
  const href = `/articles/${article.slug || article.id}`

  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative aspect-square block overflow-hidden bg-gray-100 rounded-sm"
    >
      {/* Full-bleed image */}
      {article.imageUrl ? (
        <Image
          src={article.imageUrl}
          alt={article.title}
          fill
          className="object-cover group-hover:scale-[1.03] transition-transform duration-300"
          sizes="(max-width: 640px) 33vw, 25vw"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-700 to-gray-900" />
      )}

      {/* Persistent bottom gradient + text */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-8 pb-2.5 px-2.5">
        {article.category && (
          <p className="text-[8px] font-bold uppercase tracking-widest text-white/70 mb-1 leading-none">
            {article.category}
          </p>
        )}
        <p className="text-white text-[11px] font-semibold leading-snug line-clamp-3">
          {article.title}
        </p>
        <p className="text-white/60 text-[9px] mt-1 font-medium">
          Read full article →
        </p>
      </div>
    </Link>
  )
}

// ---------- Pinned featured card (larger, with text below) ----------

function FeaturedTile({ article }: { article: Article }) {
  const href = `/articles/${article.slug || article.id}`
  const date = formatDate(article.date || article.createdAt)

  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col overflow-hidden rounded-lg bg-white"
    >
      <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
        {article.imageUrl ? (
          <Image
            src={article.imageUrl}
            alt={article.title}
            fill
            className="object-cover group-hover:scale-[1.03] transition-transform duration-300"
            sizes="(max-width: 640px) 50vw, 40vw"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300" />
        )}
        {article.category && (
          <span className="absolute top-2 left-2 text-[9px] font-bold uppercase tracking-wider bg-white/90 text-gray-700 rounded-full px-2 py-0.5 backdrop-blur-sm">
            {article.category}
          </span>
        )}
      </div>
      <div className="pt-2 pb-1 px-0.5">
        <p className="text-[12px] font-semibold text-gray-900 leading-snug line-clamp-2 group-hover:text-gray-600 transition-colors">
          {article.title}
        </p>
        {date && <p className="text-[10px] text-gray-400 mt-1">{date}</p>}
      </div>
    </Link>
  )
}

// ---------- main feed ----------

export default function ArticleFeed({ articles, pinnedArticles = [] }: ArticleFeedProps) {
  const [selectedCity, setSelectedCity] = useState('')
  const [visible, setVisible] = useState(PAGE_SIZE)

  const filtered = useMemo(
    () => articles.filter((a) => matchesCity(a, selectedCity)),
    [articles, selectedCity]
  )

  const shown = filtered.slice(0, visible)
  const hasMore = visible < filtered.length

  const handleCityChange = (city: string) => {
    setSelectedCity(city)
    setVisible(PAGE_SIZE)
  }

  // Build 3-col grid items, inserting newsletter banner at NEWSLETTER_INSERT_AFTER
  const gridItems: React.ReactNode[] = []
  shown.forEach((article, index) => {
    if (index === NEWSLETTER_INSERT_AFTER) {
      gridItems.push(<InlineNewsletter key="newsletter-insert" />)
    }
    gridItems.push(<GridTile key={article.id} article={article} />)
  })

  return (
    <>
      {/* ---------- Pinned / Featured section ---------- */}
      {pinnedArticles.length > 0 && (
        <div className="max-w-5xl mx-auto px-3 pt-4 pb-2">
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-3">Featured</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {pinnedArticles.map(article => (
              <FeaturedTile key={article.id} article={article} />
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

      {/* ---------- Instagram-style grid — 3 col mobile, 4 col desktop ---------- */}
      <div className="max-w-5xl mx-auto px-1 py-1">
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
            <div className="grid grid-cols-3 md:grid-cols-4 gap-1">
              {gridItems}
            </div>

            {shown.length <= NEWSLETTER_INSERT_AFTER && (
              <div className="px-3 mt-3">
                <InlineNewsletter />
              </div>
            )}

            {hasMore && (
              <div className="flex justify-center mt-5 mb-3">
                <button
                  onClick={() => setVisible((v) => v + PAGE_SIZE)}
                  className="px-7 py-2.5 rounded-full bg-gray-900 text-white text-xs font-semibold hover:bg-gray-700 transition-colors"
                >
                  Load more
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}
