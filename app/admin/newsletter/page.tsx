"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getAllNewsletterSubscriptions, getNewsletterStats } from "@/lib/newsletter"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Mail, Users, MapPin, Calendar } from "lucide-react"
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

export default function NewsletterAdmin() {
  const router = useRouter()
  const [subscriptions, setSubscriptions] = useState<NewsletterSubscription[]>([])
  const [stats, setStats] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    // Check authentication using localStorage (same as admin layout)
    const adminAuthenticated = localStorage.getItem("admin_authenticated")
    setIsAuthenticated(adminAuthenticated === "true")

    if (!adminAuthenticated) {
      router.push("/admin/login")
      return
    }

    // Load newsletter data
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

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return 'Invalid date'
    }
  }

  const getCityLabel = (city: string) => {
    switch (city) {
      case 'calgary': return 'Calgary'
      case 'edmonton': return 'Edmonton'
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
              <h1 className="text-2xl font-bold">Newsletter Subscriptions</h1>
              <p className="text-muted-foreground">Manage your newsletter subscribers</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Total Subscribers
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
                  Active Subscribers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.active}</div>
                <p className="text-xs text-muted-foreground mt-1">Currently subscribed</p>
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
                <div className="text-2xl font-bold text-red-600">{stats.byCity.calgary}</div>
                <p className="text-xs text-muted-foreground mt-1">Active subscribers</p>
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
                <div className="text-2xl font-bold text-blue-600">{stats.byCity.edmonton}</div>
                <p className="text-xs text-muted-foreground mt-1">Active subscribers</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Subscriptions List */}
        <Card>
          <CardHeader>
            <CardTitle>All Subscriptions</CardTitle>
            <CardDescription>
              {subscriptions.length} total subscriptions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {subscriptions.length > 0 ? (
                <>
                  {/* Copyable Data Section */}
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-medium mb-3">Copyable Data (Email | City)</h3>
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
  )
}
