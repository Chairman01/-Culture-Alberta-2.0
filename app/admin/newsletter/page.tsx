"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  getAllNewsletterSubscriptions, getNewsletterStats,
  getEmailEvents, checkEmailEventsTable, computeCampaignStats, computeSubscriberEngagement,
  type CampaignStat, type SubscriberEngagement,
} from "@/lib/newsletter"
import { triggerCityNewsletter, triggerAllNewsletters, sendTestNewsletter } from "./_actions"
import {
  loadAllConfigs,
  saveFeaturedArticle,
  saveArticleOrder,
  saveAlbertaArticles,
  searchArticles,
  getArticleDetails,
  loadCurrentCityArticles,
  loadCurrentAlbertaArticles,
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
  BarChart2, MousePointerClick, Copy, Check, Filter, AlertTriangle,
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

type CityKey = 'edmonton' | 'calgary' | 'lethbridge' | 'medicine-hat'

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
  edmonton:       { label: 'Edmonton',     newsletter: 'The Capital',  color: 'text-blue-600',   accent: 'bg-blue-600',   border: 'border-blue-200'   },
  calgary:        { label: 'Calgary',      newsletter: 'The Chinook',  color: 'text-red-600',    accent: 'bg-red-600',    border: 'border-red-200'    },
  lethbridge:     { label: 'Lethbridge',   newsletter: 'The Westerly', color: 'text-amber-600',  accent: 'bg-amber-600',  border: 'border-amber-200'  },
  'medicine-hat': { label: 'Medicine Hat', newsletter: 'The Hat',      color: 'text-orange-700', accent: 'bg-orange-700', border: 'border-orange-200' },
}

