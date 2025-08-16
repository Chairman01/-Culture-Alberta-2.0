"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getAnalyticsData } from '@/lib/analytics'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { 
  Home, 
  Eye, 
  TrendingUp, 
  Users, 
  Calendar, 
  MapPin, 
  FileText,
  Star,
  BarChart3,
  Activity,
  RefreshCw
} from 'lucide-react'
import Link from 'next/link'

export default function AdminDashboard() {
  const router = useRouter()
  const [analyticsData, setAnalyticsData] = useState<any>(null)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  useEffect(() => {
    // Check authentication using localStorage (same as admin layout)
    const adminAuthenticated = localStorage.getItem('admin_authenticated')
    setIsAuthenticated(adminAuthenticated === 'true')
    setIsLoading(false)

    if (!adminAuthenticated) {
      router.push('/admin/login')
    }
  }, [router])

  const fetchAnalyticsData = async () => {
    try {
      const realData = await getAnalyticsData()
      
      if (realData) {
        setAnalyticsData(realData)
      } else {
        setAnalyticsData({
          totalVisits: 0,
          weeklyVisits: 0,
          dailyVisits: 0,
          uniqueSessions: 0,
          popularPages: [],
          contentStats: {
            articles: 0,
            events: 0,
            bestOf: 0,
            edmonton: 0,
            calgary: 0,
          },
          recentActivity: []
        })
      }
      setLastUpdated(new Date())
    } catch (error) {
      console.error('Error fetching analytics data:', error)
      setAnalyticsData({
        totalVisits: 0,
        weeklyVisits: 0,
        dailyVisits: 0,
        uniqueSessions: 0,
        popularPages: [],
        contentStats: {
          articles: 0,
          events: 0,
          bestOf: 0,
          edmonton: 0,
          calgary: 0,
        },
        recentActivity: []
      })
    } finally {
      setIsLoadingData(false)
    }
  }

  useEffect(() => {
    setTimeout(() => fetchAnalyticsData(), 100)
  }, [])

  // Auto-refresh data every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchAnalyticsData()
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  if (isLoading || isLoadingData) {
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
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Welcome back, Admin</p>
            <div className="flex items-center gap-2 mt-2">
              {analyticsData && analyticsData.totalVisits > 0 ? (
                <Badge variant="secondary">
                  Real-time data
                </Badge>
              ) : (
                <Badge variant="outline">
                  No data yet
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={fetchAnalyticsData}
              disabled={isLoadingData}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoadingData ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button asChild>
              <Link href="/">
                <Home className="mr-2 h-4 w-4" />
                View Site
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Visits</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analyticsData?.totalVisits?.toLocaleString() || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Weekly Visits</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analyticsData?.weeklyVisits?.toLocaleString() || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Last 7 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Daily Visits</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analyticsData?.dailyVisits?.toLocaleString() || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Today</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Unique Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analyticsData?.uniqueSessions?.toLocaleString() || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Total sessions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Content Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(
                  (analyticsData?.contentStats?.articles || 0) +
                  (analyticsData?.contentStats?.events || 0) +
                  (analyticsData?.contentStats?.bestOf || 0) +
                  (analyticsData?.contentStats?.edmonton || 0) +
                  (analyticsData?.contentStats?.calgary || 0)
                ).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Total content items</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="mb-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="traffic">Traffic</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Popular Pages</CardTitle>
                  <CardDescription>Most visited pages in the last 30 days</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analyticsData?.popularPages && analyticsData.popularPages.length > 0 ? (
                      analyticsData.popularPages.map((page: any, index: number) => (
                        <div key={index} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Eye className="h-4 w-4 text-muted-foreground" />
                            <span>{page.name}</span>
                          </div>
                          <span className="font-medium">{page.visits.toLocaleString()} visits</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-muted-foreground py-8">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                          <Eye className="h-6 w-6 text-gray-400" />
                        </div>
                        <p className="text-sm">No page view data available yet</p>
                        <p className="text-xs text-gray-400 mt-1">Visit your website to start collecting data</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Content Distribution</CardTitle>
                  <CardDescription>Breakdown of content by type</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-center">
                  <div className="w-full max-w-md space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-primary"></div>
                        <span>Articles</span>
                      </div>
                      <span>{analyticsData?.contentStats?.articles || 0} items</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-blue-500"></div>
                        <span>Edmonton</span>
                      </div>
                      <span>{analyticsData?.contentStats?.edmonton || 0} items</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-red-500"></div>
                        <span>Calgary</span>
                      </div>
                      <span>{analyticsData?.contentStats?.calgary || 0} items</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-amber-500"></div>
                        <span>Events</span>
                      </div>
                      <span>{analyticsData?.contentStats?.events || 0} items</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="content" className="mt-4">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Articles
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{analyticsData?.contentStats?.articles || 0}</div>
                  <p className="text-sm text-muted-foreground">Total articles</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Events
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{analyticsData?.contentStats?.events || 0}</div>
                  <p className="text-sm text-muted-foreground">Total events</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5" />
                    Best of Alberta
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{analyticsData?.contentStats?.bestOf || 0}</div>
                  <p className="text-sm text-muted-foreground">Featured content</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="traffic" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Traffic Analytics</CardTitle>
                <CardDescription>Visitor statistics for your website</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h3 className="font-semibold">Traffic Sources</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center justify-between p-2 border rounded">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-muted-foreground" />
                          <span>Direct</span>
                        </div>
                        <span className="font-medium">45%</span>
                      </div>
                      <div className="flex items-center justify-between p-2 border rounded">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-muted-foreground" />
                          <span>Search</span>
                        </div>
                        <span className="font-medium">32%</span>
                      </div>
                      <div className="flex items-center justify-between p-2 border rounded">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-muted-foreground" />
                          <span>Social</span>
                        </div>
                        <span className="font-medium">18%</span>
                      </div>
                      <div className="flex items-center justify-between p-2 border rounded">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-muted-foreground" />
                          <span>Referral</span>
                        </div>
                        <span className="font-medium">5%</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-semibold">User Engagement</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-4 border rounded">
                        <div className="text-2xl font-bold">2.5m</div>
                        <p className="text-sm text-muted-foreground">Avg. Session Duration</p>
                      </div>
                      <div className="text-center p-4 border rounded">
                        <div className="text-2xl font-bold">3.2</div>
                        <p className="text-sm text-muted-foreground">Pages per Session</p>
                      </div>
                      <div className="text-center p-4 border rounded">
                        <div className="text-2xl font-bold">68%</div>
                        <p className="text-sm text-muted-foreground">Bounce Rate</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
