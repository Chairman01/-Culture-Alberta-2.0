'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowLeft, Pin, PinOff, ArrowUp, ArrowDown, Search,
  ExternalLink, Loader2, CheckCircle, X, GripVertical,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

// ── Types ──────────────────────────────────────────────────────────────────────

interface Article {
  id: string
  title: string
  slug: string
  image_url?: string
  category?: string
  categories?: string[]
  created_at: string
  pinned_link_in_bio: boolean
  link_in_bio_order: number | null
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function LinkInBioAdmin() {
  const router = useRouter()
  const [pinned, setPinned] = useState<Article[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Article[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  // ── Auth guard ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (typeof window === 'undefined') return
    const ok = localStorage.getItem('admin_authenticated')
    if (ok !== 'true') { router.push('/admin/login'); return }
    loadPinned()
  }, [router])

  // ── Data loading ────────────────────────────────────────────────────────────

  async function loadPinned() {
    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/link-in-bio')
      const data = await res.json()
      setPinned(data.pinned || [])
    } catch { /* silent */ }
    finally { setIsLoading(false) }
  }

  // ── Search ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return }
    const timer = setTimeout(async () => {
      setIsSearching(true)
      try {
        const res = await fetch(`/api/admin/link-in-bio/search?q=${encodeURIComponent(searchQuery)}`)
        const data = await res.json()
        // Exclude already-pinned articles
        const pinnedIds = new Set(pinned.map(a => a.id))
        setSearchResults((data.articles || []).filter((a: Article) => !pinnedIds.has(a.id)))
      } catch { /* silent */ }
      finally { setIsSearching(false) }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, pinned])

  // ── Reorder ─────────────────────────────────────────────────────────────────

  function move(index: number, dir: -1 | 1) {
    const next = [...pinned]
    const swap = index + dir
    if (swap < 0 || swap >= next.length) return
    ;[next[index], next[swap]] = [next[swap], next[index]]
    setPinned(next)
  }

  // ── Pin / unpin ─────────────────────────────────────────────────────────────