const OTHER_CITY_LABELS: Record<string, string> = {
  'red-deer':       'Red Deer',
  'grande-prairie': 'Grande Prairie',
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
  const [previewTimestamp, setPreviewTimestamp] = useState(0)
  const [loadingCurrent, setLoadingCurrent] = useState<Record<CityKey | 'alberta', boolean>>({
    edmonton: false, calgary: false, lethbridge: false, 'medicine-hat': false, alberta: false,
  })

  // Send states
  const [sendStates, setSendStates] = useState<Record<CityKey, SendState>>({
    edmonton:       { status: 'idle' },
    calgary:        { status: 'idle' },
    lethbridge:     { status: 'idle' },
    'medicine-hat': { status: 'idle' },
  })
  const [testStates, setTestStates] = useState<Record<CityKey, TestState>>({
    edmonton:       { open: false, email: '', status: 'idle' },
    calgary:        { open: false, email: '', status: 'idle' },
    lethbridge:     { open: false, email: '', status: 'idle' },
    'medicine-hat': { open: false, email: '', status: 'idle' },
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
    edmonton:       emptyDraft(),
    calgary:        emptyDraft(),
    lethbridge:     emptyDraft(),
    'medicine-hat': emptyDraft(),
  })
  const [albertaDraft, setAlbertaDraft] = useState<AlbertaDraft>({ ids: null, items: [], isDirty: false })
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Picker
  const [picker, setPicker] = useState<PickerState>({
    open: false, target: 'featured', query: '', results: [], searching: false,
  })

  // Engagement & subscriber filter state
  const [campaigns, setCampaigns] = useState<CampaignStat[]>([])
  const [engagement, setEngagement] = useState<Record<string, SubscriberEngagement>>({})
  const [cityFilter, setCityFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'unsubscribed'>('active')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [updatingEmail, setUpdatingEmail] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'subscribers' | 'campaigns'>('subscribers')
  const [emailEventsTableMissing, setEmailEventsTableMissing] = useState(false)
  const [lastSentAt, setLastSentAt] = useState<Record<CityKey, string | null>>({
    edmonton: null, calgary: null, lethbridge: null, 'medicine-hat': null,
  })

  // ── Load on mount ───────────────────────────────────────────────────────────

  useEffect(() => {
    const adminAuthenticated = localStorage.getItem("admin_authenticated")
    setIsAuthenticated(adminAuthenticated === "true")
    if (!adminAuthenticated) { router.push("/admin/login"); return }

    const loadData = async () => {
      try {
        const [subscriptionsData, statsData, configData, eventsData, tableExists] = await Promise.all([
          getAllNewsletterSubscriptions(),
          getNewsletterStats(),
          loadAllConfigs(),
          getEmailEvents(),
          checkEmailEventsTable(),
        ])
        setSubscriptions(subscriptionsData)
        setStats(statsData)
        setCampaigns(computeCampaignStats(eventsData))
        setEngagement(computeSubscriberEngagement(eventsData))
        setEmailEventsTableMissing(!tableExists)

        // Hydrate city drafts + extract last_sent_at
        const cities: CityKey[] = ['edmonton', 'calgary', 'lethbridge', 'medicine-hat']
        const sentAt: Record<CityKey, string | null> = { edmonton: null, calgary: null, lethbridge: null, 'medicine-hat': null }
        for (const city of cities) sentAt[city] = configData[city]?.last_sent_at ?? null
        setLastSentAt(sentAt)
        const newDrafts: Record<CityKey, CityConfigDraft> = {
          edmonton: emptyDraft(), calgary: emptyDraft(), lethbridge: emptyDraft(), 'medicine-hat': emptyDraft(),
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
        if (result.sent > 0) {
          setLastSentAt(prev => ({ ...prev, [city]: new Date().toISOString() }))
        }
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

  async function openPicker(target: PickerState['target'], city?: CityKey) {
    // Open immediately and auto-load recent articles
    setPicker({ open: true, target, city, query: '', results: [], searching: true })
    const results = await searchArticles('')
    setPicker(p => ({ ...p, searching: false, results }))
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

  async function loadCurrentArticlesForCity(city: CityKey) {
    setLoadingCurrent(prev => ({ ...prev, [city]: true }))
    const articles = await loadCurrentCityArticles(city)
    setCityDrafts(prev => ({
      ...prev,
      [city]: {
        ...prev[city],
        article_order: articles.map(a => a.id),
        article_order_items: articles,
        isDirty: true,
      },
    }))
    setLoadingCurrent(prev => ({ ...prev, [city]: false }))
  }

  async function loadCurrentAlberta() {
    setLoadingCurrent(prev => ({ ...prev, alberta: true }))
    const articles = await loadCurrentAlbertaArticles()
    setAlbertaDraft({ ids: articles.map(a => a.id), items: articles, isDirty: true })
    setLoadingCurrent(prev => ({ ...prev, alberta: false }))
  }

  async function handleSaveConfig(thenPreviewCity?: CityKey) {
    setSaving(true)
    setSaveSuccess(false)
    setSaveError(null)

    const cities: CityKey[] = ['edmonton', 'calgary', 'lethbridge', 'medicine-hat']
    const errors: string[] = []

    for (const city of cities) {
      const draft = cityDrafts[city]
      // Always force-save the city being previewed, even when not marked dirty.
      // This ensures "Save & Preview Edmonton" always writes the current draft to DB.
      if (!draft.isDirty && city !== thenPreviewCity) continue

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
      setCityDrafts(prev => {
        const updated = { ...prev }
        for (const city of cities) updated[city] = { ...updated[city], isDirty: false }
        return updated
      })
      setAlbertaDraft(prev => ({ ...prev, isDirty: false }))
      setTimeout(() => setSaveSuccess(false), 3000)
    }

    // Always open preview when requested — even if there were save errors,
    // show what the newsletter looks like with current DB state.
    if (thenPreviewCity) {
      setPreviewTimestamp(Date.now())
      setPreviewCity(thenPreviewCity)
    }
  }

  const anyDirty =
    Object.values(cityDrafts).some(d => d.isDirty) || albertaDraft.isDirty

  // ── Subscriber management helpers ────────────────────────────────────────────

  async function toggleStatus(sub: NewsletterSubscription) {
    const newStatus = sub.status === 'active' ? 'unsubscribed' : 'active'
    setUpdatingEmail(sub.email)
    try {
      const res = await fetch('/api/newsletter', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: sub.email, status: newStatus }),
      })
      if (res.ok) {
        setSubscriptions(prev => prev.map(s => s.email === sub.email ? { ...s, status: newStatus } : s))
        const newStats = await getNewsletterStats()
        setStats(newStats)
      }
    } catch (err) {
      console.error('Failed to update subscription:', err)
    } finally {
      setUpdatingEmail(null)
    }
  }

  async function copyToClipboard(text: string, id: string) {
    await navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const CITY_FILTERS = [
    { value: 'all', label: 'All Cities' },
    { value: 'edmonton', label: 'Edmonton' },
    { value: 'calgary', label: 'Calgary' },
    { value: 'medicine-hat', label: 'Medicine Hat' },
    { value: 'lethbridge', label: 'Lethbridge' },
    { value: 'red-deer', label: 'Red Deer' },
    { value: 'grande-prairie', label: 'Grande Prairie' },
    { value: 'other-alberta', label: 'Other Alberta' },
    { value: 'outside-alberta', label: 'Outside Alberta' },
    { value: 'other', label: 'Other' },
  ]

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

  // Returns true if the city was sent within the current calendar day (Mountain Time)
  const wasSentToday = (city: CityKey): boolean => {
    const t = lastSentAt[city]
    if (!t) return false
    const sent = new Date(t)
    const now = new Date()
    const todayMT = now.toLocaleDateString('en-CA', { timeZone: 'America/Edmonton' })
    const sentMT  = sent.toLocaleDateString('en-CA', { timeZone: 'America/Edmonton' })
    return todayMT === sentMT
  }

  const sentTimeLabel = (city: CityKey): string => {
    const t = lastSentAt[city]
    if (!t) return ''
    return new Date(t).toLocaleTimeString('en-US', {
      hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/Edmonton',
    })
  }

  const otherCities = Object.entries(OTHER_CITY_LABELS).filter(
    ([key]) => (stats?.byCity?.[key] ?? 0) > 0
  )
  const newsletterCityTotal = (['edmonton', 'calgary', 'lethbridge', 'medicine-hat'] as CityKey[])
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
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
              {(Object.entries(CITY_CONFIG) as [CityKey, typeof CITY_CONFIG[CityKey]][]).map(([city, cfg]) => {
                const state = sendStates[city]
                const test  = testStates[city]
                return (
                  <div key={city} className={`border rounded-xl p-5 bg-white space-y-3 ${wasSentToday(city) ? 'border-green-300 bg-green-50/30' : ''}`}>
                    <div>
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className={`text-sm font-bold uppercase tracking-wide ${cfg.color}`}>{cfg.newsletter}</div>
                        {wasSentToday(city) && (
                          <span className="flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 border border-green-300 rounded-full px-2 py-0.5">
                            <CheckCircle className="h-3 w-3" /> Sent today {sentTimeLabel(city)}
                          </span>
                        )}
                      </div>
                      <div className="text-lg font-semibold text-gray-900">{cfg.label}</div>
                      {stats && (
                        <div className="text-sm text-muted-foreground">
                          {stats.byCity?.[city] ?? 0} active subscribers
                        </div>
                      )}
                    </div>

                    {wasSentToday(city) && state.status === 'idle' && (
                      <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        Already sent today — sending again will duplicate for subscribers
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1" onClick={() => handleSaveConfig(city)} disabled={saving}>
                        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Eye className="mr-2 h-4 w-4" />} Preview
                      </Button>
                      <Button
                        className={`flex-1 ${wasSentToday(city) ? 'bg-gray-400 hover:bg-gray-500' : cfg.accent + ' hover:opacity-90'} text-white`}
                        onClick={() => handleSendCity(city)}
                        disabled={state.status === 'sending' || isPending}
                      >
                        {state.status === 'sending'
                          ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending…</>
                          : wasSentToday(city)
                          ? <><Send className="mr-2 h-4 w-4" /> Send Again</>
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
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
                        <div className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase mb-1">
                          <Star className="h-3 w-3" /> Hero Story
                        </div>
                        <p className="text-[11px] text-gray-400 mb-2">The big article shown at the top of the email.</p>
                        {draft.featured_article ? (
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 mb-2">
                            <div className="text-xs font-medium text-gray-800 line-clamp-2 mb-1">
                              {draft.featured_article.title}
                            </div>
                            <div className="text-[10px] text-gray-400">
                              {draft.featured_article.location} · {shortDate(draft.featured_article.created_at)}
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-gray-400 italic mb-2">Using most recent article automatically</div>
                        )}
                        <div className="flex gap-2">
                          <Button
                            size="sm" variant="outline" className="text-xs h-7 px-2"
                            onClick={() => openPicker('featured', city)}
                          >
                            {draft.featured_article ? 'Change hero story' : '+ Pick hero story'}
                          </Button>
                          {draft.featured_article && (
                            <Button
                              size="sm" variant="ghost" className="text-xs h-7 px-2 text-red-500 hover:text-red-700"
                              onClick={() => clearFeatured(city)}
                            >
                              <X className="h-3 w-3 mr-1" /> Clear
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Article List */}
                      <div>
                        <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Articles in Email</div>
                        <p className="text-[11px] text-gray-400 mb-2">
                          Choose which articles appear below the hero story, in the order you set. Leave empty to use the latest articles automatically.
                        </p>
                        {draft.article_order === null || draft.article_order_items.length === 0 ? (
                          <div className="mb-2">
                            <div className="text-xs text-gray-400 italic mb-2">Using latest articles automatically</div>
                            <Button
                              size="sm" variant="outline" className="text-xs h-7 px-2 w-full border-dashed"
                              onClick={() => loadCurrentArticlesForCity(city)}
                              disabled={loadingCurrent[city]}
                            >
                              {loadingCurrent[city]
                                ? <><Loader2 className="h-3 w-3 animate-spin mr-1" /> Loading…</>
                                : '📋 Load current articles to edit & reorder'}
                            </Button>
                          </div>
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
                                  title="Move up"
                                ><ArrowUp className="h-3 w-3" /></button>
                                <button
                                  className="p-0.5 hover:bg-gray-200 rounded disabled:opacity-30"
                                  onClick={() => moveArticle(city, idx, 1)}
                                  disabled={idx === draft.article_order_items.length - 1}
                                  title="Move down"
                                ><ArrowDown className="h-3 w-3" /></button>
                                <button
                                  className="p-0.5 hover:bg-red-100 rounded text-red-400"
                                  onClick={() => removeArticle(city, idx)}
                                  title="Remove"
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
                          {draft.article_order !== null && draft.article_order_items.length > 0 && (
                            <Button
                              size="sm" variant="ghost" className="text-xs h-7 px-2 text-gray-500"
                              onClick={() => resetOrder(city)}
                            >
                              Clear all (use auto)
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
                  This section appears in <strong>all three city newsletters</strong>. It automatically pulls recent Alberta-wide news. Pin specific articles below and they will always appear first, with auto-fetched articles filling in after.
                </p>

                {albertaDraft.ids === null || albertaDraft.items.length === 0 ? (
                  <div className="mb-3">
                    <div className="text-xs text-gray-400 italic mb-2">Using latest Alberta articles automatically (3 articles)</div>
                    <Button
                      size="sm" variant="outline" className="text-xs h-7 px-2 w-full border-dashed border-green-300 text-green-700 hover:bg-green-50"
                      onClick={loadCurrentAlberta}
                      disabled={loadingCurrent.alberta}
                    >
                      {loadingCurrent.alberta
                        ? <><Loader2 className="h-3 w-3 animate-spin mr-1" /> Loading…</>
                        : '📋 Load current Alberta articles to edit & remove'}
                    </Button>
                  </div>
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
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-sm font-semibold text-blue-800">
                        {picker.target === 'featured' ? `Choose Hero Story — ${CITY_CONFIG[picker.city!]?.label}` :
                         picker.target === 'order'    ? `Add Article — ${CITY_CONFIG[picker.city!]?.label}` :
                         'Add Alberta Article'}
                      </div>
                      <div className="text-xs text-blue-600 mt-0.5">
                        {picker.searching && picker.results.length === 0
                          ? 'Loading recent articles…'
                          : `${picker.results.length} articles shown — search to filter`}
                      </div>
                    </div>
                    <Button
                      size="sm" variant="ghost" className="h-8 text-gray-500"
                      onClick={() => setPicker(p => ({ ...p, open: false, query: '', results: [] }))}
                    >
                      <X className="h-4 w-4 mr-1" /> Close
                    </Button>
                  </div>

                  <div className="flex gap-2 mb-3">
                    <Input
                      placeholder="Filter by title…"
                      value={picker.query}
                      onChange={e => setPicker(p => ({ ...p, query: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && handlePickerSearch()}
                      className="h-9 text-sm"
                      autoFocus
                    />
                    <Button size="sm" onClick={handlePickerSearch} disabled={picker.searching} className="h-9">
                      {picker.searching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
                    </Button>
                  </div>

                  <div className="space-y-1 max-h-72 overflow-y-auto">
                    {picker.searching && picker.results.length === 0 ? (
                      <div className="text-center text-sm text-gray-400 py-8">
                        <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-blue-400" />
                        Loading articles…
                      </div>
                    ) : picker.results.length > 0 ? picker.results.map(art => (
                      <div key={art.id} className="flex items-center justify-between p-2.5 hover:bg-white rounded-lg border border-transparent hover:border-gray-200 transition-colors cursor-pointer group">
                        <div className="flex-1 min-w-0 mr-3">
                          <div className="text-sm font-medium text-gray-900 line-clamp-1">{art.title}</div>
                          <div className="text-xs text-gray-400">
                            {art.location || 'No location'} · {shortDate(art.created_at)}
                          </div>
                        </div>
                        <Button
                          size="sm" variant="outline" className="text-xs h-7 px-3 shrink-0 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-colors"
                          onClick={() => handlePickerSelect(art)}
                        >
                          Add
                        </Button>
                      </div>
                    )) : (
                      <div className="text-center text-sm text-gray-400 py-6">
                        No articles found. Try a different search term.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Save row */}
              <div className="flex items-center justify-between gap-3 pt-4 border-t bg-gray-50 -mx-6 -mb-6 px-6 py-4 rounded-b-xl">
                <p className="text-xs text-gray-500">
                  {anyDirty
                    ? '⚠️ You have unsaved changes — save to apply them, then preview to see how the email looks.'
                    : 'All changes saved. Use Preview buttons above to check how each newsletter looks.'}
                </p>
                <div className="flex items-center gap-3 shrink-0 flex-wrap justify-end">
                  {saveSuccess && (
                    <span className="text-sm text-green-600 flex items-center gap-1">
                      <CheckCircle className="h-4 w-4" /> Saved!
                    </span>
                  )}
                  {saveError && (
                    <span className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" /> {saveError}
                    </span>
                  )}
                  {/* Save & Preview per city */}
                  {(Object.keys(CITY_CONFIG) as CityKey[]).map(city => (
                    <Button
                      key={city}
                      variant="outline"
                      onClick={() => handleSaveConfig(city)}
                      disabled={saving}
                      className="text-xs h-8 px-3"
                    >
                      {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Eye className="h-3 w-3 mr-1" />}
                      Save & Preview {CITY_CONFIG[city].label}
                    </Button>
                  ))}
                  <Button
                    onClick={() => handleSaveConfig()}
                    disabled={saving || !anyDirty}
                    className={anyDirty ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}
                  >
                    {saving
                      ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…</>
                      : 'Save All Changes'}
                  </Button>
                </div>
              </div>

            </CardContent>
          )}
        </Card>

        {/* ── STATS ─────────────────────────────────────────────────────────── */}
        {stats && (
          <div className="mb-6 space-y-3">
            <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
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

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <MapPin className="h-4 w-4" /> Medicine Hat
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-700">{stats.byCity?.['medicine-hat'] ?? 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">The Hat</p>
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
                      (no newsletter yet — total across all cities: {newsletterCityTotal + otherCityTotal} = {stats.active} active ✓)
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

        {/* ── SUBSCRIBERS / CAMPAIGNS TABS ─────────────────────────────────── */}
        <div className="flex gap-1 mb-4 border-b">
          <button
            onClick={() => setActiveTab('subscribers')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'subscribers' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            <Users className="inline h-4 w-4 mr-1.5" />Subscribers
          </button>
          <button
            onClick={() => setActiveTab('campaigns')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'campaigns' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            <BarChart2 className="inline h-4 w-4 mr-1.5" />Campaigns
            {campaigns.length > 0 && <span className="ml-1.5 bg-muted text-muted-foreground text-xs rounded-full px-1.5 py-0.5">{campaigns.length}</span>}
          </button>
        </div>

        {activeTab === 'subscribers' && (
          <>
            {/* City + Status filters */}
            <Card className="mb-4">
              <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Filter className="h-4 w-4" />Filters</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">City</label>
                    <div className="flex flex-wrap gap-1">
                      {CITY_FILTERS.map(c => (
                        <button key={c.value} onClick={() => setCityFilter(c.value)}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${cityFilter === c.value ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80 text-muted-foreground'}`}>
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Status</label>
                    <div className="flex gap-1">
                      {(['all', 'active', 'unsubscribed'] as const).map(s => (
                        <button key={s} onClick={() => setStatusFilter(s)}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${statusFilter === s ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80 text-muted-foreground'}`}>
                          {s.charAt(0).toUpperCase() + s.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Subscriber list */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{cityFilter === 'all' ? 'All Subscriptions' : `${CITY_FILTERS.find(c=>c.value===cityFilter)?.label} Subscriptions`}</CardTitle>
                    <CardDescription>
                      {subscriptions.filter(s => (cityFilter==='all'||s.city===cityFilter) && (statusFilter==='all'||s.status===statusFilter)).length} matching
                    </CardDescription>
                  </div>
                  {(() => {
                    const activeFiltered = subscriptions.filter(s => (cityFilter==='all'||s.city===cityFilter) && s.status==='active')
                    const copyText = activeFiltered.map(s => `${s.email} | ${getCityLabel(s.city)}`).join('\n')
                    return activeFiltered.length > 0 ? (
                      <Button variant="outline" size="sm" onClick={() => copyToClipboard(copyText, 'bulk')} className="flex items-center gap-2">
                        {copiedId === 'bulk' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                        Copy {activeFiltered.length} emails
                      </Button>
                    ) : null
                  })()}
                </div>
              </CardHeader>
              <CardContent>
                {(() => {
                  const filtered = subscriptions.filter(s => (cityFilter==='all'||s.city===cityFilter) && (statusFilter==='all'||s.status===statusFilter))
                  const activeFiltered = filtered.filter(s => s.status==='active')
                  return filtered.length > 0 ? (
                    <>
                      {activeFiltered.length > 0 && (
                        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                          <h3 className="font-medium mb-2 text-sm">Active — {cityFilter==='all'?'All Cities':CITY_FILTERS.find(c=>c.value===cityFilter)?.label} (Email | City)</h3>
                          <div className="space-y-1 max-h-40 overflow-y-auto">
                            {activeFiltered.map(sub => (
                              <div key={sub.id} onClick={() => copyToClipboard(`${sub.email} | ${getCityLabel(sub.city)}`, sub.id||sub.email)}
                                className="font-mono text-xs bg-white p-2 rounded border flex items-center justify-between gap-2 cursor-pointer hover:bg-blue-50 transition-colors">
                                <span>{sub.email} | {getCityLabel(sub.city)}</span>
                                {copiedId===(sub.id||sub.email) ? <Check className="h-3 w-3 text-green-500 flex-shrink-0" /> : <Copy className="h-3 w-3 text-gray-400 flex-shrink-0" />}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="space-y-2">
                        {filtered.map(sub => {
                          const eng = engagement[sub.email]
                          return (
                            <div key={sub.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                  <span className="font-medium text-sm truncate">{sub.email}</span>
                                  <Badge variant={sub.status==='active'?'default':'secondary'} className="text-xs">{sub.status}</Badge>
                                  {eng?.total_opens > 0 && <span className="inline-flex items-center gap-1 text-xs text-blue-600 bg-blue-50 rounded-full px-2 py-0.5"><Eye className="h-3 w-3" />{eng.total_opens}</span>}
                                  {eng?.total_clicks > 0 && <span className="inline-flex items-center gap-1 text-xs text-purple-600 bg-purple-50 rounded-full px-2 py-0.5"><MousePointerClick className="h-3 w-3" />{eng.total_clicks}</span>}
                                  {eng?.bounced && <span className="inline-flex items-center gap-1 text-xs text-red-600 bg-red-50 rounded-full px-2 py-0.5"><AlertTriangle className="h-3 w-3" />bounced</span>}
                                </div>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{getCityLabel(sub.city)}</span>
                                  {sub.created_at && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDate(sub.created_at)}</span>}
                                  {eng?.last_opened && <span className="text-blue-500">opened {shortDate(eng.last_opened)}</span>}
                                </div>
                              </div>
                              <Button variant="outline" size="sm" className="text-xs h-7 ml-2 flex-shrink-0"
                                disabled={updatingEmail===sub.email} onClick={() => toggleStatus(sub)}>
                                {updatingEmail===sub.email ? '…' : sub.status==='active' ? 'Unsubscribe' : 'Resubscribe'}
                              </Button>
                            </div>
                          )
                        })}
                      </div>
                    </>
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      <Mail className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                      <p>No subscribers match this filter</p>
                    </div>
                  )
                })()}
              </CardContent>
            </Card>
          </>
        )}

        {activeTab === 'campaigns' && (
          <Card>
            <CardHeader>
              <CardTitle>Campaign Performance</CardTitle>
              <CardDescription>Open and click rates per send — powered by Resend webhook</CardDescription>
            </CardHeader>
            <CardContent>
              {emailEventsTableMissing && (
                <div className="mb-5 p-4 bg-amber-50 border border-amber-300 rounded-xl">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-amber-800 mb-1">One-time setup required: create the tracking table</div>
                      <p className="text-sm text-amber-700 mb-3">
                        The <code className="bg-amber-100 px-1 rounded">newsletter_email_events</code> table doesn't exist in Supabase yet.
                        Campaign open/click data cannot be stored until you run this SQL in the Supabase SQL editor.
                      </p>
                      <div className="bg-white border border-amber-200 rounded-lg p-3 font-mono text-xs text-gray-700 mb-3 overflow-auto">
                        <div>CREATE TABLE IF NOT EXISTS newsletter_email_events (</div>
                        <div>&nbsp;&nbsp;id&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;UUID DEFAULT gen_random_uuid() PRIMARY KEY,</div>
                        <div>&nbsp;&nbsp;email&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;VARCHAR(255) NOT NULL,</div>
                        <div>&nbsp;&nbsp;event_type&nbsp;VARCHAR(50) NOT NULL,</div>
                        <div>&nbsp;&nbsp;email_id&nbsp;&nbsp;&nbsp;VARCHAR(255),</div>
                        <div>&nbsp;&nbsp;subject&nbsp;&nbsp;&nbsp;&nbsp;VARCHAR(500),</div>
                        <div>&nbsp;&nbsp;clicked_url TEXT,</div>
                        <div>&nbsp;&nbsp;created_at&nbsp;TIMESTAMP WITH TIME ZONE DEFAULT NOW()</div>
                        <div>);</div>
                      </div>
                      <p className="text-xs text-amber-600">
                        Full SQL is in <strong>supabase-email-events-table.sql</strong> in your project root.
                        After creating the table, the next newsletter send will start recording data here automatically.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {campaigns.length > 0 ? (
                <div className="space-y-3">
                  {campaigns.map((c, i) => (
                    <div key={i} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div>
                          <div className="font-medium text-sm">{c.subject}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">Sent {shortDate(c.sent_at)}</div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          {c.bounced > 0 && <span className="text-xs text-red-600 bg-red-50 rounded-full px-2 py-0.5">{c.bounced} bounced</span>}
                          {c.complained > 0 && <span className="text-xs text-orange-600 bg-orange-50 rounded-full px-2 py-0.5">{c.complained} spam</span>}
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-3 mb-3">
                        <div className="text-center"><div className="text-lg font-bold text-gray-700">{c.delivered}</div><div className="text-xs text-muted-foreground">Delivered</div></div>
                        <div className="text-center"><div className="text-lg font-bold text-blue-600">{c.opened}</div><div className="text-xs text-muted-foreground">Opened</div></div>
                        <div className="text-center"><div className="text-lg font-bold text-blue-700">{c.open_rate}%</div><div className="text-xs text-muted-foreground">Open Rate</div></div>
                        <div className="text-center"><div className="text-lg font-bold text-purple-600">{c.click_rate}%</div><div className="text-xs text-muted-foreground">Click Rate</div></div>
                      </div>
                      <div className="space-y-1.5">
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-blue-500 rounded-full" style={{width:`${Math.min(c.open_rate,100)}%`}} /></div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-purple-500 rounded-full" style={{width:`${Math.min(c.click_rate,100)}%`}} /></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-12">
                  <BarChart2 className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="font-medium mb-1">
                    {emailEventsTableMissing ? 'Tracking table not set up yet' : 'No campaign data yet'}
                  </p>
                  <p className="text-sm max-w-sm mx-auto">
                    {emailEventsTableMissing
                      ? 'Create the tracking table using the SQL above, then send a newsletter to start seeing data here.'
                      : 'Data will appear here automatically after the next newsletter send — the Resend webhook is active and ready.'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
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
              key={`${previewCity}-${previewTimestamp}`}
              src={`/api/newsletter/preview?city=${previewCity}&t=${previewTimestamp}`}
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
