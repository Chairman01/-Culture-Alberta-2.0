"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { getAllNewsletterSubscriptions, getNewsletterStats } from "@/lib/newsletter"
import { triggerCityNewsletter, triggerAllNewsletters, sendTestNewsletter } from "./_actions"
import {
  loadAllConfigs,
  saveFeaturedArticle,
  saveArticleOrder,
  saveAlbertaArticles,
  searchArticles,
  getArticleDetails,
  type NewsletterConfig,
  type ArticlePickerItem,
} from "./_config-actions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  ArrowLeft, Mail, Users, MapPin, Calendar,
  Send, CheckCircle, AlertCircle, Loader2, Eye, X, FlaskConical,
  ChevronDown, ChevronUp, Settings, Star, ArrowUp, ArrowDown, Leaf,
} from "lucide-react"
import Link from "next/link"
import type { SendResult } from "@/lib/newsletter/send-newsletter"

// ── Types ─────────────────────────────────────────────────────────────────────

interface NewsletterSubscription {
  id?: string
  email: string
  city: string
  province?: string
  country?: string
  created_at?: string
  status?: 'active' | 'unsubscribed'
}

type CityKey = 'edmonton' | 'calgary' | 'lethbridge'

interface SendState {
  status: 'idle' | 'sending' | 'success' | 'error'
  result?: SendResult
  error?: string
}

interface TestState {
  open: boolean
  email: string
  status: 'idle' | 'sending' | 'success' | 'error'
  error?: string
}

interface CityConfigDraft {
  featured_article_id: string | null
  featured_article: ArticlePickerItem | null
  article_order: string[] | null       // null = auto
  article_order_items: ArticlePickerItem[]
  isDirty: boolean
}

interface AlbertaDraft {
  ids: string[] | null                 // null = auto
  items: ArticlePickerItem[]
  isDirty: boolean
}

