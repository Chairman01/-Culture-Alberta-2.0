'use client'

import { useCallback, useEffect, useState } from 'react'
import { Mail, X, Check } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { supabaseBrowser } from '@/lib/supabase-browser'

/**
 * "Get new jobs by email" for a signed-in member who hasn't asked for it yet.
 *
 * Most members made an account to click Apply and were never offered the jobs
 * email: the sign-up box only appears on one of the routes in. This is the
 * second chance, on the board itself, and one click is the whole form — the
 * address is the one on their account and the city is the one on their profile.
 *
 * Choosing Daily or Weekly is the consent. Nothing is pre-selected, and closing
 * the card is remembered so it doesn't nag.
 */

const DISMISSED_KEY = 'jobs_email_optin_dismissed'

async function accessToken(): Promise<string | null> {
  const { data } = await supabaseBrowser.auth.getSession()
  return data.session?.access_token ?? null
}

export function JobsEmailOptIn({ areaLabel }: { areaLabel: string }) {
  const { user, loading } = useAuth()
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState<'daily' | 'weekly' | null>(null)
  const [done, setDone] = useState<'daily' | 'weekly' | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (loading || !user) return
    try {
      if (localStorage.getItem(DISMISSED_KEY)) return
    } catch {
      /* no storage — show it; the worst case is seeing it again */
    }
    let active = true
    ;(async () => {
      try {
        const token = await accessToken()
        if (!token) return
        const res = await fetch('/api/jobs-email/me', { headers: { Authorization: `Bearer ${token}` } })
        if (!res.ok) return
        const { subscribed } = await res.json()
        if (active && !subscribed) setShow(true)
      } catch {
        /* the board works without it */
      }
    })()
    return () => { active = false }
  }, [user, loading])

  const dismiss = useCallback(() => {
    setShow(false)
    try { localStorage.setItem(DISMISSED_KEY, '1') } catch { /* fine */ }
  }, [])

  const choose = useCallback(async (frequency: 'daily' | 'weekly') => {
    setBusy(frequency)
    setFailed(false)
    try {
      const token = await accessToken()
      if (!token) throw new Error('no session')
      const res = await fetch('/api/jobs-email/me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ frequency, path: window.location.pathname }),
      })
      if (!res.ok) throw new Error('save failed')
      setDone(frequency)
    } catch {
      setFailed(true)
    } finally {
      setBusy(null)
    }
  }, [])

  if (!show || !user) return null

  if (done) {
    return (
      <div className="mb-4 flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4" role="status">
        <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-700" />
        <p className="text-sm text-green-900">
          <span className="font-semibold">You&apos;re on the jobs email.</span>{' '}
          New {areaLabel} jobs will go to {user.email}{' '}
          {done === 'daily' ? 'each morning there is something new' : 'once a week'}. Every email has a link
          to change this or stop.
        </p>
      </div>
    )
  }

  return (
    <div className="relative mb-4 rounded-xl border border-blue-200 bg-blue-50 p-4 pr-10">
      <button
        type="button"
        onClick={dismiss}
        aria-label="No thanks"
        className="absolute right-2 top-2 rounded-full p-1.5 text-blue-900/60 hover:bg-blue-100 hover:text-blue-900"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3">
        <Mail className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-700" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900">Get new {areaLabel} jobs by email</p>
          <p className="mt-0.5 text-sm text-gray-700">
            New postings sent to {user.email}, so you can apply while they&apos;re fresh. Jobs only, and only
            when there is something new. Stop any time.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => choose('daily')}
              disabled={!!busy}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {busy === 'daily' ? 'Saving…' : 'Email me daily'}
            </button>
            <button
              type="button"
              onClick={() => choose('weekly')}
              disabled={!!busy}
              className="rounded-lg border border-blue-300 bg-white px-4 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-100 disabled:opacity-60"
            >
              {busy === 'weekly' ? 'Saving…' : 'Email me weekly'}
            </button>
          </div>
          {failed && <p className="mt-2 text-xs text-red-700">That didn&apos;t save. Try again in a moment.</p>}
        </div>
      </div>
    </div>
  )
}
