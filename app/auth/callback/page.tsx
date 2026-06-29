'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'

export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code')
      if (code) {
        try {
          const { error } = await supabaseBrowser.auth.exchangeCodeForSession(code)
          if (error) throw error
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
