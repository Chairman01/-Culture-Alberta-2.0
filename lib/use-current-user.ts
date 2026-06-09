'use client'

import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabaseBrowser } from '@/lib/supabase-browser'

export interface CurrentUser {
  user: User | null
  accessToken: string | null
  loading: boolean
}

/**
 * Tracks the current Supabase auth session in the browser.
 * Returns the user, a fresh access token (for Authorization: Bearer), and a loading flag.
 */
export function useCurrentUser(): CurrentUser {
  const [user, setUser] = useState<User | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    supabaseBrowser.auth.getSession().then(({ data }) => {
      if (!active) return
      setUser(data.session?.user ?? null)
      setAccessToken(data.session?.access_token ?? null)
      setLoading(false)
    })

    const { data: sub } = supabaseBrowser.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setAccessToken(session?.access_token ?? null)
      setLoading(false)
    })

    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  return { user, accessToken, loading }
}
