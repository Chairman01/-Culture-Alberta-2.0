"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { getAllNewsletterSubscriptions, getNewsletterStats } from "@/lib/newsletter"
import { triggerCityNewsletter, triggerAllNewsletters } from "./_actions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Mail, Users, MapPin, Calendar, Send, CheckCircle, AlertCircle, Loader2, Eye, X } from "lucide-react"
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

const CITY_CONFIG: Record<CityKey, { label: string; newsletter: string; color: string; accent: string }> = {
  edmonton: { label: 'Edmonton', newsletter: 'The Capital', color: 'text-blue-600', accent: 'bg-blue-600' },
  calgary:  { label: 'Calgary',  newsletter: 'The Chinook',  color: 'text-red-600',  accent: 'bg-red-600'  },
  lethbridge: { label: 'Lethbridge', newsletter: 'The Westerly', color: 'text-amber-600', accent: 'bg-amber-600' },
}

export default function NewsletterAdmin() {
  const router = useRouter()
  const [subscriptions, setSubscriptions] = useState<NewsletterSubscription[]>([])
  const [stats, setStats] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // Preview modal
  const [previewCity, setPreviewCity] = useState<CityKey | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  // Send state per city
  const [sendStates, setSendStates] = useState<Record<CityKey, SendState>>({
    edmonton:  { status: 'idle' },
    calgary:   { status: 'idle' },
    lethbridge: { status: 'idle' },
  })
  const [sendAllState, setSendAllState] = useState<{ status: 'idle' | 'sending' | 'success' | 'error'; results?: SendResult[]; error?: string }>({ status: 'idle' })
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    const adminAuthenticated = localStorage.getItem("admin_authenticated")
    setIsAuthenticated(adminAuthenticated === "true")

    if (!adminAuthenticated) {
      router.push("/admin/login")
      return
    }

    const loadNewsletterData = async () => {
      try {
        const [subscriptionsData, statsData] = await Promise.all([
          getAllNewsletterSubscriptions(),
          getNewsletterStats()
        ])
        setSubscriptions(subscriptionsData)
        setStats(statsData)
      } catch (error) {
        console.error("Error loading newsletter data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadNewsletterData()
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
          [city]: { status: 'error', error: err instanceof Error ? err.message : 'Unknown error' }
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

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!isAuthenticated) return null

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      })
    } catch { return 'Invalid date' }
  }

  const getCityLabel = (city: string) => {
    switch (city) {
      case 'calgary': return 'Calgary'
      case 'edmonton': return 'Edmonton'
      case 'lethbridge': return 'Lethbridge'
      case 'other-alberta': return 'Other Alberta'
      case 'outside-alberta': return 'Outside Alberta'
      default: return city
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
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
        </div>

        {/* ── SEND NOW SECTION ──────────────────────────────────────────── */}
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
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => setPreviewCity(city)}
                      >
                        <Eye className="mr-2 h-4 w-4" /> Preview
                      </Button>
                      <Button
                        className={`flex-1 ${cfg.accent} hover:opacity-90 text-white`}
                        onClick={() => handleSendCity(city)}
                        disabled={state.status === 'sending' || isPending}
                      >
                        {state.status === 'sending' ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending…</>
                        ) : (
                          <><Send className="mr-2 h-4 w-4" /> Send</>
                        )}
                      </Button>
                    </div>

                    {state.status === 'success' && state.result && (
                      <div className="flex items-start gap-2 text-sm text-green-700 bg-green-50 rounded-lg p-3">
                        <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <div>
                          <div className="font-medium">Sent successfully</div>
                          <div className="text-green-600">
                            ✓ {state.result.sent} sent
                            {state.result.failed > 0 && ` · ✗ ${state.result.failed} failed`}
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
                        <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
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
            <div className="border-t pt-4">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  onClick={handleSendAll}
                  disabled={sendAllState.status === 'sending' || isPending}
                  className="min-w-[160px]"
                >
                  {sendAllState.status === 'sending' ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending all…</>
                  ) : (
                    <><Mail className="mr-2 h-4 w-4" /> Send All Cities</>
                  )}
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
            </div>
          </CardContent>
        </Card>

        {/* ── STATS ─────────────────────────────────────────────────────── */}
        {stats && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Total
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
                  <Users className="h-4 w-4" />
                  Active
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
                  <MapPin className="h-4 w-4" />
                  Edmonton
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
                  <MapPin className="h-4 w-4" />
                  Calgary
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
                  <MapPin className="h-4 w-4" />
                  Lethbridge
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">{stats.byCity?.lethbridge ?? 0}</div>
                <p className="text-xs text-muted-foreground mt-1">The Westerly</p>
              </CardContent>
            </Card>
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
                        .map((subscription) => (
                          <div key={subscription.id} className="font-mono text-sm bg-white p-2 rounded border">
                            {subscription.email} | {getCityLabel(subscription.city)}
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Detailed List */}
                  <div className="space-y-3">
                    {subscriptions.map((subscription) => (
                      <div key={subscription.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">{subscription.email}</span>
                              <Badge variant={subscription.status === 'active' ? 'default' : 'secondary'}>
                                {subscription.status}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {getCityLabel(subscription.city)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {subscription.created_at ? formatDate(subscription.created_at) : 'Unknown date'}
                              </span>
                            </div>
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

    {/* ── PREVIEW MODAL ───────────────────────────────────────────── */}
    {previewCity && (
      <div className="fixed inset-0 z-50 flex flex-col bg-black/60" onClick={() => setPreviewCity(null)}>
        <div
          className="flex flex-col w-full h-full max-w-3xl mx-auto my-6 bg-white rounded-xl overflow-hidden shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal header */}
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
          {/* iframe */}
          <div className="flex-1 overflow-hidden bg-gray-100">
            <iframe
              key={previewCity}
              src={`/api/newsletter/preview?city=${previewCity}`}
              className="w-full h-full border-0"
              title={`${CITY_CONFIG[previewCity].newsletter} newsletter preview`}
              onLoad={() => setPreviewLoading(false)}
              onLoadStart={() => setPreviewLoading(true)}
            />
          </div>
        </div>
      </div>
    )}
  )
}