interface PickerState {
  open: boolean
  target: 'featured' | 'order' | 'alberta'
  city?: CityKey
  query: string
  results: ArticlePickerItem[]
  searching: boolean
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CITY_CONFIG: Record<CityKey, { label: string; newsletter: string; color: string; accent: string; border: string }> = {
  edmonton:   { label: 'Edmonton',   newsletter: 'The Capital',  color: 'text-blue-600',  accent: 'bg-blue-600',  border: 'border-blue-200'  },
  calgary:    { label: 'Calgary',    newsletter: 'The Chinook',  color: 'text-red-600',   accent: 'bg-red-600',   border: 'border-red-200'   },
  lethbridge: { label: 'Lethbridge', newsletter: 'The Westerly', color: 'text-amber-600', accent: 'bg-amber-600', border: 'border-amber-200' },
}

const OTHER_CITY_LABELS: Record<string, string> = {
  'red-deer':       'Red Deer',
  'grande-prairie': 'Grande Prairie',
  'medicine-hat':   'Medicine Hat',
  'other-alberta':  'Other Alberta',
  'outside-alberta':'Outside Alberta',
  'other':          'Other',
  'unknown':        'Unknown',
}

const emptyDraft = (): CityConfigDraft => ({
  featured_article_id: null,
  featured_article: null,
  article_order: null,
  article_order_items: [],
  isDirty: false,
})

// ── Component ─────────────────────────────────────────────────────────────────

export default function NewsletterAdmin() {
  const router = useRouter()
  const [subscriptions, setSubscriptions] = useState<NewsletterSubscription[]>([])
  const [stats, setStats] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  const [previewCity, setPreviewCity] = useState<CityKey | null>(null)

  // Send states
  const [sendStates, setSendStates] = useState<Record<CityKey, SendState>>({
    edmonton:   { status: 'idle' },
    calgary:    { status: 'idle' },
    lethbridge: { status: 'idle' },
  })
  const [testStates, setTestStates] = useState<Record<CityKey, TestState>>({
    edmonton:   { open: false, email: '', status: 'idle' },
    calgary:    { open: false, email: '', status: 'idle' },
    lethbridge: { open: false, email: '', status: 'idle' },
  })
  const [sendAllState, setSendAllState] = useState<{
    status: 'idle' | 'sending' | 'success' | 'error'
    results?: SendResult[]
    error?: string
  }>({ status: 'idle' })
  const [isPending, startTransition] = useTransition()

  // Configure states
  const [configCollapsed, setConfigCollapsed] = useState(false)
  const [cityDrafts, setCityDrafts] = useState<Record<CityKey, CityConfigDraft>>({
    edmonton:   emptyDraft(),
    calgary:    emptyDraft(),
    lethbridge: emptyDraft(),
  })
  const [albertaDraft, setAlbertaDraft] = useState<AlbertaDraft>({ ids: null, items: [], isDirty: false })
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Picker
  const [picker, setPicker] = useState<PickerState>({
    open: false, target: 'featured', query: '', results: [], searching: false,
  })

  // ── Load on mount ───────────────────────────────────────────────────────────

  useEffect(() => {
    const adminAuthenticated = localStorage.getItem("admin_authenticated")
    setIsAuthenticated(adminAuthenticated === "true")
    if (!adminAuthenticated) { router.push("/admin/login"); return }

    const loadData = async () => {
      try {
        const [subscriptionsData, statsData, configData] = await Promise.all([
          getAllNewsletterSubscriptions(),
          getNewsletterStats(),
          loadAllConfigs(),
        ])
        setSubscriptions(subscriptionsData)
        setStats(statsData)

        // Hydrate city drafts from saved config
        const cities: CityKey[] = ['edmonton', 'calgary', 'lethbridge']
        const newDrafts: Record<CityKey, CityConfigDraft> = {
          edmonton: emptyDraft(), calgary: emptyDraft(), lethbridge: emptyDraft(),
        }
        const allArticleIds = new Set<string>()

        for (const city of cities) {
          const cfg = configData[city]
          if (cfg.featured_article_id) allArticleIds.add(cfg.featured_article_id)
          if (cfg.article_order) cfg.article_order.forEach(id => allArticleIds.add(id))
          if (cfg.alberta_article_ids) cfg.alberta_article_ids.forEach(id => allArticleIds.add(id))
        }

        // Batch-fetch article details for display
        const details = await getArticleDetails(Array.from(allArticleIds))
        const byId = Object.fromEntries(details.map(a => [a.id, a]))

        for (const city of cities) {
          const cfg = configData[city]
          newDrafts[city] = {
            featured_article_id: cfg.featured_article_id,
            featured_article: cfg.featured_article_id ? byId[cfg.featured_article_id] ?? null : null,
            article_order: cfg.article_order,
            article_order_items: cfg.article_order ? cfg.article_order.map(id => byId[id]).filter(Boolean) : [],
            isDirty: false,
          }
        }
        setCityDrafts(newDrafts)

        // Alberta (use edmonton row as source)
        const albertaIds = configData.edmonton.alberta_article_ids
        setAlbertaDraft({
          ids: albertaIds,
          items: albertaIds ? albertaIds.map(id => byId[id]).filter(Boolean) : [],
          isDirty: false,
        })
      } catch (error) {
        console.error("Error loading newsletter data:", error)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [router])

  // ── Send handlers ───────────────────────────────────────────────────────────

  function handleSendCity(city: CityKey) {
    setSendStates(prev => ({ ...prev, [city]: { status: 'sending' } }))
    startTransition(async () => {
      try {
        const result = await triggerCityNewsletter(city)
        setSendStates(prev => ({ ...prev, [city]: { status: 'success', result } }))
      } catch (err) {
        setSendStates(prev => ({
          ...prev,
          [city]: { status: 'error', error: err instanceof Error ? err.message : 'Unknown error' },
        }))
      }
    })
  }

  function handleSendAll() {
    setSendAllState({ status: 'sending' })
    startTransition(async () => {
      try {
        const results = await triggerAllNewsletters()
        setSendAllState({ status: 'success', results })
      } catch (err) {
        setSendAllState({ status: 'error', error: err instanceof Error ? err.message : 'Unknown error' })
      }
    })
  }

  function handleTestSend(city: CityKey) {
    const email = testStates[city].email.trim()
    if (!email) return
    setTestStates(prev => ({ ...prev, [city]: { ...prev[city], status: 'sending' } }))
    startTransition(async () => {
      try {
        await sendTestNewsletter(city, email)
        setTestStates(prev => ({ ...prev, [city]: { ...prev[city], status: 'success' } }))
      } catch (err) {
        setTestStates(prev => ({
          ...prev,
          [city]: { ...prev[city], status: 'error', error: err instanceof Error ? err.message : 'Unknown error' },
        }))
      }
    })
  }

  // ── Configure handlers ──────────────────────────────────────────────────────

  function openPicker(target: PickerState['target'], city?: CityKey) {
    setPicker({ open: true, target, city, query: '', results: [], searching: false })
  }

  async function handlePickerSearch() {
    setPicker(p => ({ ...p, searching: true, results: [] }))
    const results = await searchArticles(picker.query)
    setPicker(p => ({ ...p, searching: false, results }))
  }

  function handlePickerSelect(article: ArticlePickerItem) {
    if (picker.target === 'featured' && picker.city) {
      setCityDrafts(prev => ({
        ...prev,
        [picker.city!]: {
          ...prev[picker.city!],
          featured_article_id: article.id,
          featured_article: article,
          isDirty: true,
        },
      }))
    } else if (picker.target === 'order' && picker.city) {
      setCityDrafts(prev => {
        const draft = prev[picker.city!]
        const current = draft.article_order_items
        if (current.find(a => a.id === article.id)) return prev // already in list
        const newItems = [...current, article]
        return {
          ...prev,
          [picker.city!]: {
            ...draft,
            article_order: newItems.map(a => a.id),
            article_order_items: newItems,
            isDirty: true,
          },
        }
      })
    } else if (picker.target === 'alberta') {
      setAlbertaDraft(prev => {
        if (prev.items.find(a => a.id === article.id)) return prev
        const newItems = [...prev.items, article]
        return { ids: newItems.map(a => a.id), items: newItems, isDirty: true }
      })
    }
    setPicker(p => ({ ...p, open: false, query: '', results: [] }))
  }

  function clearFeatured(city: CityKey) {
    setCityDrafts(prev => ({
      ...prev,
      [city]: { ...prev[city], featured_article_id: null, featured_article: null, isDirty: true },
    }))
  }

  function moveArticle(city: CityKey, idx: number, dir: -1 | 1) {
    setCityDrafts(prev => {
      const items = [...prev[city].article_order_items]
      const newIdx = idx + dir
      if (newIdx < 0 || newIdx >= items.length) return prev
      ;[items[idx], items[newIdx]] = [items[newIdx], items[idx]]
      return {
        ...prev,
        [city]: { ...prev[city], article_order: items.map(a => a.id), article_order_items: items, isDirty: true },
      }
    })
  }

  function removeArticle(city: CityKey, idx: number) {
    setCityDrafts(prev => {
      const items = prev[city].article_order_items.filter((_, i) => i !== idx)
      return {
        ...prev,
        [city]: {
          ...prev[city],
          article_order: items.length > 0 ? items.map(a => a.id) : null,
          article_order_items: items,
          isDirty: true,
        },
      }
    })
  }

  function resetOrder(city: CityKey) {
    setCityDrafts(prev => ({
      ...prev,
      [city]: { ...prev[city], article_order: null, article_order_items: [], isDirty: true },
    }))
  }

  function moveAlbertaArticle(idx: number, dir: -1 | 1) {
    setAlbertaDraft(prev => {
      const items = [...prev.items]
      const newIdx = idx + dir
      if (newIdx < 0 || newIdx >= items.length) return prev
      ;[items[idx], items[newIdx]] = [items[newIdx], items[idx]]
      return { ids: items.map(a => a.id), items, isDirty: true }
    })
  }

  function removeAlbertaArticle(idx: number) {
    setAlbertaDraft(prev => {
      const items = prev.items.filter((_, i) => i !== idx)
      return { ids: items.length > 0 ? items.map(a => a.id) : null, items, isDirty: true }
    })
  }

  function resetAlberta() {
    setAlbertaDraft({ ids: null, items: [], isDirty: true })
  }

  async function handleSaveConfig() {
    setSaving(true)
    setSaveSuccess(false)
    setSaveError(null)

    const cities: CityKey[] = ['edmonton', 'calgary', 'lethbridge']
    const errors: string[] = []

    for (const city of cities) {
      const draft = cityDrafts[city]
      if (!draft.isDirty) continue

      const r1 = await saveFeaturedArticle(city, draft.featured_article_id)
      if (r1.error) errors.push(`${city} featured: ${r1.error}`)

      const r2 = await saveArticleOrder(city, draft.article_order)
      if (r2.error) errors.push(`${city} order: ${r2.error}`)
    }

    if (albertaDraft.isDirty) {
      const r = await saveAlbertaArticles(albertaDraft.ids)
      if (r.error) errors.push(`Alberta: ${r.error}`)
    }

    setSaving(false)
    if (errors.length > 0) {
      setSaveError(errors.join(' · '))
    } else {
      setSaveSuccess(true)
      // Mark all as clean
      setCityDrafts(prev => {
        const updated = { ...prev }
        for (const city of cities) updated[city] = { ...updated[city], isDirty: false }
        return updated
      })
      setAlbertaDraft(prev => ({ ...prev, isDirty: false }))
      setTimeout(() => setSaveSuccess(false), 3000)
    }
  }

  const anyDirty =
    Object.values(cityDrafts).some(d => d.isDirty) || albertaDraft.isDirty

  // ── Render guards ───────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
      </div>
    )
  }
  if (!isAuthenticated) return null

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    } catch { return 'Invalid date' }
  }

