'use client'

import { TRACK_LABELS, TRACK_STYLES } from '@/components/jobs/track-badge'
import type { SavedJobStatus } from '@/lib/types/job'

/**
 * A running tally of the reader's own applications, pinned above the board.
 *
 * A job hunt is not one sitting. Someone scrolling page three has no way of
 * knowing they already applied to eleven of these unless every answer is on
 * screen, so this sticks to the top of the list rather than sitting at the top
 * of the page where it scrolls away exactly when it becomes useful.
 *
 * `top` clears the site header, which is itself sticky at `top-0` with a much
 * higher z-index — 57px tall, 65px from the sm breakpoint, borders included.
 * Pinned at top-0 this stuck correctly and then slid straight underneath the
 * navbar, so it was invisible from the first scroll, which looks exactly like
 * a strip that doesn't stick. The few extra pixels leave it reading as a
 * separate bar rather than as part of the nav.
 *
 * Each tally is also a filter — "which ones?" is the immediate next question
 * after "how many?", and answering it any other way means making them
 * remember, or leave for /account.
 */

/** Order matters: this is the shape of a job hunt, not the alphabet. */
const SHOWN: SavedJobStatus[] = ['saved', 'started', 'applied', 'interviewing', 'offer']

export function JobTrackSummary({
  tracked,
  activeFilter,
  onFilter,
}: {
  tracked: Record<string, SavedJobStatus>
  activeFilter: SavedJobStatus | null
  onFilter: (status: SavedJobStatus | null) => void
}) {
  const counts = SHOWN.map(status => ({
    status,
    count: Object.values(tracked).filter(s => s === status).length,
  })).filter(entry => entry.count > 0)

  // Nothing tracked yet: no empty scoreboard, which would just be clutter for
  // someone who has not started.
  if (counts.length === 0) return null

  const applied = counts.find(c => c.status === 'applied')?.count ?? 0

  return (
    <div className="sticky top-[3.75rem] z-30 -mx-1 mb-3 rounded-lg border border-gray-200 bg-white/95 px-3 py-2 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/80 sm:top-[4.25rem]">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="text-sm font-semibold text-gray-900">
          {applied > 0 ? (
            <>
              You&apos;ve applied to {applied} {applied === 1 ? 'job' : 'jobs'}
            </>
          ) : (
            <>Your job hunt</>
          )}
        </span>

        <div className="flex flex-wrap items-center gap-1.5">
          {counts.map(({ status, count }) => {
            const active = activeFilter === status
            return (
              <button
                key={status}
                type="button"
                onClick={() => onFilter(active ? null : status)}
                aria-pressed={active}
                title={active ? 'Show all jobs again' : `Show only ${TRACK_LABELS[status].toLowerCase()}`}
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-all ${
                  TRACK_STYLES[status]
                } ${active ? 'ring-2 ring-offset-1 ring-gray-900' : 'hover:opacity-80'}`}
              >
                <span className="tabular-nums font-semibold">{count}</span>
                {TRACK_LABELS[status]}
              </button>
            )
          })}
        </div>

        {activeFilter && (
          <button
            type="button"
            onClick={() => onFilter(null)}
            className="ml-auto text-xs font-medium text-gray-600 underline underline-offset-2 hover:text-gray-900"
          >
            Show all jobs
          </button>
        )}
      </div>
    </div>
  )
}
