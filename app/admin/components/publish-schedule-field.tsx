"use client"

/**
 * The publish timer.
 *
 * "Publish now" is the default and behaves exactly as saving always has. Picking
 * a time stores the article as a draft with `publish_at` set, and
 * /api/cron/publish-scheduled puts it live — which is the only thing that fires
 * IndexNow and the social post, so a scheduled piece announces itself when it
 * actually appears rather than while nobody can read it.
 *
 * Times are Mountain, always, whatever clock the editor's laptop is on. See
 * lib/utils/mountain-time.
 */

import { Clock, Send } from "lucide-react"
import { Label } from "@/components/ui/label"
import {
  formatMountain,
  mountainWallToUtcIso,
  nextMountainSlot,
  utcIsoToMountainWall,
} from "@/lib/utils/mountain-time"

/** How often the cron checks, so the UI can promise what it can keep. */
const CRON_INTERVAL_MINUTES = 5

export interface PublishScheduleValue {
  /** null = publish on save. Otherwise a UTC ISO string. */
  publishAt: string | null
}

interface Props {
  /** UTC ISO string, or null for "publish now". */
  value: string | null
  onChange: (value: string | null) => void
  /** Shown instead of the picker once the article is already live. */
  alreadyPublished?: boolean
}

/**
 * Mountain wall clock for a given hour, `daysAhead` days from today.
 *
 * The day arithmetic runs on Alberta's calendar date, not the browser's, so
 * "Tomorrow 7 AM" means the same morning whether the laptop is on Mountain,
 * Eastern, or something further afield.
 */
function wallAt(daysAhead: number, hour: number, minute = 0): string {
  const todayInAlberta = utcIsoToMountainWall(new Date().toISOString()).slice(0, 10)
  const [y, m, d] = todayInAlberta.split('-').map(Number)

  const day = new Date(Date.UTC(y, m - 1, d))
  day.setUTCDate(day.getUTCDate() + daysAhead)

  const hh = String(hour).padStart(2, '0')
  const mm = String(minute).padStart(2, '0')
  return `${day.toISOString().slice(0, 10)}T${hh}:${mm}`
}

export function PublishScheduleField({ value, onChange, alreadyPublished }: Props) {
  const isScheduled = value !== null
  const wallValue = value ? utcIsoToMountainWall(value) : ''
  const isPast = value ? new Date(value).getTime() <= Date.now() : false

  const setFromWall = (wall: string) => {
    if (!wall) {
      onChange(null)
      return
    }
    onChange(mountainWallToUtcIso(wall))
  }

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <Label className="flex items-center gap-2">
        <Clock className="h-4 w-4" />
        Publishing
      </Label>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => onChange(null)}
          className={`flex items-center gap-2 rounded-lg border-2 p-3 text-left text-sm transition-all ${
            !isScheduled
              ? 'border-gray-900 bg-gray-900 text-white'
              : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400'
          }`}
        >
          <Send className="h-4 w-4 flex-shrink-0" />
          <span className="font-semibold">Publish now</span>
        </button>

        <button
          type="button"
          onClick={() => onChange(mountainWallToUtcIso(nextMountainSlot(60)))}
          className={`flex items-center gap-2 rounded-lg border-2 p-3 text-left text-sm transition-all ${
            isScheduled
              ? 'border-gray-900 bg-gray-900 text-white'
              : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400'
          }`}
        >
          <Clock className="h-4 w-4 flex-shrink-0" />
          <span className="font-semibold">Schedule</span>
        </button>
      </div>

      {isScheduled && (
        <div className="space-y-2">
          <input
            type="datetime-local"
            value={wallValue}
            step={300}
            onChange={(e) => setFromWall(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />

          <div className="flex flex-wrap gap-2">
            {[
              { label: 'Tomorrow 7 AM', wall: wallAt(1, 7) },
              { label: 'Tomorrow noon', wall: wallAt(1, 12) },
              { label: 'In 3 days, 7 AM', wall: wallAt(3, 7) },
            ].map(preset => (
              <button
                key={preset.label}
                type="button"
                onClick={() => setFromWall(preset.wall)}
                className="rounded-full border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:border-gray-900 hover:text-gray-900"
              >
                {preset.label}
              </button>
            ))}
          </div>

          {isPast ? (
            <p className="text-xs text-amber-600">
              That time has already passed — saving now will publish immediately.
            </p>
          ) : (
            <p className="text-xs text-gray-500">
              Saves as a draft, hidden from the site, and goes live on its own at{' '}
              <strong>{formatMountain(value!)}</strong>. The timer is checked every{' '}
              {CRON_INTERVAL_MINUTES} minutes, so it can run up to {CRON_INTERVAL_MINUTES} minutes
              late. Search engines and the social accounts are notified when it publishes, not now.
            </p>
          )}

          {alreadyPublished && (
            <p className="text-xs text-amber-600">
              This article is already live. Saving with a time set will take it back down until then.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
