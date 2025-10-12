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
  RefreshCw
} from 'lucide-react'
import Link from 'next/link'

export default function AdminDashboard() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [refreshMessage, setRefreshMessage] = useState('')

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