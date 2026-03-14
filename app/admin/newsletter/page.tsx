"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  getAllNewsletterSubscriptions,
  getNewsletterStats,
  getEmailEvents,
  computeCampaignStats,
  computeSubscriberEngagement,
  type CampaignStat,
  type SubscriberEngagement,
} from "@/lib/newsletter"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Mail, Users, MapPin, Calendar, Copy, Check, Filter, BarChart2, MousePointerClick, Eye, AlertTriangle } from "lucide-react"
import Link from "next/link"

interface NewsletterSubscription {
  id?: string
  email: string
  city: string
  province?: string
  country?: string
  created_at?: string
  status?: 'active' | 'unsubscribed'
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

type TabType = 'subscribers' | 'campaigns'

export default function NewsletterAdmin() {
  const router = useRouter()
  const [subscriptions, setSubscriptions] = useState<NewsletterSubscription[]>([])
  const [stats, setStats] = useState<any>(null)
  const [campaigns, setCampaigns] = useState<CampaignStat[]>([])
  const [engagement, setEngagement] = useState<Record<string, SubscriberEngagement>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [cityFilter, setCityFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'unsubscribed'>('active')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [updatingEmail, setUpdatingEmail] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('subscribers')

  useEffect(() => {
    const adminAuthenticated = localStorage.getItem("admin_authenticated")
    setIsAuthenticated(adminAuthenticated === "true")
    if (!adminAuthenticated) {
      router.push("/admin/login")
      return
    }
    loadData()
  }, [router])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [subscriptionsData, statsData, eventsData] = await Promise.all([
        getAllNewsletterSubscriptions(),
        getNewsletterStats(),
        getEmailEvents(),
      ])
      setSubscriptions(subscriptionsData)
      setStats(statsData)
      setCampaigns(computeCampaignStats(eventsData))
      setEngagement(computeSubscriberEngagement(eventsData))
    } catch (error) {
      console.error("Error loading newsletter data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const toggleStatus = async (sub: NewsletterSubscription) => {
    const newStatus = sub.status === 'active' ? 'unsubscribed' : 'active'
    setUpdatingEmail(sub.email)
    try {
      const res = await fetch('/api/newsletter', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: sub.email, status: newStatus })
      })
      if (res.ok) {
        setSubscriptions(prev =>
          prev.map(s => s.email === sub.email ? { ...s, status: newStatus } : s)
        )
        const newStats = await getNewsletterStats()
        setStats(newStats)
      }
    } catch (err) {
      console.error('Failed to update subscription:', err)
    } finally {
      setUpdatingEmail(null)
    }
  }

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
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
    } catch { return 'Unknown' }
  }

  const formatDateShort = (dateString?: string) => {
    if (!dateString) return '—'
    try {
      return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    } catch { return '—' }
  }

  const getCityLabel = (city: string) => {
    const found = CITY_FILTERS.find(c => c.value === city)
    return found ? found.label : city
  }

  const filteredSubscriptions = subscriptions.filter(sub => {
    const cityMatch = cityFilter === 'all' || sub.city === cityFilter
    const statusMatch = statusFilter === 'all' || sub.status === statusFilter
    return cityMatch && statusMatch
  })

  const activeFiltered = filteredSubscriptions.filter(s => s.status === 'active')
  const copyText = activeFiltered.map(s => `${s.email} | ${getCityLabel(s.city)}`).join('\n')

  // Overall engagement stats (from events)
  const totalDelivered = campaigns.reduce((sum, c) => sum + c.delivered, 0)
  const totalOpened = campaigns.reduce((sum, c) => sum + c.opened, 0)
  const totalClicked = campaigns.reduce((sum, c) => sum + c.clicked, 0)
  const overallOpenRate = totalDelivered > 0 ? Math.round((totalOpened / totalDelivered) * 100) : 0
  const overallClickRate = totalDelivered > 0 ? Math.round((totalClicked / totalDelivered) * 100) : 0

  const statCards = [
    { label: 'Total', value: stats?.total ?? 0, sub: 'All time', color: 'text-gray-800' },
    { label: 'Active', value: stats?.active ?? 0, sub: 'Subscribed', color: 'text-green-600' },
    { label: 'Open Rate', value: `${overallOpenRate}%`, sub: `${totalOpened} unique opens`, color: 'text-blue-600', noFilter: true },
    { label: 'Click Rate', value: `${overallClickRate}%`, sub: `${totalClicked} unique clicks`, color: 'text-purple-600', noFilter: true },
    { label: 'Edmonton', value: stats?.byCity?.edmonton ?? 0, sub: 'The Chinook', color: 'text-blue-600', city: 'edmonton' },
    { label: 'Calgary', value: stats?.byCity?.calgary ?? 0, sub: 'The Capital', color: 'text-red-600', city: 'calgary' },
    { label: 'Medicine Hat', value: stats?.byCity?.['medicine-hat'] ?? 0, sub: 'The Westerly', color: 'text-amber-600', city: 'medicine-hat' },
    { label: 'Lethbridge', value: stats?.byCity?.lethbridge ?? 0, sub: 'Active', color: 'text-purple-600', city: 'lethbridge' },
  ]

  return (
    <div className="min-h-screen bg-background">
      <div className="p-6">
        {/* Header */}
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
              <p className="text-muted-foreground">Subscribers & engagement</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={loadData}>Refresh</Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4 lg:grid-cols-8 mb-6">
          {statCards.map(card => (
            <Card
              key={card.label}
              className={`transition-shadow ${!card.noFilter ? 'cursor-pointer hover:shadow-md' : ''}`}
              onClick={() => {
                if (!card.noFilter && card.city) {
                  setCityFilter(card.city)
                  setStatusFilter('active')
                  setActiveTab('subscribers')
                }
              }}
            >
              <CardHeader className="pb-1 pt-3 px-3">
                <CardTitle className="text-xs font-medium text-muted-foreground">{card.label}</CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <div className={`text-xl font-bold ${card.color}`}>{card.value}</div>
                <p className="text-xs text-muted-foreground">{card.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 border-b">
          <button
            onClick={() => setActiveTab('subscribers')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'subscribers'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Users className="inline h-4 w-4 mr-1.5" />
            Subscribers
          </button>
          <button
            onClick={() => setActiveTab('campaigns')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'campaigns'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <BarChart2 className="inline h-4 w-4 mr-1.5" />
            Campaigns
            {campaigns.length > 0 && (
              <span className="ml-1.5 bg-muted text-muted-foreground text-xs rounded-full px-1.5 py-0.5">{campaigns.length}</span>
            )}
          </button>
        </div>

        {/* ── SUBSCRIBERS TAB ── */}
        {activeTab === 'subscribers' && (
          <>
            {/* Filters */}
            <Card className="mb-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Filter className="h-4 w-4" /> Filters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">City</label>
                    <div className="flex flex-wrap gap-1">
                      {CITY_FILTERS.map(c => (
                        <button
                          key={c.value}
                          onClick={() => setCityFilter(c.value)}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                            cityFilter === c.value
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                          }`}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Status</label>
                    <div className="flex gap-1">
                      {(['all', 'active', 'unsubscribed'] as const).map(s => (
                        <button
                          key={s}
                          onClick={() => setStatusFilter(s)}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                            statusFilter === s
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                          }`}
                        >
                          {s.charAt(0).toUpperCase() + s.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Subscriber List */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>
                      {cityFilter === 'all' ? 'All Subscriptions' : `${getCityLabel(cityFilter)} Subscriptions`}
                    </CardTitle>
                    <CardDescription>
                      {filteredSubscriptions.length} matching · {activeFiltered.length} active
                    </CardDescription>
                  </div>
                  {activeFiltered.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(copyText, 'bulk')}
                      className="flex items-center gap-2"
                    >
                      {copiedId === 'bulk' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                      Copy {activeFiltered.length} emails
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {filteredSubscriptions.length > 0 ? (
                  <>
                    {/* Copyable block */}
                    {activeFiltered.length > 0 && (
                      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                        <h3 className="font-medium mb-2 text-sm">
                          Active — {cityFilter === 'all' ? 'All Cities' : getCityLabel(cityFilter)} (Email | City)
                        </h3>
                        <div className="space-y-1 max-h-48 overflow-y-auto">
                          {activeFiltered.map(sub => (
                            <div
                              key={sub.id}
                              className="font-mono text-xs bg-white p-2 rounded border flex items-center justify-between gap-2 cursor-pointer hover:bg-blue-50 transition-colors"
                              onClick={() => copyToClipboard(`${sub.email} | ${getCityLabel(sub.city)}`, sub.id || sub.email)}
                              title="Click to copy"
                            >
                              <span>{sub.email} | {getCityLabel(sub.city)}</span>
                              {copiedId === (sub.id || sub.email)
                                ? <Check className="h-3 w-3 text-green-500 flex-shrink-0" />
                                : <Copy className="h-3 w-3 text-gray-400 flex-shrink-0" />}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Detailed list */}
                    <div className="space-y-2">
                      {filteredSubscriptions.map(sub => {
                        const eng = engagement[sub.email]
                        return (
                          <div
                            key={sub.id}
                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                <span className="font-medium text-sm truncate">{sub.email}</span>
                                <Badge variant={sub.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                                  {sub.status}
                                </Badge>
                                {/* Engagement badges */}
                                {eng?.total_opens > 0 && (
                                  <span className="inline-flex items-center gap-1 text-xs text-blue-600 bg-blue-50 rounded-full px-2 py-0.5">
                                    <Eye className="h-3 w-3" />{eng.total_opens}
                                  </span>
                                )}
                                {eng?.total_clicks > 0 && (
                                  <span className="inline-flex items-center gap-1 text-xs text-purple-600 bg-purple-50 rounded-full px-2 py-0.5">
                                    <MousePointerClick className="h-3 w-3" />{eng.total_clicks}
                                  </span>
                                )}
                                {eng?.bounced && (
                                  <span className="inline-flex items-center gap-1 text-xs text-red-600 bg-red-50 rounded-full px-2 py-0.5">
                                    <AlertTriangle className="h-3 w-3" />bounced
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />{getCityLabel(sub.city)}
                                </span>
                                {sub.created_at && (
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />{formatDate(sub.created_at)}
                                  </span>
                                )}
                                {eng?.last_opened && (
                                  <span className="flex items-center gap-1 text-blue-500">
                                    <Eye className="h-3 w-3" />last opened {formatDateShort(eng.last_opened)}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex-shrink-0 ml-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs h-7"
                                disabled={updatingEmail === sub.email}
                                onClick={() => toggleStatus(sub)}
                              >
                                {updatingEmail === sub.email
                                  ? '...'
                                  : sub.status === 'active' ? 'Unsubscribe' : 'Resubscribe'}
                              </Button>
                            </div>
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
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* ── CAMPAIGNS TAB ── */}
        {activeTab === 'campaigns' && (
          <Card>
            <CardHeader>
              <CardTitle>Campaign Performance</CardTitle>
              <CardDescription>
                Open and click rates per send — requires webhook setup
              </CardDescription>
            </CardHeader>
            <CardContent>
              {campaigns.length > 0 ? (
                <div className="space-y-3">
                  {campaigns.map((c, i) => (
                    <div key={i} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div>
                          <div className="font-medium text-sm">{c.subject}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            Sent {formatDateShort(c.sent_at)}
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          {c.bounced > 0 && (
                            <span className="text-xs text-red-600 bg-red-50 rounded-full px-2 py-0.5">
                              {c.bounced} bounced
                            </span>
                          )}
                          {c.complained > 0 && (
                            <span className="text-xs text-orange-600 bg-orange-50 rounded-full px-2 py-0.5">
                              {c.complained} spam
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-3">
                        <div className="text-center">
                          <div className="text-lg font-bold text-gray-700">{c.delivered}</div>
                          <div className="text-xs text-muted-foreground">Delivered</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-blue-600">{c.opened}</div>
                          <div className="text-xs text-muted-foreground">Opened</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-blue-700">{c.open_rate}%</div>
                          <div className="text-xs text-muted-foreground">Open Rate</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-purple-600">{c.click_rate}%</div>
                          <div className="text-xs text-muted-foreground">Click Rate</div>
                        </div>
                      </div>
                      {/* Open rate bar */}
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>Open rate</span><span>{c.open_rate}%</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(c.open_rate, 100)}%` }} />
                        </div>
                      </div>
                      <div className="mt-1.5">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>Click rate</span><span>{c.click_rate}%</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-purple-500 rounded-full" style={{ width: `${Math.min(c.click_rate, 100)}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-12">
                  <BarChart2 className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="font-medium mb-1">No campaign data yet</p>
                  <p className="text-sm max-w-sm mx-auto">
                    Add the Resend webhook to start tracking opens and clicks.
                    Set the endpoint URL to{' '}
                    <code className="text-xs bg-gray-100 px-1 rounded">
                      https://www.culturealberta.com/api/webhooks/resend
                    </code>{' '}
                    in your Resend dashboard → Webhooks.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
