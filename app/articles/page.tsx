"use client"

import { useState, useEffect, useCallback, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Search, Calendar, MapPin, X } from "lucide-react"
import { getArticleUrl } from "@/lib/utils/article-url"

interface Article {
  id: string
  title: string
  excerpt?: string
  description?: string
  imageUrl?: string
  category?: string
  categories?: string[]
  location?: string
  date?: string
  author?: string
  tags?: string[]
  slug?: string
}

// Quick-access filter chips shown above results
const FILTER_CHIPS = [
  { label: "AISH", query: "AISH" },
  { label: "Food & Drink", query: "Food" },
  { label: "Edmonton", query: "Edmonton" },
  { label: "Calgary", query: "Calgary" },
  { label: "Housing", query: "Housing" },
  { label: "Benefits", query: "Benefits" },
  { label: "Disability", query: "Disability" },
  { label: "Evergreen", query: "Evergreen" },
  { label: "Events", query: "Events" },
  { label: "Alberta", query: "Alberta" },
]

function ArticlesContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialSearch = searchParams.get("search") || ""

  const [allArticles, setAllArticles] = useState<Article[]>([])
  const [results, setResults] = useState<Article[]>([])
  const [inputValue, setInputValue] = useState(initialSearch)
  const [activeQuery, setActiveQuery] = useState(initialSearch)
  const [isLoading, setIsLoading] = useState(true)
  const [isSearching, setIsSearching] = useState(false)

  // Load default articles on mount (fast, from JSON fallback)
  useEffect(() => {
    async function loadDefault() {
      try {
        setIsLoading(true)
        const res = await fetch("/api/articles")
        if (res.ok) {
          const data = await res.json()
          const arr = Array.isArray(data) ? data : (data.articles || [])
          setAllArticles(arr)
          if (!initialSearch) setResults(arr)
        }
      } catch {
        setAllArticles([])
        setResults([])
      } finally {
        setIsLoading(false)
      }
    }
    loadDefault()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Run Supabase-backed search whenever activeQuery changes
  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults(allArticles)
      return
    }
    setIsSearching(true)
    try {
      const res = await fetch(`/api/articles?search=${encodeURIComponent(q.trim())}`)
      if (res.ok) {
        const data = await res.json()
        setResults(Array.isArray(data) ? data : [])
      }
    } catch {
      // fall back to client-side filter if fetch fails
      const ql = q.toLowerCase()
      setResults(allArticles.filter(a =>
        a.title?.toLowerCase().includes(ql) ||
        a.excerpt?.toLowerCase().includes(ql) ||
        a.category?.toLowerCase().includes(ql)
      ))
    } finally {
      setIsSearching(false)
    }
  }, [allArticles])

  // Re-run search when activeQuery or article list changes
  useEffect(() => {
    if (activeQuery) runSearch(activeQuery)
  }, [activeQuery, runSearch])

  // Sync from URL on first render if there's an initial search
  useEffect(() => {
    const s = searchParams.get("search")
    if (s && s !== activeQuery) {
      setInputValue(s)
      setActiveQuery(s)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const q = inputValue.trim()
    setActiveQuery(q)
    if (q) {
      router.push(`/articles?search=${encodeURIComponent(q)}`, { scroll: false })
    } else {
      router.push("/articles", { scroll: false })
    }
  }

  const handleChipClick = (query: string) => {
    setInputValue(query)
    setActiveQuery(query)
    router.push(`/articles?search=${encodeURIComponent(query)}`, { scroll: false })
  }

  const handleClear = () => {
    setInputValue("")
    setActiveQuery("")
    setResults(allArticles)
    router.push("/articles", { scroll: false })
  }

  const busy = isLoading || isSearching

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 max-w-6xl py-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-1">All Articles</h1>
          <p className="text-gray-500 mb-6 text-sm">
            Stories about culture, events, benefits, and everyday Alberta life
          </p>

          {/* Search bar */}
          <form onSubmit={handleSubmit} className="flex gap-2 max-w-xl mb-5">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                placeholder="Search articles, topics, locations…"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="w-full pl-9 pr-9 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white"
              />
              {inputValue && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition-colors shrink-0"
            >
              Search
            </button>
          </form>

          {/* Filter chips */}
          <div className="flex flex-wrap gap-2">
            {FILTER_CHIPS.map((chip) => {
              const active = activeQuery.toLowerCase() === chip.query.toLowerCase()
              return (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => active ? handleClear() : handleChipClick(chip.query)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    active
                      ? "bg-gray-900 text-white border-gray-900"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:text-gray-900"
                  }`}
                >
                  {chip.label}
                  {active && <span className="ml-1 opacity-60">✕</span>}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="container mx-auto px-4 max-w-6xl py-8">
        {busy ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-gray-900" />
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-16">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {activeQuery ? `No articles found for "${activeQuery}"` : "No articles found"}
            </h3>
            <p className="text-gray-500 text-sm mb-4">
              {activeQuery
                ? "Try a different search term or browse a category above."
                : "Check back soon for new content."}
            </p>
            {activeQuery && (
              <button
                onClick={handleClear}
                className="text-sm font-medium text-gray-900 underline underline-offset-2"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-6">
              {activeQuery ? (
                <>
                  <span className="font-semibold text-gray-900">{results.length}</span>
                  {" "}result{results.length !== 1 ? "s" : ""} for{" "}
                  &ldquo;<span className="font-semibold text-gray-900">{activeQuery}</span>&rdquo;
                </>
              ) : (
                <>
                  <span className="font-semibold text-gray-900">{results.length}</span>
                  {" "}article{results.length !== 1 ? "s" : ""}
                </>
              )}
            </p>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {results.map((article) => (
                <Link
                  key={article.id}
                  href={getArticleUrl(article)}
                  className="group bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* Image */}
                  <div className="relative h-44 bg-gray-100">
                    {article.imageUrl && !article.imageUrl.startsWith("data:") ? (
                      <Image
                        src={article.imageUrl}
                        alt={article.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                        <span className="text-gray-400 text-xs">No image</span>
                      </div>
                    )}
                    {article.category && (
                      <span className="absolute top-3 left-3 bg-black/75 text-white text-xs px-2 py-1 rounded font-medium">
                        {article.category}
                      </span>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <h2 className="font-semibold text-base text-gray-900 group-hover:text-gray-600 transition-colors line-clamp-2 mb-1.5 leading-snug">
                      {article.title}
                    </h2>
                    {(article.excerpt || article.description) && (
                      <p className="text-gray-500 text-xs line-clamp-2 mb-3 leading-relaxed">
                        {article.excerpt || article.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      {article.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {article.location}
                        </span>
                      )}
                      {article.date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(article.date).toLocaleDateString("en-CA", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function ArticlesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-gray-900" />
        </div>
      }
    >
      <ArticlesContent />
    </Suspense>
  )
}
