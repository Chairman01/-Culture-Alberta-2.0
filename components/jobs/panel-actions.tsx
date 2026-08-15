'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bookmark, Check, ExternalLink } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { useToast } from '@/hooks/use-toast'
import {
  saveJob, unsaveJob, updateSavedJobStatus, advanceSavedJobStatus,
} from '@/lib/saved-jobs'
import type { SavedJobStatus } from '@/lib/types/job'

/**
 * Apply / Interested / Applied controls for the board's detail panel.
 *
 * The posting page has the fuller version (components/jobs/job-actions.tsx)
 * including the did-you-finish prompt. This is the scanning version: the point
 * of the panel is to work through a list without leaving it, so the two marks
 * anyone actually makes while scanning are one click each.
 *
 * Status lives in the parent so the list badges update the moment a mark is
 * made, rather than on the next page load.
 */
export function JobPanelActions({
  jobId,
  applyUrl,
  company,
  expired,
  status,
  onStatusChange,
}: {
  jobId: string
  applyUrl: string | null
  company: string
  expired: boolean
  status: SavedJobStatus | null
  onStatusChange: (jobId: string, status: SavedJobStatus | null) => void
}) {
  const { user } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  const interested = status !== null
  const applied = status === 'applied' || status === 'interviewing' || status === 'offer' || status === 'rejected'

  const requireAccount = useCallback((what: string) => {
    router.push(`/auth/signin?next=${encodeURIComponent('/jobs')}`)
    toast({ title: `Sign in to ${what}`, description: 'A free account keeps your jobs and applications in one place.' })
  }, [router, toast])

  const toggleInterested = useCallback(async () => {
    if (busy) return
    if (!user) return requireAccount('save jobs')
    setBusy(true)
    try {
      if (interested) {
        await unsaveJob(jobId)
        onStatusChange(jobId, null)
      } else {
        await saveJob(user.id, jobId)
        onStatusChange(jobId, 'saved')
        toast({ title: 'Saved', description: 'Find it under Account → My Jobs.' })
      }
    } catch {
      toast({ title: 'Something went wrong', description: 'Could not update your tracker.', variant: 'destructive' })
    } finally {
      setBusy(false)
    }
  }, [busy, user, interested, jobId, onStatusChange, requireAccount, toast])

  const toggleApplied = useCallback(async () => {
    if (busy) return
    if (!user) return requireAccount('track applications')
    setBusy(true)
    try {
      if (applied) {
        // Undo only ever steps back to 'saved'. Nothing further along is
        // recoverable from a mis-click, and guessing would be worse.
        await updateSavedJobStatus(jobId, 'saved')
        onStatusChange(jobId, 'saved')
      } else {
        await advanceSavedJobStatus(user.id, jobId, 'applied')
        onStatusChange(jobId, 'applied')
        toast({ title: 'Marked as applied', description: `Tracked under Account → My Jobs.` })
      }
    } catch {
      toast({ title: 'Something went wrong', description: 'Could not update your tracker.', variant: 'destructive' })
    } finally {
      setBusy(false)
    }
  }, [busy, user, applied, jobId, onStatusChange, requireAccount, toast])

  // Opening the employer's form proves only that — 'started', never 'applied'.
  const handleApply = useCallback(async (e: React.MouseEvent) => {
    if (!user) {
      e.preventDefault()
      return requireAccount('apply')
    }
    try {
      const now = await advanceSavedJobStatus(user.id, jobId, 'started')
      onStatusChange(jobId, now)
    } catch {
      // Tracking is best-effort — never block the application itself.
    }
  }, [user, jobId, onStatusChange, requireAccount])

  return (
    <div className="mt-6 space-y-3">
      {!expired && applyUrl && (
        <a
          href={applyUrl}
          target="_blank"
          rel="nofollow noopener"
          onClick={handleApply}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
        >
          {user ? `Apply at ${company}` : 'Sign in free to apply'}
          <ExternalLink className="h-4 w-4" />
        </a>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={toggleInterested}
          disabled={busy}
          aria-pressed={interested}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 ${
            interested
              ? 'border-blue-600 bg-blue-50 text-blue-700'
              : 'border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Bookmark className={`h-4 w-4 ${interested ? 'fill-current' : ''}`} />
          {interested ? 'Interested' : "I'm interested"}
        </button>
        <button
          type="button"
          onClick={toggleApplied}
          disabled={busy}
          aria-pressed={applied}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 ${
            applied
              ? 'border-green-600 bg-green-50 text-green-700'
              : 'border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Check className="h-4 w-4" />
          {applied ? 'Applied' : 'I applied'}
        </button>
      </div>
    </div>
  )
}
