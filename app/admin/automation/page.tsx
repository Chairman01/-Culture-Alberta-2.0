"use client"

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  CheckCircle,
  XCircle,
  Loader2,
  Zap,
  Edit,
  Trash2,
  RefreshCw,
  Eye,
  Wifi,
  WifiOff,
  AlertTriangle,
  CalendarDays,
  CloudSun,
  BriefcaseBusiness,
} from 'lucide-react'

const EVENT_CITIES = [
  { value: 'all', label: 'All 7 Cities' },
  { value: 'calgary', label: 'Calgary' },
  { value: 'edmonton', label: 'Edmonton' },
  { value: 'red-deer', label: 'Red Deer' },
  { value: 'lethbridge', label: 'Lethbridge' },
  { value: 'medicine-hat', label: 'Medicine Hat' },
  { value: 'grande-prairie', label: 'Grande Prairie' },
  { value: 'fort-mcmurray', label: 'Fort McMurray' },
]

// Jobs data only exists for Calgary + Edmonton (see lib/jobs.ts JOB_CITIES)
const JOB_CITIES = [
  { value: 'all', label: 'Calgary + Edmonton' },
  { value: 'calgary', label: 'Calgary' },
  { value: 'edmonton', label: 'Edmonton' },
]

interface DraftArticle {
  id: string
  title: string
  excerpt: string
  slug: string
  location: string
  category: string
  tags: string[]
  image_url: string | null
  created_at: string
}

interface AutomationResult {
  success: boolean
  city?: string
  cityLabel: string
  title?: string
  articleSlug?: string
  eventsFound?: number
  eventsUsed?: number
  jobsFound?: number
  jobsUsed?: number
  citiesCovered?: number
  error?: string
}

interface AutomationResponse {
  success: boolean
  publishStatus: string
  results: AutomationResult[]
  summary: { attempted: number; succeeded: number; failed: number }
}

type ActionState = 'idle' | 'publishing' | 'deleting' | 'done'
type SaveAs = 'draft' | 'published'

/** What kind of auto article a draft is, derived from its tags. */
function draftKind(tags: string[] | null): { label: string; className: string } {
  const t = (tags || []).map(x => x.toLowerCase())
  if (t.includes('weather')) return { label: 'Weather', className: 'bg-sky-100 text-sky-700' }
  if (t.includes('jobs')) return { label: 'Jobs', className: 'bg-amber-100 text-amber-800' }
  return { label: 'Events', className: 'bg-blue-100 text-blue-700' }
}

function resultDetail(r: AutomationResult): string {
  if (r.eventsUsed !== undefined && r.eventsUsed > 0) return ` (${r.eventsUsed} events)`
  if (r.jobsUsed !== undefined && r.jobsUsed > 0) return ` (${r.jobsUsed} jobs)`
  if (r.citiesCovered !== undefined) return ` (${r.citiesCovered} cities)`
  return ''
}

function friendlyError(error?: string): string {
  if (!error) return 'Unknown error'
  if (error.includes('401') || error.includes('InvalidApiKey')) {
    return 'Ticketmaster key invalid (optional source). The city calendars still work: try again.'
  }
  return error
}

/**
 * One generator section (Events / Weather / Jobs). Owns its own city + save-as
 * + results state; parent passes the endpoint and gets pinged to reload drafts.
 */
