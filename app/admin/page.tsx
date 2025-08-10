"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { BarChart, Users, FileText, Calendar, Award, Settings, LogOut, Home, TrendingUp, Eye } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const { toast } = useToast()

  // Check authentication on component mount
  useEffect(() => {
    const checkAuth = () => {
      const authenticated = localStorage.getItem("admin_authenticated") === "true"
      setIsAuthenticated(authenticated)
      setIsLoading(false)

      if (!authenticated) {
        router.push("/admin/login")
      }
    }

    checkAuth()
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem("admin_authenticated")
    localStorage.removeItem("admin_user")
    localStorage.removeItem("admin_login_time")

    toast({
      title: "Logged out",
      description: "You have been successfully logged out",
    })

    router.push("/admin/login")
  }

  // Generate some mock analytics data
  const generateMockData = () => {
    const today = new Date()
    const lastWeek = new Date(today)
    lastWeek.setDate(lastWeek.getDate() - 7)

    return {
      totalVisits: Math.floor(Math.random() * 10000) + 5000,
      weeklyVisits: Math.floor(Math.random() * 2000) + 1000,
      dailyVisits: Math.floor(Math.random() * 500) + 100,
      popularPages: [
        { name: "Homepage", visits: Math.floor(Math.random() * 1000) + 500 },
        { name: "Articles", visits: Math.floor(Math.random() * 800) + 300 },
        { name: "Events", visits: Math.floor(Math.random() * 600) + 200 },
        { name: "Best of Alberta", visits: Math.floor(Math.random() * 500) + 100 },
        { name: "About", visits: Math.floor(Math.random() * 300) + 50 },
      ],
      contentStats: {
        articles: Math.floor(Math.random() * 50) + 20,
        events: Math.floor(Math.random() * 30) + 10,
        bestOf: Math.floor(Math.random() * 40) + 15,
        edmonton: Math.floor(Math.random() * 25) + 10,
        calgary: Math.floor(Math.random() * 25) + 10,
      },
    }
  }

  const analyticsData = generateMockData()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null // Router will redirect to login
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <div className="w-64 bg-muted/40 border-r p-4 hidden md:block">
        <div className="space-y-2 mb-8">
          <h2 className="text-xl font-bold">Culture Alberta</h2>
          <p className="text-sm text-muted-foreground">Admin Dashboard</p>
        </div>

        <nav className="space-y-1">
          <Link
            href="/admin"
            className="flex items-center gap-2 p-2 rounded-md bg-primary/10 text-primary font-medium"
          >
            <BarChart className="h-4 w-4" />
            <span>Dashboard</span>
          </Link>
          <Link
            href="/admin/articles"
            className="flex items-center gap-2 p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
          >
            <FileText className="h-4 w-4" />
            <span>Articles</span>
          </Link>
          <Link
            href="/admin/events"
            className="flex items-center gap-2 p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
          >
            <Calendar className="h-4 w-4" />
            <span>Events</span>
          </Link>
          <Link
            href="/admin/best-of"
            className="flex items-center gap-2 p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
          >
            <Award className="h-4 w-4" />
            <span>Best of Alberta</span>
          </Link>
          <Link
            href="/admin/users"
            className="flex items-center gap-2 p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
          >
            <Users className="h-4 w-4" />
            <span>Users</span>
          </Link>
          <Link
            href="/admin/settings"
            className="flex items-center gap-2 p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
          >
            <Settings className="h-4 w-4" />
            <span>Settings</span>
            </Link>
        </nav>

        <div className="absolute bottom-4 w-56">
          <Button variant="ghost" className="w-full justify-start" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        {/* Top navigation for mobile */}
        <div className="md:hidden flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold">Culture Alberta</h2>
          <Button variant="ghost" size="icon">
            <LogOut className="h-5 w-5" onClick={handleLogout} />
          </Button>
        </div>

        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">Dashboard</h1>
              <p className="text-muted-foreground">Welcome back, Admin</p>
            </div>
            <Button asChild>
              <Link href="/">
                <Home className="mr-2 h-4 w-4" />
                View Site
              </Link>
            </Button>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Visits</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analyticsData.totalVisits.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">All time</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Weekly Visits</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analyticsData.weeklyVisits.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">Last 7 days</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Daily Visits</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analyticsData.dailyVisits.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">Today</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Content Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(
                    analyticsData.contentStats.articles +
                    analyticsData.contentStats.events +
                    analyticsData.contentStats.bestOf +
                    analyticsData.contentStats.edmonton +
                    analyticsData.contentStats.calgary
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
                      {analyticsData.popularPages.map((page, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Eye className="h-4 w-4 text-muted-foreground" />
                            <span>{page.name}</span>
                          </div>
                          <span className="font-medium">{page.visits.toLocaleString()} visits</span>
                        </div>
                      ))}
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
                        <span>{analyticsData.contentStats.articles} items</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full bg-blue-500"></div>
                          <span>Edmonton</span>
                        </div>
                        <span>{analyticsData.contentStats.edmonton} items</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full bg-red-500"></div>
                          <span>Calgary</span>
                        </div>
                        <span>{analyticsData.contentStats.calgary} items</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full bg-amber-500"></div>
                          <span>Events</span>
                        </div>
                        <span>{analyticsData.contentStats.events} items</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full bg-green-500"></div>
                          <span>Best of Alberta</span>
                        </div>
                        <span>{analyticsData.contentStats.bestOf} items</span>
                      </div>
            </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="content" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Content Management</CardTitle>
                  <CardDescription>Manage your website content</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-6 md:grid-cols-3">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">Articles</h3>
                        <span className="text-sm text-muted-foreground">
                          {analyticsData.contentStats.articles} items
                        </span>
                      </div>
                      <div className="space-y-2">
                        <Button asChild variant="outline" className="w-full justify-start">
                          <Link href="/admin/articles">
                            <FileText className="mr-2 h-4 w-4" />
                            Manage Articles
                          </Link>
                        </Button>
                        <Button asChild variant="outline" className="w-full justify-start">
                          <Link href="/admin/articles/new">
                            <FileText className="mr-2 h-4 w-4" />
                            Create New Article
                          </Link>
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">Events</h3>
                        <span className="text-sm text-muted-foreground">{analyticsData.contentStats.events} items</span>
                      </div>
                      <div className="space-y-2">
                        <Button asChild variant="outline" className="w-full justify-start">
                          <Link href="/admin/events">
                            <Calendar className="mr-2 h-4 w-4" />
                            Manage Events
                          </Link>
                        </Button>
                        <Button asChild variant="outline" className="w-full justify-start">
                          <Link href="/admin/new-event">
                            <Calendar className="mr-2 h-4 w-4" />
                            Create New Event
                          </Link>
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">Best of Alberta</h3>
                        <span className="text-sm text-muted-foreground">{analyticsData.contentStats.bestOf} items</span>
                      </div>
                      <div className="space-y-2">
                        <Button asChild variant="outline" className="w-full justify-start">
                          <Link href="/admin/best-of">
                            <Award className="mr-2 h-4 w-4" />
                            Manage Listings
                          </Link>
                        </Button>
                        <Button asChild variant="outline" className="w-full justify-start">
                          <Link href="/admin/new-bestof">
                            <Award className="mr-2 h-4 w-4" />
                            Create New Listing
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
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
                      <h3 className="font-semibold">Visitor Demographics</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium">Age Groups</h4>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-sm">18-24</span>
                              <span className="text-sm">15%</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm">25-34</span>
                              <span className="text-sm">32%</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm">35-44</span>
                              <span className="text-sm">28%</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm">45-54</span>
                              <span className="text-sm">18%</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm">55+</span>
                              <span className="text-sm">7%</span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h4 className="text-sm font-medium">Locations</h4>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-sm">Edmonton</span>
                              <span className="text-sm">42%</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm">Calgary</span>
                              <span className="text-sm">38%</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm">Other Alberta</span>
                              <span className="text-sm">15%</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm">Rest of Canada</span>
                              <span className="text-sm">3%</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm">International</span>
                              <span className="text-sm">2%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest actions on the website</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="rounded-full bg-primary/10 p-2">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">New article published</p>
                      <p className="text-sm text-muted-foreground">The Indigenous Art Renaissance in Alberta</p>
                      <p className="text-xs text-muted-foreground">2 hours ago</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="rounded-full bg-primary/10 p-2">
                      <Calendar className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Event updated</p>
                      <p className="text-sm text-muted-foreground">Edmonton International Film Festival</p>
                      <p className="text-xs text-muted-foreground">Yesterday</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="rounded-full bg-primary/10 p-2">
                      <Award className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">New Best of Alberta listing</p>
                      <p className="text-sm text-muted-foreground">Calgary Steakhouse added to Restaurants</p>
                      <p className="text-xs text-muted-foreground">2 days ago</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="rounded-full bg-primary/10 p-2">
                      <Users className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">New user registered</p>
                      <p className="text-sm text-muted-foreground">editor@culturealberta.ca</p>
                      <p className="text-xs text-muted-foreground">3 days ago</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common administrative tasks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <Button asChild variant="outline" className="h-auto flex flex-col items-center justify-center p-4">
                    <Link href="/admin/articles/new">
                      <FileText className="h-6 w-6 mb-2" />
                      <span>New Article</span>
                    </Link>
                  </Button>

                  <Button asChild variant="outline" className="h-auto flex flex-col items-center justify-center p-4">
                    <Link href="/admin/new-event">
                      <Calendar className="h-6 w-6 mb-2" />
                      <span>New Event</span>
                    </Link>
                  </Button>

                  <Button asChild variant="outline" className="h-auto flex flex-col items-center justify-center p-4">
                    <Link href="/admin/new-bestof">
                      <Award className="h-6 w-6 mb-2" />
                      <span>New Listing</span>
                    </Link>
                  </Button>

                  <Button asChild variant="outline" className="h-auto flex flex-col items-center justify-center p-4">
                    <Link href="/admin/settings">
                      <Settings className="h-6 w-6 mb-2" />
                      <span>Settings</span>
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
