"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Home,
  FileText,
  Star,
  Calendar,
  MapPin,
  Mail,
  RefreshCw,
  Zap,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react'
import Link from 'next/link'

const AUTOMATION_CITIES = [
  { value: 'all', label: 'All 6 Cities' },
  { value: 'calgary', label: 'Calgary' },
  { value: 'edmonton', label: 'Edmonton' },
  { value: 'lethbridge', label: 'Lethbridge' },
  { value: 'medicine-hat', label: 'Medicine Hat' },
  { value: 'grande-prairie', label: 'Grande Prairie' },
  { value: 'fort-mcmurray', label: 'Fort McMurray' },
]

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

export default function AdminDashboard() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [refreshMessage, setRefreshMessage] = useState('')

  // Automation state
  const [autoCity, setAutoCity] = useState('all')
  const [autoStatus, setAutoStatus] = useState<'draft' | 'published'>('draft')
  const [isGenerating, setIsGenerating] = useState(false)
  const [autoResults, setAutoResults] = useState<AutomationResponse | null>(null)

  const handleGenerateWeekendArticles = async () => {
    setIsGenerating(true)
    setAutoResults(null)
    try {
      const response = await fetch('/api/admin/automation/weekend-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city: autoCity, status: autoStatus }),
      })
      const data: AutomationResponse = await response.json()
      setAutoResults(data)
    } catch {
      setAutoResults({
        success: false,
        publishStatus: autoStatus,
        results: [],
        summary: { attempted: 0, succeeded: 0, failed: 1 },
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleRefreshCache = async () => {
    setIsRefreshing(true)
    setRefreshMessage('')
    try {
      const response = await fetch('/api/refresh-cache', {
        method: 'POST'
      })
      const data = await response.json()
      
      if (data.success) {
        setRefreshMessage('✅ Cache refreshed! Newest articles will now show.')
      } else {
        setRefreshMessage('❌ Failed to refresh cache')
      }
    } catch (error) {
      setRefreshMessage('❌ Error refreshing cache')
    } finally {
      setIsRefreshing(false)
      // Clear message after 5 seconds
      setTimeout(() => setRefreshMessage(''), 5000)
    }
  }

  useEffect(() => {
    // Check authentication using localStorage (same as admin layout)
    const adminAuthenticated = localStorage.getItem('admin_authenticated')
    setIsAuthenticated(adminAuthenticated === 'true')
    setIsLoading(false)

    if (!adminAuthenticated) {
      router.push('/admin/login')
    }
  }, [router])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">Welcome back, Admin</p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={handleRefreshCache} 
              disabled={isRefreshing}
              variant="outline"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh Cache
            </Button>
            <Button asChild>
              <Link href="/">
                <Home className="mr-2 h-4 w-4" />
                View Site
              </Link>
            </Button>
          </div>
        </div>
        
        {/* Refresh Message */}
        {refreshMessage && (
          <div className={`mb-4 p-4 rounded-lg ${
            refreshMessage.includes('✅') ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {refreshMessage}
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Articles</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Manage Content</div>
              <p className="text-xs text-muted-foreground">
                Create and edit articles
              </p>
              <Button asChild className="mt-4" size="sm">
                <Link href="/admin/articles">Manage Articles</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Best Of</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Featured Content</div>
              <p className="text-xs text-muted-foreground">
                Manage best of Alberta content
              </p>
              <Button asChild className="mt-4" size="sm">
                <Link href="/admin/best-of">Manage Best Of</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Events</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Event Management</div>
              <p className="text-xs text-muted-foreground">
                Create and manage events
              </p>
              <Button asChild className="mt-4" size="sm">
                <Link href="/admin/events">Manage Events</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Newsletter</CardTitle>
              <Mail className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Subscribers</div>
              <p className="text-xs text-muted-foreground">
                Manage newsletter subscribers
              </p>
              <Button asChild className="mt-4" size="sm">
                <Link href="/admin/newsletter">Manage Newsletter</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Locations</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">City Content</div>
              <p className="text-xs text-muted-foreground">
                Manage Calgary & Edmonton content
              </p>
              <div className="flex gap-2 mt-4">
                <Button asChild size="sm" variant="outline">
                  <Link href="/calgary">Calgary</Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href="/edmonton">Edmonton</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Weekend Events Automation */}
        <Card className="mb-6 border-2 border-dashed border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-500" />
              Weekend Events — Auto-Generate
            </CardTitle>
            <CardDescription>
              Pulls events from Eventbrite, generates article with Claude, uploads a cover photo.
              Runs automatically every Thursday at 2pm MST. Use this to trigger manually.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end gap-4 mb-4">
              <div>
                <label className="text-sm font-medium block mb-1">City</label>
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
                <label className="text-sm font-medium block mb-1">Publish As</label>
                <select
                  value={autoStatus}
                  onChange={e => setAutoStatus(e.target.value as 'draft' | 'published')}
                  className="border rounded-md px-3 py-2 text-sm bg-background"
                  disabled={isGenerating}
                >
                  <option value="draft">Draft (review before publishing)</option>
                  <option value="published">Published (go live immediately)</option>
                </select>
              </div>
              <Button
                onClick={handleGenerateWeekendArticles}
                disabled={isGenerating}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isGenerating ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
                ) : (
                  <><Zap className="mr-2 h-4 w-4" /> Generate Now</>
                )}
              </Button>
            </div>

            {isGenerating && (
              <p className="text-sm text-muted-foreground">
                This takes 1–3 minutes per city. Fetching events, sourcing photos, and writing with Claude...
              </p>
            )}

            {autoResults && (
              <div className="mt-4 space-y-2">
                <p className="text-sm font-medium">
                  Results: {autoResults.summary.succeeded}/{autoResults.summary.attempted} cities succeeded
                  {autoResults.publishStatus === 'draft' && ' — check Articles (filter by Draft) to review'}
                </p>
                {autoResults.results.map(r => (
                  <div
                    key={r.city}
                    className={`flex items-start gap-2 p-3 rounded-md text-sm ${
                      r.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                    }`}
                  >
                    {r.success
                      ? <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                      : <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                    }
                    <div>
                      <span className="font-medium">{r.cityLabel}:</span>{' '}
                      {r.success
                        ? <><a href={`/articles/${r.articleSlug}`} target="_blank" className="underline">{r.title}</a> ({r.eventsUsed} events)</>
                        : <span className="text-red-700">{r.error}</span>
                      }
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>About This Dashboard</CardTitle>
            <CardDescription>
              Analytics dashboard has been removed to reduce Vercel usage and improve performance.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              <p className="mb-2">
                The internal analytics system was contributing to high Vercel resource usage.
                You can still track your website performance using:
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>Google Analytics (already integrated)</li>
                <li>Vercel Analytics (already integrated)</li>
                <li>Vercel Speed Insights (already integrated)</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}