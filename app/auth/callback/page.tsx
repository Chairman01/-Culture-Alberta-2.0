'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'

export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  // Fire the one-time welcome email for a freshly-authenticated user.
  // Idempotent server-side (a `welcomed` flag), so calling it on every OAuth
  // callback is safe — it only actually sends on the first sign-up.
  const fireWelcomeEmail = (token?: string) => {
    if (!token) return
    fetch('/api/welcome-email', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      keepalive: true,
    }).catch(() => {})
  }

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code')
      if (code) {
        try {
          const { data, error } = await supabaseBrowser.auth.exchangeCodeForSession(code)
          if (error) throw error
          fireWelcomeEmail(data.session?.access_token)
          router.replace('/')
          router.refresh()
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Authentication failed')
        }
      } else {
        // Implicit flow: check for hash params (client may have already processed)
        const hashParams = typeof window !== 'undefined' ? window.location.hash : ''
        if (hashParams) {
          // Give Supabase client a moment to process the hash
          await new Promise(r => setTimeout(r, 500))
          const { data } = await supabaseBrowser.auth.getSession()
          fireWelcomeEmail(data.session?.access_token)
          router.replace('/')
          router.refresh()
        } else {
          setError('No authentication code received')
        }
      }
    }
    handleCallback()
  }, [searchParams, router])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <a href="/auth/signin" className="text-blue-600 hover:underline">Return to sign in</a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse text-gray-500">Signing you in...</div>
    </div>
  )
}
