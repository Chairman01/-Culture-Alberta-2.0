"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

// Check if we're in development environment
const isDevelopment = process.env.NODE_ENV === 'development'

export default function AdminProtection({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()

  useEffect(() => {
    // Block admin access in production
    if (!isDevelopment) {
      router.push('/')
    }
  }, [router])

  // Block admin access in production
  if (!isDevelopment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">Admin panel is only available in development mode.</p>
          <Link href="/" className="mt-4 inline-block text-blue-600 hover:underline">
            Return to Home
          </Link>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
