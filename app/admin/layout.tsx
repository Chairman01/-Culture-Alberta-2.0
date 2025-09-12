"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { BarChart2, FileText, Calendar, Award, Mail, RefreshCw } from "lucide-react"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (!isClient) return

    console.log("Admin layout: Checking authentication...")
    
    // Check if user is authenticated
    const adminAuthenticated = localStorage.getItem('admin_authenticated')
    const adminToken = localStorage.getItem('admin_token')
    const loginTime = localStorage.getItem('admin_login_time')
    
    console.log("Admin layout: Auth check results:", {
      adminAuthenticated,
      hasToken: !!adminToken,
      loginTime
    })
    
    // Check if token is expired (24 hours)
    if (loginTime) {
      const loginTimestamp = parseInt(loginTime)
      const now = Date.now()
      const hoursSinceLogin = (now - loginTimestamp) / (1000 * 60 * 60)
      
      if (hoursSinceLogin > 24) {
        console.log("Admin layout: Token expired, clearing storage")
        // Token expired, clear storage and redirect to login
        localStorage.removeItem('admin_authenticated')
        localStorage.removeItem('admin_token')
        localStorage.removeItem('admin_user')
        localStorage.removeItem('admin_login_time')
        setIsLoading(false)
        router.push('/admin/login')
        return
      }
    }
    
    if (!adminAuthenticated || !adminToken) {
      console.log("Admin layout: Not authenticated, redirecting to login")
      setIsLoading(false)
      router.push('/admin/login')
      return
    }
    
    console.log("Admin layout: Authenticated successfully")
    setIsAuthenticated(true)
    setIsLoading(false)
  }, [router, pathname, isClient])

  const navigation = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: BarChart2 },
    { name: 'Articles', href: '/admin/articles', icon: FileText },
    { name: 'Events', href: '/admin/events', icon: Calendar },
    { name: 'Best of Alberta', href: '/admin/best-of', icon: Award },
    { name: 'Newsletter', href: '/admin/newsletter', icon: Mail },
    { name: 'Sync Articles', href: '/admin/sync-articles', icon: RefreshCw },
  ]

  // Don't show the layout on the login page
  if (pathname === '/admin/login') {
    return <>{children}</>
  }

  // Show loading state while checking authentication or before client hydration
  if (isLoading || !isClient) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Checking admin access...</p>
        </div>
      </div>
    )
  }

  // Only show admin layout if authenticated
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 z-50">
        <div className="flex flex-col h-full">
          <div className="flex-1">
            {/* Logo */}
            <div className="h-16 flex items-center px-6 border-b">
              <Link href="/" className="text-xl font-bold">
                Culture Alberta
              </Link>
            </div>

            {/* Navigation */}
            <nav className="px-3 mt-6">
              {navigation.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-black text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.name}
                  </Link>
                )
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="pl-64">
        <main className="p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
