"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { getAllNewsletterSubscriptions, getNewsletterStats } from "@/lib/newsletter"
import { triggerCityNewsletter, triggerAllNewsletters, sendTestNewsletter } from "./_actions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  ArrowLeft, Mail, Users, MapPin, Calendar,
  Send, CheckCircle, AlertCircle, Loader2, Eye, X, FlaskConical,
} from "lucide-react"
import Link from "next/link"
import type { SendResult } from "@/lib/newsletter/send-newsletter"

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

const CITY_CONFIG: Record<CityKey, { label: string; newsletter: string; color: string; accent: string }> = {
  edmonton:   { label: 'Edmonton',   newsletter: 'The Capital',  color: 'text-blue-600',  accent: 'bg-blue-600'  },
  calgary:    { label: 'Calgary',    newsletter: 'The Chinook',  color: 'text-red-600',   accent: 'bg-red-600'   },
  lethbridge: { label: 'Lethbridge', newsletter: 'The Westerly', color: 'text-amber-600', accent: 'bg-amber-600' },
}

// Cities that don't have their own newsletter but subscribers can come from
const OTHER_CITY_LABELS: Record<string, string> = {
  'red-deer':       'Red Deer',
  'grande-prairie': 'Grande Prairie',
  'medicine-hat':   'Medicine Hat',
  'other-alberta':  'Other Alberta',
  'outside-alberta':'Outside Alberta',
  'other':          'Other',
  'unknown':        'Unknown',
}

export default function NewsletterAdmin() {
  const router = useRouter()
  const [subscriptions, setSubscriptions] = useState<NewsletterSubscription[]>([])
  const [stats, setStats] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  const [previewCity, setPreviewCity] = useState<CityKey | null>(null)

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

  useEffect(() => {
    const adminAuthenticated = localStorage.getItem("admin_authenticated")
    setIsAuthenticated(adminAuthenticated === "true")
    if (!adminAuthenticated) { router.push("/admin/login"); return }

    const loadData = async () => {
      try {
        const [subscriptionsData, statsData] = await Promise.all([
          getAllNewsletterSubscriptions(),
          getNewsletterStats(),
        ])
        setSubscriptions(subscriptionsData)
        setStats(statsData)
      } catch (error) {
        console.error("Error loading newsletter data:", error)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [router])

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
          [city]: {
            ...prev[city],
            status: 'error',
            error: err instanceof Error ? err.message : 'Unknown error',
          },
        }))
      }
    })
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
      </div>
    )
  }
  if (!isAuthenticated) return null

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    } catch { return 'Invalid date' }
  }

  const getCityLabel = (city: string) =>
    OTHER_CITY_LABELS[city] ??
    CITY_CONFIG[city as CityKey]?.label ??
    city.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

  // Subscribers that belong to cities without a newsletter
  const otherCities = Object.entries(OTHER_CITY_LABELS).filter(
    ([key]) => (stats?.byCity?.[key] ?? 0) > 0
  )

  // Verify totals add up
  const newsletterCityTotal = (['edmonton', 'calgary', 'lethbridge'] as CityKey[])
    .reduce((s, c) => s + (stats?.byCity?.[c] ?? 0), 0)
  const otherCityTotal = otherCities.reduce((s, [key]) => s + (stats?.byCity?.[key] ?? 0), 0)

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

        {/* ── SEND NOW ──────────────────────────────────────────────────── */}
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

                    {/* Action buttons */}
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

                    {/* Test email toggle */}
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
                              size="sm"
                              variant="outline"
                              className="h-8 px-3 shrink-0"
                              onClick={() => handleTestSend(city)}
                              disabled={test.status === 'sending' || !test.email.trim()}
                            >
                              {test.status === 'sending'
                                ? <Loader2 className="h-3 w-3 animate-spin" />
                                : 'Send'}
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
                              <CheckCircle className="h-3 w-3" /> Test email sent to {test.email}
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

                    {/* Send result */}
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

            {/* Send All */}
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
                  <AlertCircle className="h-4 w-4" />
                  {sendAllState.error}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── STATS ─────────────────────────────────────────────────────── */}
        {stats && (
          <div className="mb-6 space-y-3">
            {/* Top row: Total + Active + 3 newsletter cities */}
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

            {/* Secondary row: all other cities (only shown if any exist) */}
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

        {/* ── SUBSCRIBER LIST ───────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>All Subscriptions</CardTitle>
            <CardDescription>{subscriptions.length} total subscriptions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {subscriptions.length > 0 ? (
                <>
                  {/* Copyable Data */}
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

                  {/* Detailed List */}
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

    {/* ── PREVIEW MODAL ───────────────────────────────────────────────── */}
    {previewCity && (
      <div className="fixed inset-0 z-50 flex flex-col bg-black/60" onClick={() => setPreviewCity(null)}>
        <div
          className="flex flex-col w-full h-full max-w-3xl mx-auto my-6 bg-white rounded-xl overflow-hidden shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-5 py-3 border-b bg-gray-50 shrink-0">
            <div>
              <span className="font-semibold text-gray-900">
                {CITY_CONFIG[previewCity].newsletter} Preview
              </span>
              <span className="ml-2 text-sm text-gray-400">— {CITY_CONFIG[previewCity].label}</span>
            </div>
            <div className="flex items-center gap-3">
              <a
                href={`/api/newsletter/preview?city=${previewCity}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline"
              >
                Open in new tab ↗
              </a>
              <button
                onClick={() => setPreviewCity(null)}
                className="p-1 rounded hover:bg-gray-200 transition-colors"
              >
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
