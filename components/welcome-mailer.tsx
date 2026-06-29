'use client'

import { useEffect, useRef } from 'react'
import { useAuth } from '@/components/auth-provider'
import { supabaseBrowser } from '@/lib/supabase-browser'

/**
 * Sends the one-time welcome email the first time an authenticated user is seen
 * without the `welcomed` flag. Works for every path — email signup, social
 * signup, and email signup that required confirmation (fires once they confirm
 * and sign in). Also backfills existing accounts on their next login.
 *
 * Idempotent twice over: a ref stops repeat fires within a session, and the
 * server only sends when `welcomed` isn't already set.
 */
export function WelcomeMailer() {
    const { user, loading } = useAuth()
    const firedRef = useRef(false)

    useEffect(() => {
        if (loading || !user || firedRef.current) return
        const welcomed = (user.user_metadata as { welcomed?: boolean } | undefined)?.welcomed
        if (welcomed) return

        firedRef.current = true
        ;(async () => {
            try {
                const { data } = await supabaseBrowser.auth.getSession()
                const token = data.session?.access_token
                if (token) {
                    await fetch('/api/welcome-email', {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${token}` },
                    })
                }
            } catch {
                /* best-effort */
            }
        })()
    }, [user, loading])

    return null
}
