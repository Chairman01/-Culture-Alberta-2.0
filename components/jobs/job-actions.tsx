'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Bookmark } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/components/auth-provider'
import { getJobTrackStatus, saveJob, unsaveJob, updateSavedJobStatus, advanceSavedJobStatus } from '@/lib/saved-jobs'
import { TrackBadge } from '@/components/jobs/track-badge'
import type { SavedJobStatus } from '@/lib/types/job'

/**
 * Apply + Save controls for a job posting page. Mirrors the save flow in
 * components/article-actions.tsx.
 *
 * Applying requires a free account: signed-out visitors are routed to
 * sign-in (and come straight back to this posting).
 *
 * A click records 'started', not 'applied'. It opens the employer's form in a
 * new tab and we never see the other side, so anyone who gave up on a long
 * Workday application used to be filed as having applied — the tracker was
 * answering "did you click apply" while calling it "applied". On the next
 * visit this asks, and only the answer promotes the row.
 */
export function JobActions({
  jobId,
  applyUrl,
  expired,
  company,
}: {
  jobId: string
  applyUrl: string
  expired: boolean
  company?: string
}) {
  const { toast } = useToast()
  const { user } = useAuth()
  const router = useRouter()
  const [status, setStatus] = useState<SavedJobStatus | null>(null)
  const [busy, setBusy] = useState(false)
  // Set once the visitor answers (or waves off) the did-you-finish prompt, so
  // it can't reappear on the same page view.
  const [asked, setAsked] = useState(false)

  const isSaved = status !== null

  useEffect(() => {
    let active = true
    if (!user) {
      setStatus(null)
      return
    }
    getJobTrackStatus(jobId)
      .then(v => active && setStatus(v))
      .catch(() => {})
    return () => { active = false }
  }, [user, jobId])

  const handleSave = useCallback(async () => {
    if (busy) return
    if (!user) {
      const next = encodeURIComponent(window.location.pathname)
      router.push(`/auth/signin?next=${next}`)
      toast({ title: 'Sign in to save jobs', description: 'Create a free account to save jobs and track your applications.' })
      return
    }
    setBusy(true)
    try {
      if (isSaved) {
        await unsaveJob(jobId)
        setStatus(null)
        toast({ title: 'Removed', description: 'Job removed from your tracker.' })
      } else {
        await saveJob(user.id, jobId)
        setStatus('saved')
        toast({ title: 'Saved!', description: 'Track it under Account → My Jobs.' })
      }
    } catch {
      toast({ title: 'Something went wrong', description: 'Could not update your saved jobs.', variant: 'destructive' })
    } finally {
      setBusy(false)
    }
  }, [busy, user, isSaved, jobId, router, toast])

  const handleApply = useCallback(async (e: React.MouseEvent) => {
    // Applying requires a free account — send signed-out visitors to
    // sign-in and bring them straight back to this posting.
    if (!user) {
      e.preventDefault()
      const next = encodeURIComponent(window.location.pathname)
      router.push(`/auth/signin?next=${next}`)
      toast({
        title: 'Create a free account to apply',
        description: 'Sign in to apply, save jobs, and track your applications.',
      })
      return
    }
    // Signed in: the <a> opens the employer page. Record only what the click
    // proves — and never knock a further-along job backwards.
    try {
      const now = await advanceSavedJobStatus(user.id, jobId, 'started')
      setStatus(now)
      // Re-arm the prompt: they're off to the form, so the question is live
      // again when they come back.
      setAsked(false)
      if (now === 'started') {
        toast({ title: 'Application started', description: "We'll ask if you finished when you come back." })
      }
    } catch {
      // Tracking is best-effort — never block the application itself
    }
  }, [user, jobId, router, toast])

  const confirmApplied = useCallback(async (finished: boolean) => {
    setAsked(true)
    if (!finished) return
    try {
      await updateSavedJobStatus(jobId, 'applied')
      setStatus('applied')
      toast({ title: 'Marked as applied', description: 'Track this application under Account → My Jobs.' })
    } catch {
      toast({ title: 'Something went wrong', description: 'Could not update your tracker.', variant: 'destructive' })
    }
  }, [jobId, toast])

  const applyLabel = user
    ? status && status !== 'saved' && status !== 'started'
      ? 'Apply again →'
      : company ? `Apply at ${company} →` : 'Apply on employer site →'
    : 'Sign in free to apply →'

  return (
    <>
      {/* Asked only after a click-through that hasn't been resolved yet. This
          is the whole point of 'started': the answer is the only thing that
          can turn it into a real application. */}
      {user && status === 'started' && !asked && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">
            Did you finish your application{company ? ` to ${company}` : ''}?
          </p>
          <p className="mt-0.5 text-sm text-amber-800">
            You opened the application form. We can&apos;t see the employer&apos;s site, so only you know how it went.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => confirmApplied(true)}
              className="rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
            >
              Yes, I applied
            </button>
            <button
              onClick={() => confirmApplied(false)}
              className="rounded-md border border-amber-400 bg-white px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100"
            >
              Not yet
            </button>
          </div>
        </div>
      )}

      {user && status && status !== 'saved' && (
        <div className="mb-4 flex items-center gap-2">
          <TrackBadge status={status} />
          <span className="text-sm text-gray-600">
            {status === 'started'
              ? 'You opened this application.'
              : 'Update this under Account → My Jobs.'}
          </span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {!expired && (
          <a
            href={applyUrl}
            target="_blank"
            rel="nofollow noopener"
            onClick={handleApply}
            className="inline-flex items-center rounded-md bg-blue-600 px-6 py-3 text-base font-semibold text-white hover:bg-blue-700"
          >
            {applyLabel}
          </a>
        )}
        <button
          onClick={handleSave}
          disabled={busy}
          className={`inline-flex items-center gap-2 rounded-md border px-4 py-3 text-sm font-medium transition-colors disabled:opacity-50 ${
            isSaved ? 'border-blue-600 text-blue-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
          aria-pressed={isSaved}
        >
          <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`} />
          {isSaved ? 'Saved' : 'Save job'}
        </button>
      </div>

      {/* Descriptions run to several thousand words, so by the time someone has
          decided to apply the button is far off-screen. This keeps it reachable
          on mobile without a scroll back to the top. */}
      {!expired && (
        <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-2 border-t border-gray-200 bg-white/95 p-3 shadow-[0_-2px_10px_rgba(0,0,0,0.06)] backdrop-blur md:hidden">
          <a
            href={applyUrl}
            target="_blank"
            rel="nofollow noopener"
            onClick={handleApply}
            className="flex-1 rounded-md bg-blue-600 px-4 py-3 text-center text-sm font-semibold text-white"
          >
            {applyLabel}
          </a>
          <button
            onClick={handleSave}
            disabled={busy}
            aria-label={isSaved ? 'Saved' : 'Save job'}
            aria-pressed={isSaved}
            className={`rounded-md border px-4 py-3 disabled:opacity-50 ${
              isSaved ? 'border-blue-600 text-blue-700' : 'border-gray-300 text-gray-700'
            }`}
          >
            <Bookmark className={`h-5 w-5 ${isSaved ? 'fill-current' : ''}`} />
          </button>
        </div>
      )}
    </>
  )
}
