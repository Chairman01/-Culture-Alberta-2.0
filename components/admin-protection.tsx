"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export default function AdminProtection({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [isClient, setIsClient] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (!isClient) return

    // Check authentication
    const adminAuthenticated = localStorage.getItem('admin_authenticated')
    const adminToken = localStorage.getItem('admin_token')
    
    if (!adminAuthenticated || !adminToken) {
      setIsLoading(false)
      router.push('/admin/login')
      return
    }
    
    setIsAuthenticated(true)
    setIsLoading(false)
  }, [router, isClient])

  if (!isClient || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Checking admin access...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">Please log in to access the admin panel.</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
