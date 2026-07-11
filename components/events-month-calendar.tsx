'use client'

import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, MapPin, ExternalLink } from 'lucide-react'

/**
 * Compact interactive month calendar for events.
 *
 * - Month grid with dot indicators on days that have events
 * - Click a day to see its events in a short list below the grid
 * - Multi-day events (up to 14 days) appear on every day of their run;
 *   longer-running series are tucked into a collapsed "Ongoing" line so
 *   they don't flood the grid
 *
 * Pure client UI — events arrive as props from a server component, already
 * values-filtered at the data source.
 */

export interface CalendarEvent {
  id: string
  name: string
  start: string          // YYYY-MM-DD
  end?: string           // YYYY-MM-DD
  timeLabel?: string     // human text, e.g. "Friday, July 10 at 7:00 PM"
  venue?: string
  category?: string
  url?: string
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MAX_MONTHS_AHEAD = 2   // feeds cover ~60 days
const LONG_RUN_DAYS = 14     // spans longer than this go to "Ongoing"

function toDateStr(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function todayStr(): string {
  const now = new Date()
  return toDateStr(now.getFullYear(), now.getMonth(), now.getDate())
}

function spanDays(start: string, end?: string): number {
  if (!end || end <= start) return 1
  const ms = new Date(end).getTime() - new Date(start).getTime()
  return Math.round(ms / 86_400_000) + 1
}

export function EventsMonthCalendar({ events }: { events: CalendarEvent[] }) {
  const today = todayStr()
  const [monthOffset, setMonthOffset] = useState(0)
  const [selectedDate, setSelectedDate] = useState(today)

  const base = new Date()
  const viewYear = new Date(base.getFullYear(), base.getMonth() + monthOffset, 1).getFullYear()
  const viewMonth = new Date(base.getFullYear(), base.getMonth() + monthOffset, 1).getMonth()

  // Bucket events by calendar day; long-running series go to "ongoing"
  const { dayMap, ongoing } = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    const long: CalendarEvent[] = []

    for (const e of events) {
      const days = spanDays(e.start, e.end)
      if (days > LONG_RUN_DAYS) {
        long.push(e)
        continue
      }
      const start = new Date(e.start + 'T12:00:00Z')
      for (let i = 0; i < days; i++) {
        const d = new Date(start)
        d.setUTCDate(d.getUTCDate() + i)
        const key = d.toISOString().slice(0, 10)
        const list = map.get(key) || []
        list.push(e)
        map.set(key, list)
      }
    }
    return { dayMap: map, ongoing: long }
  }, [events])

  // Build the grid for the viewed month
  const firstDay = new Date(viewYear, viewMonth, 1)
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const leadingBlanks = firstDay.getDay()
  const cells: Array<{ date: string; day: number } | null> = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => ({
      date: toDateStr(viewYear, viewMonth, i + 1),
      day: i + 1,
    })),
  ]

  const monthLabel = firstDay.toLocaleDateString('en-CA', { month: 'long', year: 'numeric' })
  const selectedEvents = dayMap.get(selectedDate) || []
  const selectedLabel = new Date(selectedDate + 'T12:00:00Z').toLocaleDateString('en-CA', {
    weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC',
  })

  // Ongoing series that overlap the viewed month
  const monthStart = toDateStr(viewYear, viewMonth, 1)
  const monthEnd = toDateStr(viewYear, viewMonth, daysInMonth)
  const ongoingThisMonth = ongoing.filter(e => e.start <= monthEnd && (e.end || e.start) >= monthStart)

  return (
    <div className="rounded-xl border bg-white shadow-sm p-4 max-w-md">
      {/* Month header */}
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => setMonthOffset(o => Math.max(0, o - 1))}
          disabled={monthOffset === 0}
          className="rounded-md p-1 hover:bg-gray-100 disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold text-gray-900">{monthLabel}</span>
        <button
          type="button"
          aria-label="Next month"
          onClick={() => setMonthOffset(o => Math.min(MAX_MONTHS_AHEAD, o + 1))}
          disabled={monthOffset >= MAX_MONTHS_AHEAD}
          className="rounded-md p-1 hover:bg-gray-100 disabled:opacity-30"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Day-of-week header */}
      <div className="grid grid-cols-7 text-center text-[11px] font-medium text-gray-400 mb-1">
        {WEEKDAYS.map(d => <div key={d}>{d}</div>)}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((cell, i) => {
          if (!cell) return <div key={`blank-${i}`} />
          const count = dayMap.get(cell.date)?.length || 0
          const isToday = cell.date === today
          const isSelected = cell.date === selectedDate
          const isPast = cell.date < today
          return (
            <button
              key={cell.date}
              type="button"
              onClick={() => setSelectedDate(cell.date)}
              className={[
                'relative flex h-9 flex-col items-center justify-center rounded-md text-xs transition-colors',
                isSelected ? 'bg-blue-600 text-white font-semibold'
                  : isToday ? 'bg-blue-50 text-blue-700 font-semibold hover:bg-blue-100'
                  : isPast ? 'text-gray-300 hover:bg-gray-50'
                  : 'text-gray-700 hover:bg-gray-100',
              ].join(' ')}
            >
              {cell.day}
              {count > 0 && (
                <span className={`absolute bottom-1 flex gap-0.5 ${isSelected ? '' : ''}`}>
                  {Array.from({ length: Math.min(count, 3) }, (_, j) => (
                    <span
                      key={j}
                      className={`h-1 w-1 rounded-full ${isSelected ? 'bg-white' : 'bg-blue-500'}`}
                    />
                  ))}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Selected day's events */}
      <div className="mt-3 border-t pt-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
          {selectedLabel}
        </p>
        {selectedEvents.length === 0 ? (
          <p className="text-sm text-gray-400">No listed events this day.</p>
        ) : (
          <ul className="space-y-2">
            {selectedEvents.slice(0, 6).map(e => (
              <li key={`${selectedDate}-${e.id}`} className="text-sm leading-snug">
                {e.url ? (
                  <a href={e.url} target="_blank" rel="noopener noreferrer" className="font-medium text-gray-900 hover:text-blue-700">
                    {e.name} <ExternalLink className="inline h-3 w-3 text-gray-400" />
                  </a>
                ) : (
                  <span className="font-medium text-gray-900">{e.name}</span>
                )}
                {e.venue && (
                  <span className="ml-1 text-xs text-gray-500">
                    <MapPin className="inline h-3 w-3" /> {e.venue}
                  </span>
                )}
              </li>
            ))}
            {selectedEvents.length > 6 && (
              <li className="text-xs text-gray-500">+ {selectedEvents.length - 6} more this day</li>
            )}
          </ul>
        )}
      </div>

      {/* Long-running series, collapsed so they don't crowd the grid */}
      {ongoingThisMonth.length > 0 && (
        <details className="mt-3 border-t pt-2">
          <summary className="cursor-pointer text-xs font-medium text-gray-500 hover:text-gray-700">
            Ongoing this month ({ongoingThisMonth.length})
          </summary>
          <ul className="mt-2 space-y-1">
            {ongoingThisMonth.map(e => (
              <li key={`ongoing-${e.id}`} className="text-sm">
                {e.url ? (
                  <a href={e.url} target="_blank" rel="noopener noreferrer" className="text-gray-800 hover:text-blue-700">{e.name}</a>
                ) : (
                  <span className="text-gray-800">{e.name}</span>
                )}
                {e.venue && <span className="ml-1 text-xs text-gray-500">{e.venue}</span>}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}
