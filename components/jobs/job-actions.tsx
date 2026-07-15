'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Bookmark } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/components/auth-provider'
import { isJobSaved, saveJob, unsaveJob, updateSavedJobStatus } from '@/lib/saved-jobs'

/**
 * Apply + Save controls for a job posting page. Mirrors the save flow in
 * components/article-actions.tsx.
 *
 * Applying requires a free account: signed-out visitors are routed to
 * sign-in (and come straight back to this posting). Signed-in users get
 * the employer's application page in a new tab and the job is marked
 * "applied" in their tracker automatically.
 */
export function JobActions({
  jobId,
  applyUrl,
  expired,
}: {
  jobId: string
  applyUrl: string
  expired: boolean
}) {
  const { toast } = useToast()
  const { user } = useAuth()
  const router = useRouter()
  const [isSaved, setIsSaved] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let active = true
    if (!user) {
      setIsSaved(false)
      return
    }
    isJobSaved(jobId)
      .then(v => active && setIsSaved(v))
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
        setIsSaved(false)
        toast({ title: 'Removed', description: 'Job removed from your tracker.' })
      } else {
        await saveJob(user.id, jobId)
        setIsSaved(true)
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
    // Signed in: the <a> opens the employer page; track it as applied.
    try {
      if (isSaved) {
        await updateSavedJobStatus(jobId, 'applied')
      } else {
        await saveJob(user.id, jobId, 'applied')
        setIsSaved(true)
      }
      toast({ title: 'Marked as applied', description: 'Track this application under Account → My Jobs.' })
    } catch {
      // Tracking is best-effort — never block the application itself
    }
  }, [user, isSaved, jobId, router, toast])

  return (
    <div className="flex flex-wrap items-center gap-3">
      {!expired && (
        <a
          href={applyUrl}
          target="_blank"
          rel="nofollow noopener"
          onClick={handleApply}
          className="inline-flex items-center rounded-md bg-blue-600 px-6 py-3 text-base font-semibold text-white hover:bg-blue-700"
        >
          {user ? 'Apply on employer site →' : 'Sign in free to apply →'}
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
  )
}