  const shortDate = (dateString: string) => {
    try { return new Date(dateString).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' }) }
    catch { return '' }
  }

  const getCityLabel = (city: string) =>
    OTHER_CITY_LABELS[city] ??
    CITY_CONFIG[city as CityKey]?.label ??
    city.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

  const otherCities = Object.entries(OTHER_CITY_LABELS).filter(
    ([key]) => (stats?.byCity?.[key] ?? 0) > 0
  )
  const newsletterCityTotal = (['edmonton', 'calgary', 'lethbridge'] as CityKey[])
    .reduce((s, c) => s + (stats?.byCity?.[c] ?? 0), 0)
  const otherCityTotal = otherCities.reduce((s, [key]) => s + (stats?.byCity?.[key] ?? 0), 0)

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
    <div className="min-h-screen bg-background">
      <div className="p-6">

        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Newsletter</h1>
            <p className="text-muted-foreground">Manage subscribers and send newsletters</p>
          </div>
        </div>

        {/* ── SEND NOW ──────────────────────────────────────────────────────── */}
        <Card className="mb-6 border-2 border-dashed border-gray-200">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Send Newsletter Now
            </CardTitle>
            <CardDescription>
              Manually trigger a newsletter send for any city. Auto-sends daily at 7 AM Mountain Time.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3 mb-6">
              {(Object.entries(CITY_CONFIG) as [CityKey, typeof CITY_CONFIG[CityKey]][]).map(([city, cfg]) => {
                const state = sendStates[city]
                const test  = testStates[city]
                return (
                  <div key={city} className="border rounded-xl p-5 bg-white space-y-3">
                    <div>
                      <div className={`text-sm font-bold uppercase tracking-wide ${cfg.color}`}>{cfg.newsletter}</div>
                      <div className="text-lg font-semibold text-gray-900">{cfg.label}</div>
                      {stats && (
                        <div className="text-sm text-muted-foreground">
                          {stats.byCity?.[city] ?? 0} active subscribers
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1" onClick={() => setPreviewCity(city)}>
                        <Eye className="mr-2 h-4 w-4" /> Preview
                      </Button>
                      <Button
                        className={`flex-1 ${cfg.accent} hover:opacity-90 text-white`}
                        onClick={() => handleSendCity(city)}
                        disabled={state.status === 'sending' || isPending}
                      >
                        {state.status === 'sending'
                          ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending…</>
                          : <><Send className="mr-2 h-4 w-4" /> Send</>}
                      </Button>
                    </div>

                    <div>
                      {!test.open ? (
                        <button
                          className="text-xs text-muted-foreground hover:text-gray-700 flex items-center gap-1 underline underline-offset-2"
                          onClick={() => setTestStates(prev => ({ ...prev, [city]: { ...prev[city], open: true, status: 'idle' } }))}
                        >
                          <FlaskConical className="h-3 w-3" /> Send test to my email
                        </button>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <Input
                              type="email"
                              placeholder="your@email.com"
                              value={test.email}
                              onChange={e => setTestStates(prev => ({ ...prev, [city]: { ...prev[city], email: e.target.value, status: 'idle' } }))}
                              className="h-8 text-sm"
                              onKeyDown={e => e.key === 'Enter' && handleTestSend(city)}
                            />
                            <Button
                              size="sm" variant="outline" className="h-8 px-3 shrink-0"
                              onClick={() => handleTestSend(city)}
                              disabled={test.status === 'sending' || !test.email.trim()}
                            >
                              {test.status === 'sending' ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Send'}
                            </Button>
                            <button
                              className="h-8 w-8 flex items-center justify-center rounded hover:bg-gray-100 shrink-0"
                              onClick={() => setTestStates(prev => ({ ...prev, [city]: { open: false, email: '', status: 'idle' } }))}
                            >
                              <X className="h-4 w-4 text-gray-400" />
                            </button>
                          </div>
                          {test.status === 'success' && (
                            <p className="text-xs text-green-600 flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" /> Test sent to {test.email}
                            </p>
                          )}
                          {test.status === 'error' && (
                            <p className="text-xs text-red-600 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" /> {test.error}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {state.status === 'success' && state.result && (
                      <div className="flex items-start gap-2 text-sm text-green-700 bg-green-50 rounded-lg p-3">
                        <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" />
                        <div>
                          <div className="font-medium">Sent successfully</div>
                          <div className="text-green-600">
                            ✓ {state.result.sent} sent
                            {state.result.failed  > 0 && ` · ✗ ${state.result.failed} failed`}
                            {state.result.skipped > 0 && ` · ${state.result.skipped} skipped`}
                          </div>
                          {state.result.errors.length > 0 && (
                            <div className="text-xs text-red-500 mt-1">{state.result.errors[0]}</div>
                          )}
                        </div>
                      </div>
                    )}
                    {state.status === 'error' && (
                      <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 rounded-lg p-3">
                        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                        <div>
                          <div className="font-medium">Send failed</div>
                          <div className="text-red-600 text-xs">{state.error}</div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="border-t pt-4 flex items-center gap-4">
              <Button
                variant="outline"
                onClick={handleSendAll}
                disabled={sendAllState.status === 'sending' || isPending}
                className="min-w-[160px]"
              >
                {sendAllState.status === 'sending'
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending all…</>
                  : <><Mail className="mr-2 h-4 w-4" /> Send All Cities</>}
              </Button>
              {sendAllState.status === 'success' && sendAllState.results && (
                <div className="flex items-center gap-2 text-sm text-green-700">
                  <CheckCircle className="h-4 w-4" />
                  All sent — {sendAllState.results.reduce((s, r) => s + r.sent, 0)} emails delivered
                </div>
              )}
              {sendAllState.status === 'error' && (
                <div className="flex items-center gap-2 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4" /> {sendAllState.error}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── CONFIGURE CONTENT ──────────────────────────────────────────────── */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-gray-500" />
                <CardTitle>Configure Newsletter Content</CardTitle>
                {anyDirty && (
                  <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700">Unsaved changes</Badge>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={() => setConfigCollapsed(c => !c)}>
                {configCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </Button>
            </div>
            <CardDescription>
              Pick the top story, control article order, and curate the Alberta section for each newsletter.
            </CardDescription>
          </CardHeader>

          {!configCollapsed && (
            <CardContent className="space-y-6">

              {/* Per-city config columns */}
              <div className="grid gap-4 md:grid-cols-3">
                {(Object.entries(CITY_CONFIG) as [CityKey, typeof CITY_CONFIG[CityKey]][]).map(([city, cfg]) => {
                  const draft = cityDrafts[city]
                  return (
                    <div key={city} className={`border-2 rounded-xl p-4 space-y-4 ${cfg.border}`}>
                      <div>
                        <div className={`text-xs font-bold uppercase tracking-wide ${cfg.color}`}>{cfg.newsletter}</div>
                        <div className="font-semibold text-gray-900">{cfg.label}</div>
                      </div>

                      {/* Hero / Top Story */}
                      <div>
                        <div className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase mb-2">
                          <Star className="h-3 w-3" /> Top Story
                        </div>
                        {draft.featured_article ? (
                          <div className="bg-gray-50 rounded-lg p-2 mb-2">
                            <div className="text-xs font-medium text-gray-800 line-clamp-2 mb-1">
                              {draft.featured_article.title}
                            </div>
                            <div className="text-[10px] text-gray-400">
                              {draft.featured_article.location} · {shortDate(draft.featured_article.created_at)}
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-gray-400 italic mb-2">Auto — most recent article</div>
                        )}
                        <div className="flex gap-2">
                          <Button
                            size="sm" variant="outline" className="text-xs h-7 px-2"
                            onClick={() => openPicker('featured', city)}
                          >
                            {draft.featured_article ? 'Change' : 'Pick top story'}
                          </Button>
                          {draft.featured_article && (
                            <Button
                              size="sm" variant="ghost" className="text-xs h-7 px-2 text-red-500 hover:text-red-700"
                              onClick={() => clearFeatured(city)}
                            >
                              <X className="h-3 w-3 mr-1" /> Remove
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Article Order */}
                      <div>
                        <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Article Order</div>
                        {draft.article_order === null ? (
                          <div className="text-xs text-gray-400 italic mb-2">Auto — ordered by date</div>
                        ) : draft.article_order_items.length === 0 ? (
                          <div className="text-xs text-gray-400 italic mb-2">No articles added yet</div>
                        ) : (
                          <div className="space-y-1 mb-2">
                            {draft.article_order_items.map((art, idx) => (
                              <div key={art.id} className="flex items-center gap-1 bg-gray-50 rounded p-1.5">
                                <span className="text-[10px] text-gray-400 w-4 shrink-0">{idx + 1}.</span>
                                <span className="flex-1 text-xs text-gray-800 line-clamp-1">{art.title}</span>
                                <button
                                  className="p-0.5 hover:bg-gray-200 rounded disabled:opacity-30"
                                  onClick={() => moveArticle(city, idx, -1)}
                                  disabled={idx === 0}
                                ><ArrowUp className="h-3 w-3" /></button>
                                <button
                                  className="p-0.5 hover:bg-gray-200 rounded disabled:opacity-30"
                                  onClick={() => moveArticle(city, idx, 1)}
                                  disabled={idx === draft.article_order_items.length - 1}
                                ><ArrowDown className="h-3 w-3" /></button>
                                <button
                                  className="p-0.5 hover:bg-red-100 rounded text-red-400"
                                  onClick={() => removeArticle(city, idx)}
                                ><X className="h-3 w-3" /></button>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="flex gap-2 flex-wrap">
                          <Button
                            size="sm" variant="outline" className="text-xs h-7 px-2"
                            onClick={() => openPicker('order', city)}
                          >
                            + Add article
                          </Button>
                          {draft.article_order !== null && (
                            <Button
                              size="sm" variant="ghost" className="text-xs h-7 px-2 text-gray-500"
                              onClick={() => resetOrder(city)}
                            >
                              Reset to auto
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Alberta section — shared across all cities */}
              <div className="border-2 border-green-200 rounded-xl p-4 bg-green-50/30">
                <div className="flex items-center gap-2 mb-1">
                  <Leaf className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-bold text-green-700 uppercase tracking-wide">Across Alberta</span>
                  <Badge variant="secondary" className="text-[10px] bg-green-100 text-green-600">Shared across all newsletters</Badge>
                </div>
                <p className="text-xs text-gray-500 mb-3">
                  Appears in every city newsletter. Auto-fetches recent Alberta provincial articles — add specific ones below to always include them first.
                </p>

                {albertaDraft.ids === null ? (
                  <div className="text-xs text-gray-400 italic mb-3">Auto — most recent Alberta articles</div>
                ) : albertaDraft.items.length === 0 ? (
                  <div className="text-xs text-gray-400 italic mb-3">No articles pinned yet</div>
                ) : (
                  <div className="space-y-1 mb-3">
                    {albertaDraft.items.map((art, idx) => (
                      <div key={art.id} className="flex items-center gap-1 bg-white rounded p-1.5 border border-green-100">
                        <span className="text-[10px] text-gray-400 w-4 shrink-0">{idx + 1}.</span>
                        <span className="flex-1 text-xs text-gray-800 line-clamp-1">{art.title}</span>
                        <span className="text-[10px] text-gray-400 shrink-0">{art.location}</span>
                        <button
                          className="p-0.5 hover:bg-gray-100 rounded disabled:opacity-30"
                          onClick={() => moveAlbertaArticle(idx, -1)}
                          disabled={idx === 0}
                        ><ArrowUp className="h-3 w-3" /></button>
                        <button
                          className="p-0.5 hover:bg-gray-100 rounded disabled:opacity-30"
                          onClick={() => moveAlbertaArticle(idx, 1)}
                          disabled={idx === albertaDraft.items.length - 1}
                        ><ArrowDown className="h-3 w-3" /></button>
                        <button
                          className="p-0.5 hover:bg-red-100 rounded text-red-400"
                          onClick={() => removeAlbertaArticle(idx)}
                        ><X className="h-3 w-3" /></button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    size="sm" variant="outline" className="text-xs h-7 px-2 border-green-300 text-green-700 hover:bg-green-50"
                    onClick={() => openPicker('alberta')}
                  >
                    + Add Alberta article
                  </Button>
                  {albertaDraft.ids !== null && (
                    <Button
                      size="sm" variant="ghost" className="text-xs h-7 px-2 text-gray-500"
                      onClick={resetAlberta}
                    >
                      Reset to auto
                    </Button>
                  )}
                </div>
              </div>

              {/* Article picker panel */}
              {picker.open && (
                <div className="border-2 border-blue-200 rounded-xl p-4 bg-blue-50/20">
                  <div className="text-xs font-semibold text-blue-700 uppercase mb-3">
                    {picker.target === 'featured' ? `Pick Top Story — ${CITY_CONFIG[picker.city!]?.label}` :
                     picker.target === 'order'    ? `Add Article — ${CITY_CONFIG[picker.city!]?.label}` :
                     'Add Alberta Article'}
                  </div>
                  <div className="flex gap-2 mb-3">
                    <Input
                      placeholder="Search by title…"
                      value={picker.query}
                      onChange={e => setPicker(p => ({ ...p, query: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && handlePickerSearch()}
                      className="h-9 text-sm"
                      autoFocus
                    />
                    <Button size="sm" onClick={handlePickerSearch} disabled={picker.searching} className="h-9">
                      {picker.searching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
                    </Button>
                    <Button
                      size="sm" variant="ghost" className="h-9"
                      onClick={() => setPicker(p => ({ ...p, open: false, query: '', results: [] }))}
                    >
                      Cancel
                    </Button>
                  </div>

                  <div className="space-y-1 max-h-64 overflow-y-auto">
                    {picker.results.length > 0 ? picker.results.map(art => (
                      <div key={art.id} className="flex items-center justify-between p-2 hover:bg-white rounded-lg border border-transparent hover:border-gray-200 transition-colors">
                        <div className="flex-1 min-w-0 mr-3">
                          <div className="text-sm font-medium text-gray-900 line-clamp-1">{art.title}</div>
                          <div className="text-xs text-gray-400">
                            {art.location || 'No location'} · {shortDate(art.created_at)}
                          </div>
                        </div>
                        <Button
                          size="sm" variant="outline" className="text-xs h-7 px-3 shrink-0"
                          onClick={() => handlePickerSelect(art)}
                        >
                          Select
                        </Button>
                      </div>
                    )) : (
                      <div className="text-center text-sm text-gray-400 py-6">
                        {picker.searching
                          ? 'Searching…'
                          : picker.query
                          ? 'No articles found. Try a different search.'
                          : 'Type a title and press Search, or press Search to see recent articles.'}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Save row */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t">
                {saveSuccess && (
                  <span className="text-sm text-green-600 flex items-center gap-1">
                    <CheckCircle className="h-4 w-4" /> Saved successfully
                  </span>
                )}
                {saveError && (
                  <span className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" /> {saveError}
                  </span>
                )}
                <Button onClick={handleSaveConfig} disabled={saving || !anyDirty}>
                  {saving
                    ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…</>
                    : 'Save All Changes'}
                </Button>
              </div>

            </CardContent>
          )}
        </Card>

        {/* ── STATS ─────────────────────────────────────────────────────────── */}
        {stats && (
          <div className="mb-6 space-y-3">
            <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Mail className="h-4 w-4" /> Total
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.total}</div>
                  <p className="text-xs text-muted-foreground mt-1">All time</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Users className="h-4 w-4" /> Active
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{stats.active}</div>
                  <p className="text-xs text-muted-foreground mt-1">Subscribed</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <MapPin className="h-4 w-4" /> Edmonton
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{stats.byCity?.edmonton ?? 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">The Capital</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <MapPin className="h-4 w-4" /> Calgary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{stats.byCity?.calgary ?? 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">The Chinook</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <MapPin className="h-4 w-4" /> Lethbridge
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-amber-600">{stats.byCity?.lethbridge ?? 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">The Westerly</p>
                </CardContent>
              </Card>
            </div>

            {otherCityTotal > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Other cities — {otherCityTotal} active subscriber{otherCityTotal !== 1 ? 's' : ''}
                    {' '}
                    <span className="font-normal text-xs">
                      (not yet on a newsletter route — total across all cities: {newsletterCityTotal + otherCityTotal} = {stats.active} active ✓)
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-3">
                    {otherCities.map(([key, label]) => (
                      <div key={key} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                        <MapPin className="h-3.5 w-3.5 text-gray-400" />
                        <span className="text-sm font-medium">{label}</span>
                        <span className="text-sm text-muted-foreground">{stats.byCity[key]}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ── SUBSCRIBER LIST ───────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>All Subscriptions</CardTitle>
            <CardDescription>{subscriptions.length} total subscriptions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {subscriptions.length > 0 ? (
                <>
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-medium mb-3">Active subscribers (Email | City)</h3>
                    <div className="space-y-2">
                      {subscriptions
                        .filter(sub => sub.status === 'active')
                        .map((sub) => (
                          <div key={sub.id} className="font-mono text-sm bg-white p-2 rounded border">
                            {sub.email} | {getCityLabel(sub.city)}
                          </div>
                        ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    {subscriptions.map((sub) => (
                      <div key={sub.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{sub.email}</span>
                            <Badge variant={sub.status === 'active' ? 'default' : 'secondary'}>
                              {sub.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {getCityLabel(sub.city)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {sub.created_at ? formatDate(sub.created_at) : 'Unknown date'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <Mail className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                  <p>No newsletter subscriptions yet</p>
                  <p className="text-sm">Subscriptions will appear here once users sign up</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>

    {/* ── PREVIEW MODAL ───────────────────────────────────────────────────── */}
    {previewCity && (
      <div className="fixed inset-0 z-50 flex flex-col bg-black/60" onClick={() => setPreviewCity(null)}>
        <div
          className="flex flex-col w-full h-full max-w-3xl mx-auto my-6 bg-white rounded-xl overflow-hidden shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-5 py-3 border-b bg-gray-50 shrink-0">
            <div>
              <span className="font-semibold text-gray-900">{CITY_CONFIG[previewCity].newsletter} Preview</span>
              <span className="ml-2 text-sm text-gray-400">— {CITY_CONFIG[previewCity].label}</span>
            </div>
            <div className="flex items-center gap-3">
              <a
                href={`/api/newsletter/preview?city=${previewCity}`}
                target="_blank" rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline"
              >
                Open in new tab ↗
              </a>
              <button onClick={() => setPreviewCity(null)} className="p-1 rounded hover:bg-gray-200 transition-colors">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-hidden bg-gray-100">
            <iframe
              key={previewCity}
              src={`/api/newsletter/preview?city=${previewCity}`}
              className="w-full h-full border-0"
              title={`${CITY_CONFIG[previewCity].newsletter} newsletter preview`}
            />
          </div>
        </div>
      </div>
    )}
    </>
  )
}
