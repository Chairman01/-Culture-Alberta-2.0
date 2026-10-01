'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { CheckCircle, Loader2 } from 'lucide-react'

/**
 * The last step of an email-only jobs sign-up. One button, because the link in
 * the email must not subscribe by being opened — mail scanners open links.
 */
export function ConfirmJobsEmail() {
  const token = useSearchParams().get('token') ?? ''
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle')
  const [frequency, setFrequency] = useState<string>('daily')
  const [error, setError] = useState<string | null>(null)

  const confirm = async () => {
    setState('busy')
    setError(null)
    try {
      const res = await fetch('/api/jobs-email/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Could not confirm.')
      setFrequency(data.frequency ?? 'daily')
      setState('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not confirm.')
      setState('idle')
    }
  }

  if (state === 'done') {
    return (
      <>
        <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
        <h1 className="mt-4 text-xl font-bold text-gray-900">You&apos;re on the jobs email</h1>
        <p className="mt-2 text-sm text-gray-600">
          New Alberta jobs will arrive {frequency === 'daily' ? 'each morning there is something new' : 'once a week'}.
          Every email has a link to change how often, or stop.
        </p>
        <Link href="/jobs" className="mt-6 inline-block rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
          Browse the job board
        </Link>
      </>
    )
  }

  return (
    <>
      <h1 className="text-xl font-bold text-gray-900">Confirm your jobs email</h1>
      <p className="mt-2 text-sm text-gray-600">
        One click and we&apos;ll start sending you new Alberta jobs. Jobs only, and only when there is something new.
      </p>
      <button
        type="button"
        onClick={confirm}
        disabled={state === 'busy' || !token}
        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {state === 'busy' && <Loader2 className="h-4 w-4 animate-spin" />}
        Yes, email me new jobs
      </button>
      {!token && <p className="mt-3 text-sm text-red-700">This link is missing its key. Open it from the confirmation email.</p>}
      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
    </>
  )
}