  async function pinArticle(article: Article) {
    setUpdatingId(article.id)
    try {
      // Assign next order position
      const nextOrder = pinned.length + 1
      const res = await fetch(`/api/admin/articles/${article.id}/pin`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinned: true, order: nextOrder }),
      })
      if (res.ok) {
        setPinned(prev => [...prev, { ...article, pinned_link_in_bio: true, link_in_bio_order: nextOrder }])
        setSearchQuery('')
        setSearchResults([])
      }
    } finally { setUpdatingId(null) }
  }

  async function unpinArticle(article: Article) {
    setUpdatingId(article.id)
    try {
      const res = await fetch(`/api/admin/articles/${article.id}/pin`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinned: false }),
      })
      if (res.ok) {
        setPinned(prev => prev.filter(a => a.id !== article.id))
      }
    } finally { setUpdatingId(null) }
  }

  // ── Save order ──────────────────────────────────────────────────────────────

  async function saveOrder() {
    setIsSaving(true)
    setSaveSuccess(false)
    try {
      const order = pinned.map((a, i) => ({ id: a.id, order: i + 1 }))
      const res = await fetch('/api/admin/link-in-bio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order }),
      })
      if (res.ok) {
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 3000)
      }
    } finally { setIsSaving(false) }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto p-6">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />Back
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Link in Bio</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Pin articles and set the order they appear at the top of your link-in-bio page.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/link-in-bio" target="_blank">
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Preview page
            </Link>
          </Button>
        </div>

        {/* ── Pinned list ─────────────────────────────────────────────────── */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Pin className="h-4 w-4 text-gray-500" />
              Pinned articles
              <span className="text-xs font-normal text-muted-foreground">
                ({pinned.length} pinned — these show first)
              </span>
            </h2>
            <div className="flex items-center gap-2">
              {saveSuccess && (
                <span className="flex items-center gap-1 text-sm text-green-600">
                  <CheckCircle className="h-4 w-4" /> Saved
                </span>
              )}
              <Button
                onClick={saveOrder}
                disabled={isSaving || pinned.length === 0}
                size="sm"
                className="bg-gray-900 hover:bg-gray-700 text-white"
              >
                {isSaving ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Saving…</> : 'Save order'}
              </Button>
            </div>
          </div>

          {pinned.length === 0 ? (
            <div className="border-2 border-dashed border-gray-200 rounded-xl py-10 text-center">
              <Pin className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No pinned articles yet</p>
              <p className="text-xs text-gray-300 mt-1">Search below to add articles to pin</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pinned.map((article, index) => (
                <div
                  key={article.id}
                  className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-xl hover:border-gray-300 transition-colors"
                >
                  {/* Position */}
                  <span className="text-xs font-bold text-gray-400 w-5 text-center shrink-0">
                    {index + 1}
                  </span>

                  {/* Thumbnail */}
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                    {article.image_url ? (
                      <Image
                        src={article.image_url}
                        alt={article.title}
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200" />
                    )}
                  </div>

                  {/* Title + meta */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 line-clamp-2 leading-snug">
                      {article.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {article.category && (
                        <span className="text-[10px] text-gray-400 uppercase tracking-wide">
                          {article.category}
                        </span>
                      )}
                      <span className="text-[10px] text-gray-300">
                        {new Date(article.created_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                  </div>

                  {/* Up / Down */}
                  <div className="flex flex-col gap-0.5 shrink-0">
                    <button
                      onClick={() => move(index, -1)}
                      disabled={index === 0}
                      className="p-1 rounded hover:bg-gray-100 disabled:opacity-20 transition-colors"
                      title="Move up"
                    >
                      <ArrowUp className="h-3.5 w-3.5 text-gray-500" />
                    </button>
                    <button
                      onClick={() => move(index, 1)}
                      disabled={index === pinned.length - 1}
                      className="p-1 rounded hover:bg-gray-100 disabled:opacity-20 transition-colors"
                      title="Move down"
                    >
                      <ArrowDown className="h-3.5 w-3.5 text-gray-500" />
                    </button>
                  </div>

                  {/* Unpin */}
                  <button
                    onClick={() => unpinArticle(article)}
                    disabled={updatingId === article.id}
                    className="p-1.5 rounded-lg hover:bg-red-50 hover:text-red-500 text-gray-400 transition-colors shrink-0"
                    title="Remove from pinned"
                  >
                    {updatingId === article.id
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <X className="h-4 w-4" />
                    }
                  </button>
                </div>
              ))}
            </div>
          )}

          {pinned.length > 0 && (
            <p className="text-xs text-gray-400 mt-2 pl-1">
              After pinned articles, the page shows all other articles newest to oldest.
            </p>
          )}
        </div>

        {/* ── Search to add ────────────────────────────────────────────────── */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Search className="h-4 w-4 text-gray-500" />
            Add an article to pin
          </h2>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by title…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9"
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
            )}
          </div>

          {searchResults.length > 0 && (
            <div className="mt-2 border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
              {searchResults.map(article => (
                <div key={article.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors">
                  <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                    {article.image_url ? (
                      <Image
                        src={article.image_url}
                        alt={article.title}
                        fill
                        className="object-cover"
                        sizes="40px"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 line-clamp-1">{article.title}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {article.category} · {new Date(article.created_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => pinArticle(article)}
                    disabled={updatingId === article.id}
                    className="shrink-0 text-xs h-7"
                  >
                    {updatingId === article.id
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <><Pin className="h-3 w-3 mr-1" />Pin</>
                    }
                  </Button>
                </div>
              ))}
            </div>
          )}

          {searchQuery.trim() && !isSearching && searchResults.length === 0 && (
            <p className="text-sm text-gray-400 mt-3 text-center py-4">
              No results for &ldquo;{searchQuery}&rdquo;
            </p>
          )}
        </div>

      </div>
    </div>
  )
}
