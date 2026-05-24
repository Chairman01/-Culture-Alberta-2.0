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
  ExternalLink,
  RefreshCw,
  Eye,
  Wifi,
  WifiOff,
  AlertTriangle,
} from 'lucide-react'

const AUTOMATION_CITIES = [
  { value: 'all', label: 'All 6 Cities' },
  { value: 'calgary', label: 'Calgary' },
  { value: 'edmonton', label: 'Edmonton' },
  { value: 'lethbridge', label: 'Lethbridge' },
  { value: 'medicine-hat', label: 'Medicine Hat' },
  { value: 'grande-prairie', label: 'Grande Prairie' },
  { value: 'fort-mcmurray', label: 'Fort McMurray' },
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
  city: string
  cityLabel: string
  title?: string
  articleSlug?: string
  eventsFound: number
  eventsUsed: number
  error?: string
}

interface AutomationResponse {
  success: boolean
  publishStatus: string
  results: AutomationResult[]
  summary: { attempted: number; succeeded: number; failed: number }
}

type ActionState = 'idle' | 'publishing' | 'deleting' | 'done'

export default function AutomationPage() {
  const router = useRouter()
  const [drafts, setDrafts] = useState<DraftArticle[]>([])
  const [isLoadingDrafts, setIsLoadingDrafts] = useState(true)
  const [articleStates, setArticleStates] = useState<Record<string, ActionState>>({})
  const [published, setPublished] = useState<Record<string, boolean>>({})

  // Generate panel state
  const [autoCity, setAutoCity] = useState('all')
  const [autoStatus, setAutoStatus] = useState<'draft' | 'published'>('draft')
  const [isGenerating, setIsGenerating] = useState(false)
  const [genResults, setGenResults] = useState<AutomationResponse | null>(null)

  // API key test state
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

  const handleGenerate = async () => {
    setIsGenerating(true)
    setGenResults(null)
    try {
      const res = await fetch('/api/admin/automation/weekend-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city: autoCity, status: autoStatus }),
      })
      const data: AutomationResponse = await res.json()
      setGenResults(data)
      // Reload drafts after generation
      if (data.summary.succeeded > 0) await loadDrafts()
    } catch {
      setGenResults({
        success: false,
        publishStatus: autoStatus,
        results: [],
        summary: { attempted: 0, succeeded: 0, failed: 1 },
      })
    } finally {
      setIsGenerating(false)
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
          Review AI-generated weekend event articles before they go live. Runs automatically every Thursday.
        </p>
      </div>

      {/* Generate panel */}
      <Card className="mb-8 border-dashed border-2 border-blue-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="h-4 w-4 text-blue-500" />
            Generate New Articles
          </CardTitle>
          <CardDescription>
            Pulls from Ticketmaster, sources a photo, and writes with Claude. Saves as draft by default.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3 mb-3">
            <div>
              <label className="text-xs font-medium block mb-1 text-muted-foreground">City</label>
              <select
                value={autoCity}
                onChange={e => setAutoCity(e.target.value)}
                className="border rounded-md px-3 py-2 text-sm bg-background"
                disabled={isGenerating}
              >
                {AUTOMATION_CITIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium block mb-1 text-muted-foreground">Save As</label>
              <select
                value={autoStatus}
                onChange={e => setAutoStatus(e.target.value as 'draft' | 'published')}
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
          </div>

          {/* Test API Key button */}
          <div className="flex items-center gap-3 mb-3 pt-1 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestKey}
              disabled={isTesting || isGenerating}
              className="text-xs"
            >
              {isTesting
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />Testing...</>
                : <><Wifi className="h-3.5 w-3.5 mr-1" />Test API Key</>
              }
            </Button>
            <span className="text-xs text-muted-foreground">Verify your Ticketmaster key before generating</span>
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

          {isGenerating && (
            <p className="text-xs text-muted-foreground">
              Fetching events, sourcing photos, and writing with Claude. This takes 1–3 minutes per city...
            </p>
          )}

          {genResults && (
            <div className="mt-3 space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">
                {genResults.summary.succeeded}/{genResults.summary.attempted} succeeded
                {genResults.publishStatus === 'draft' && ' — new drafts added below'}
              </p>
              {genResults.results.map(r => (
                <div
                  key={r.city}
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
                    ? <span>{r.title} ({r.eventsUsed} events)</span>
                    : <span className="text-red-700">
                        {r.error?.includes('401') || r.error?.includes('InvalidApiKey')
                          ? 'Invalid API key — click "Test API Key" above to diagnose'
                          : r.error
                        }
                      </span>
                  }
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
              Automated articles are generated every Thursday at 2pm MST,
              or use the panel above to generate now.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {drafts.map(article => {
            const state = stateOf(article.id)
            const isPublished = published[article.id]

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
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 shrink-0">
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