function GeneratorCard({
  icon,
  title,
  description,
  endpoint,
  cityOptions,
  schedule,
  accent,
  onGenerated,
  children,
}: {
  icon: React.ReactNode
  title: string
  description: string
  endpoint: string
  cityOptions?: Array<{ value: string; label: string }>
  schedule: string
  accent: string
  onGenerated: () => Promise<void>
  children?: React.ReactNode
}) {
  const [city, setCity] = useState('all')
  const [saveAs, setSaveAs] = useState<SaveAs>('draft')
  const [isGenerating, setIsGenerating] = useState(false)
  const [results, setResults] = useState<AutomationResponse | null>(null)

  const handleGenerate = async () => {
    setIsGenerating(true)
    setResults(null)
    try {
      const body: Record<string, string> = { status: saveAs }
      if (cityOptions) body.city = city
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data: AutomationResponse = await res.json()
      setResults(data)
      if (data.summary?.succeeded > 0) await onGenerated()
    } catch {
      setResults({
        success: false,
        publishStatus: saveAs,
        results: [],
        summary: { attempted: 0, succeeded: 0, failed: 1 },
      })
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Card className={`border-dashed border-2 ${accent}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          {icon}
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-end gap-3 mb-3">
          {cityOptions && (
            <div>
              <label className="text-xs font-medium block mb-1 text-muted-foreground">City</label>
              <select
                value={city}
                onChange={e => setCity(e.target.value)}
                className="border rounded-md px-3 py-2 text-sm bg-background"
                disabled={isGenerating}
              >
                {cityOptions.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="text-xs font-medium block mb-1 text-muted-foreground">Save As</label>
            <select
              value={saveAs}
              onChange={e => setSaveAs(e.target.value as SaveAs)}
              className="border rounded-md px-3 py-2 text-sm bg-background"
              disabled={isGenerating}
            >
              <option value="draft">Draft — review before publishing</option>
              <option value="published">Live — publish immediately</option>
            </select>
          </div>
          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="bg-blue-600 hover:bg-blue-700 text-white"
            size="sm"
          >
            {isGenerating
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating...</>
              : <><Zap className="mr-2 h-4 w-4" />Generate Now</>
            }
          </Button>
          <span className="text-xs text-muted-foreground pb-2">{schedule}</span>
        </div>

        {children}

        {isGenerating && (
          <p className="text-xs text-muted-foreground">
            Fetching data and writing with Claude. This can take 1–3 minutes...
          </p>
        )}

        {results && (
          <div className="mt-3 space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">
              {results.summary.succeeded}/{results.summary.attempted} succeeded
              {results.publishStatus === 'draft' && ' — new drafts added below'}
            </p>
            {results.results.map((r, i) => (
              <div
                key={r.city || r.cityLabel || i}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm ${
                  r.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                }`}
              >
                {r.success
                  ? <CheckCircle className="h-3.5 w-3.5 text-green-600 shrink-0" />
                  : <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                }
                <span className="font-medium">{r.cityLabel}:</span>
                {r.success
                  ? <span>{r.title}{resultDetail(r)}</span>
                  : <span className="text-red-700">{friendlyError(r.error)}</span>
                }
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function AutomationPage() {
  const router = useRouter()
  const [drafts, setDrafts] = useState<DraftArticle[]>([])
  const [isLoadingDrafts, setIsLoadingDrafts] = useState(true)
  const [articleStates, setArticleStates] = useState<Record<string, ActionState>>({})
  const [published, setPublished] = useState<Record<string, boolean>>({})

  // Ticketmaster key test (optional enrichment source for the events generator)
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string; fix?: string; keyPreview?: string } | null>(null)

  const loadDrafts = useCallback(async () => {
    setIsLoadingDrafts(true)
    try {
      const res = await fetch('/api/admin/automation/drafts')
      const data = await res.json()
      setDrafts(Array.isArray(data) ? data : [])
    } catch {
      setDrafts([])
    } finally {
      setIsLoadingDrafts(false)
    }
  }, [])

  useEffect(() => {
    const adminAuthenticated = localStorage.getItem('admin_authenticated')
    if (!adminAuthenticated) { router.push('/admin/login'); return }
    loadDrafts()
  }, [router, loadDrafts])

  const handlePublish = async (article: DraftArticle) => {
    setArticleStates(s => ({ ...s, [article.id]: 'publishing' }))
    try {
      const res = await fetch(`/api/admin/articles/${article.id}/publish`, { method: 'PATCH' })
      if (res.ok) {
        setPublished(p => ({ ...p, [article.id]: true }))
        setArticleStates(s => ({ ...s, [article.id]: 'done' }))
        // Remove from draft list after short delay
        setTimeout(() => setDrafts(d => d.filter(a => a.id !== article.id)), 1500)
      } else {
        setArticleStates(s => ({ ...s, [article.id]: 'idle' }))
      }
    } catch {
      setArticleStates(s => ({ ...s, [article.id]: 'idle' }))
    }
  }

  const handleDelete = async (article: DraftArticle) => {
    if (!confirm(`Delete "${article.title}"? This cannot be undone.`)) return
    setArticleStates(s => ({ ...s, [article.id]: 'deleting' }))
    try {
      await fetch(`/api/admin/articles/${article.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: article.id }),
      })
      setDrafts(d => d.filter(a => a.id !== article.id))
    } catch {
      setArticleStates(s => ({ ...s, [article.id]: 'idle' }))
    }
  }

  const handleTestKey = async () => {
    setIsTesting(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/admin/test-ticketmaster')
      const data = await res.json()
      setTestResult(data)
    } catch {
      setTestResult({ ok: false, message: 'Could not reach the test endpoint. Check your connection.' })
    } finally {
      setIsTesting(false)
    }
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

  const stateOf = (id: string): ActionState => articleStates[id] || 'idle'

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Auto Articles</h1>
        <p className="text-muted-foreground mt-1">
          Generate AI-written articles and review them before they go live.
          Events and weather run automatically on Thursdays, jobs on Mondays.
        </p>
      </div>

      <div className="space-y-6 mb-8">
        {/* 1. Weekend events */}
        <GeneratorCard
          icon={<CalendarDays className="h-4 w-4 text-blue-500" />}
          title="Weekend Events"
          description="Pulls each city's public event calendar, sources a photo, and writes a things-to-do guide per city."
          endpoint="/api/admin/automation/weekend-events"
          cityOptions={EVENT_CITIES}
          schedule="Auto: Thursdays 2pm MST"
          accent="border-blue-200"
          onGenerated={loadDrafts}
        >
          {/* Ticketmaster is an optional extra source for the events pipeline */}
          <div className="flex items-center gap-3 mb-3 pt-1 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestKey}
              disabled={isTesting}
              className="text-xs"
            >
              {isTesting
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />Testing...</>
                : <><Wifi className="h-3.5 w-3.5 mr-1" />Test API Key</>
              }
            </Button>
            <span className="text-xs text-muted-foreground">Optional: Ticketmaster adds major-venue events when a key is set</span>
          </div>

          {testResult && (
            <div className={`mb-3 px-3 py-2.5 rounded-md text-sm border ${
              testResult.ok
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              <div className="flex items-start gap-2">
                {testResult.ok
                  ? <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                  : <WifiOff className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                }
                <div>
                  <p className="font-medium">{testResult.message}</p>
                  {testResult.keyPreview && (
                    <p className="text-xs mt-0.5 opacity-75">Key: {testResult.keyPreview}</p>
                  )}
                  {testResult.fix && (
                    <div className="flex items-start gap-1 mt-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-600" />
                      <p className="text-xs text-amber-800">{testResult.fix}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </GeneratorCard>

        {/* 2. Weekend weather */}
        <GeneratorCard
          icon={<CloudSun className="h-4 w-4 text-sky-500" />}
          title="Weekend Weather"
          description="One province-wide forecast article covering all 7 cities, city by city, from Open-Meteo data. No API key needed."
          endpoint="/api/admin/automation/weather"
          schedule="Auto: Thursdays 1:45pm MST"
          accent="border-sky-200"
          onGenerated={loadDrafts}
        />

        {/* 3. Weekly jobs */}
        <GeneratorCard
          icon={<BriefcaseBusiness className="h-4 w-4 text-amber-600" />}
          title="Jobs Update"
          description="Who's Hiring This Week roundup from the jobs board (needs at least 8 new postings in the past 7 days)."
          endpoint="/api/admin/automation/weekly-jobs"
          cityOptions={JOB_CITIES}
          schedule="Auto: Mondays 8am MST"
          accent="border-amber-200"
          onGenerated={loadDrafts}
        />
      </div>

      {/* Draft articles list */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">
          Pending Review
          {!isLoadingDrafts && (
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({drafts.length} draft{drafts.length !== 1 ? 's' : ''})
            </span>
          )}
        </h2>
        <Button variant="outline" size="sm" onClick={loadDrafts} disabled={isLoadingDrafts}>
          <RefreshCw className={`h-4 w-4 mr-1 ${isLoadingDrafts ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {isLoadingDrafts ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          Loading drafts...
        </div>
      ) : drafts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Zap className="h-8 w-8 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No drafts pending review</p>
            <p className="text-sm mt-1">
              Events and weather generate Thursdays, jobs Mondays,
              or use the panels above to generate now.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {drafts.map(article => {
            const state = stateOf(article.id)
            const isPublished = published[article.id]
            const kind = draftKind(article.tags)

            return (
              <Card
                key={article.id}
                className={`transition-all ${
                  state === 'done' ? 'opacity-50 border-green-300 bg-green-50' : ''
                } ${state === 'deleting' ? 'opacity-40' : ''}`}
              >
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    {/* Thumbnail */}
                    {article.image_url && (
                      <div className="hidden sm:block shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={article.image_url}
                          alt=""
                          className="w-24 h-16 object-cover rounded-md bg-gray-100"
                        />
                      </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 mb-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium shrink-0 ${kind.className}`}>
                          {kind.label}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 shrink-0">
                          {article.location}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Generated {formatDate(article.created_at)}
                        </span>
                        {isPublished && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                            <CheckCircle className="h-3 w-3" /> Published
                          </span>
                        )}
                      </div>

                      <h3 className="font-semibold text-sm leading-snug mb-1 line-clamp-2">
                        {article.title}
                      </h3>

                      {article.excerpt && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {article.excerpt}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 shrink-0">
                      {/* Publish */}
                      <Button
                        size="sm"
                        onClick={() => handlePublish(article)}
                        disabled={state !== 'idle'}
                        className="bg-green-600 hover:bg-green-700 text-white text-xs h-8 px-3"
                      >
                        {state === 'publishing'
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : state === 'done'
                          ? <CheckCircle className="h-3.5 w-3.5" />
                          : 'Publish'
                        }
                      </Button>

                      {/* Preview */}
                      <Button
                        size="sm"
                        variant="outline"
                        asChild
                        className="text-xs h-8 px-3"
                      >
                        <Link href={`/articles/${article.slug}`} target="_blank">
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          Preview
                        </Link>
                      </Button>

                      {/* Edit */}
                      <Button
                        size="sm"
                        variant="outline"
                        asChild
                        className="text-xs h-8 px-3"
                      >
                        <Link href={`/admin/articles/${article.id}`}>
                          <Edit className="h-3.5 w-3.5 mr-1" />
                          Edit
                        </Link>
                      </Button>

                      {/* Discard */}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(article)}
                        disabled={state !== 'idle'}
                        className="text-xs h-8 px-3 text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        {state === 'deleting'
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <><Trash2 className="h-3.5 w-3.5 mr-1" />Discard</>
                        }
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <p className="text-xs text-muted-foreground mt-6 text-center">
        Auto articles always save as drafts first. Add your local angle in Edit, then Publish.{' '}
        <Link href="/admin/dashboard" className="underline">Back to dashboard</Link>
      </p>
    </div>
  )
}
