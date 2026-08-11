import type { SavedJobStatus } from '@/lib/types/job'

/**
 * How a tracked job reads wherever it appears — board list, detail panel and
 * /account all pull from here so the same row can't be labelled three ways.
 *
 * 'saved' has no badge on the board on purpose. Saving is a bookmark, not
 * progress, and a badge on every bookmarked row is noise that makes the ones
 * that matter — the applications — harder to spot.
 */
export const TRACK_LABELS: Record<SavedJobStatus, string> = {
  saved: 'Saved',
  started: 'Started',
  applied: 'Applied',
  interviewing: 'Interviewing',
  offer: 'Offer',
  rejected: 'Not selected',
}

export const TRACK_STYLES: Record<SavedJobStatus, string> = {
  saved: 'bg-gray-100 text-gray-700',
  started: 'bg-amber-100 text-amber-800',
  applied: 'bg-blue-100 text-blue-800',
  interviewing: 'bg-violet-100 text-violet-800',
  offer: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-gray-200 text-gray-600',
}

/** Statuses worth flagging in a scannable list. */
export const BOARD_BADGE_STATUSES: SavedJobStatus[] = [
  'started', 'applied', 'interviewing', 'offer', 'rejected',
]

export function TrackBadge({
  status,
  className = '',
}: {
  status: SavedJobStatus
  className?: string
}) {
  return (
    <span
      className={`inline-flex flex-shrink-0 items-center rounded px-2 py-0.5 text-[11px] font-semibold ${TRACK_STYLES[status]} ${className}`}
    >
      {TRACK_LABELS[status]}
    </span>
  )
}
