"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { BarChart2, FileText, Calendar, Award } from "lucide-react"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Check if user is authenticated
    const adminAuth = localStorage.getItem('adminAuth')
    if (!adminAuth && pathname !== '/admin/login') {
      router.push('/admin/login')
    }
  }, [router, pathname])

  const navigation = [
    { name: 'Dashboard', href: '/admin', icon: BarChart2 },
    { name: 'Articles', href: '/admin/articles', icon: FileText },
    { name: 'Events', href: '/admin/events', icon: Calendar },
    { name: 'Best of Alberta', href: '/admin/best-of', icon: Award },
  ]

  // Don't show the layout on the login page
  if (pathname === '/admin/login') {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200">
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
