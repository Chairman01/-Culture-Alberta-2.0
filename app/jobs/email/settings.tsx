'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'

type State = { email: string; subscribed: boolean; frequency: 'daily' | 'weekly' }

/**
 * Daily, weekly or stop — reached from the footer of the jobs email.
 *
 * The link carries a token for one subscription, so there is no sign-in here:
 * plenty of people on the list never made an account, and nobody should have
 * to remember a password to get less email.
 */
export function JobsEmailSettings() {
  const token = useSearchParams().get('token') ?? ''
  const [state, setState] = useState<State | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!token) {
      setError('This link is missing its key. Open the settings link from a jobs email.')
      return
    }
    fetch(`/api/jobs-email/settings?token=${encodeURIComponent(token)}`)
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(setState)
      .catch(() => setError('This link is no longer valid. Open the settings link from your latest jobs email.'))
  }, [token])

  const act = async (action: 'daily' | 'weekly' | 'stop') => {
    setBusy(action)
    setSaved(false)
    try {
      const res = await fetch('/api/jobs-email/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, action }),
      })
      if (!res.ok) throw new Error()
      setState(await res.json())
      setSaved(true)
    } catch {
      setError('That did not save. Try again in a moment.')
    } finally {
      setBusy(null)
    }
  }

  if (error) {
    return (
      <>
        <h1 className="text-xl font-bold text-gray-900">Jobs email settings</h1>
        <p className="mt-3 text-sm text-gray-600">{error}</p>
        <Link href="/jobs" className="mt-5 inline-block text-sm font-medium text-blue-700 hover:underline">
          Back to the job board →
        </Link>
      </>
    )
  }
  if (!state) return <Loader2 className="mx-auto h-5 w-5 animate-spin text-gray-400" />

  const option = (value: 'daily' | 'weekly', title: string, detail: string) => {
    const current = state.subscribed && state.frequency === value
    return (
      <button
        type="button"
        onClick={() => act(value)}
        disabled={!!busy || current}
        aria-pressed={current}
        className={`w-full rounded-xl border p-4 text-left transition-colors disabled:cursor-default ${
          current ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-400'
        }`}
      >
        <span className="flex items-center justify-between text-sm font-semibold text-gray-900">
          {title}
          {busy === value
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : current ? <span className="text-xs font-medium text-blue-700">Current</span> : null}
        </span>
        <span className="mt-1 block text-sm text-gray-600">{detail}</span>
      </button>
    )
  }

  return (
    <>
      <h1 className="text-xl font-bold text-gray-900">Jobs email settings</h1>
      <p className="mt-2 text-sm text-gray-600">
        For <span className="font-medium text-gray-800">{state.email}</span>.{' '}
        {state.subscribed ? 'Choose how often you hear from us.' : 'Jobs emails are off for this address.'}
      </p>

      <div className="mt-5 space-y-3">
        {option('daily', 'Daily', 'New jobs each morning, at most one email a day. Nothing on days with nothing new.')}
        {option('weekly', 'Weekly', 'One email a week with everything new since the last one.')}
      </div>

      {state.subscribed && (
        <button
          type="button"
          onClick={() => act('stop')}
          disabled={!!busy}
          className="mt-5 text-sm font-medium text-gray-600 underline underline-offset-2 hover:text-gray-900 disabled:opacity-50"
        >
          {busy === 'stop' ? 'Stopping…' : 'Stop jobs emails'}
        </button>
      )}

      {saved && (
        <p className="mt-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800" role="status">
          {state.subscribed
            ? `Saved. You'll get jobs ${state.frequency}.`
            : 'Jobs emails are stopped. Nothing else you signed up for has changed.'}
        </p>
      )}

      <Link href="/jobs" className="mt-6 inline-block text-sm font-medium text-blue-700 hover:underline">
        Browse the job board →
      </Link>
    </>
  )
}
