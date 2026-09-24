'use client'

import { useMemo, useState } from 'react'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import { EVENT_CATEGORIES, overlaps, todayInAlberta, type DirectoryEvent, type EventCategory, type WeekendWindow } from '@/lib/events-directory/types'
import { EventCard } from '@/components/events/event-card'

/**
 * The /events browser: photo cards with quick filters (city, when, category,
 * free) plus a keyword box, and a "show more" instead of page numbers so the
 * list grows in place.
 *
 * Data arrives from the server page, already merged, sorted and
 * values-filtered; this only narrows and renders it. It is a client component
 * so the chips respond instantly, but the first page of cards is still in the
 * server HTML for crawlers.
 */

type When = 'weekend' | 'week' | 'month' | 'all'

const PAGE_SIZE = 16

const WHEN_OPTIONS: Array<{ value: When; label: string }> = [
  { value: 'weekend', label: 'This weekend' },
  { value: 'week', label: 'Next 7 days' },
  { value: 'month', label: 'Next 30 days' },
  { value: 'all', label: 'All upcoming' },
]

function addDays(ymd: string, days: number): string {
  const d = new Date(`${ymd}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
        active
          ? 'border-gray-900 bg-gray-900 text-white'
          : 'border-gray-300 bg-white text-gray-700 hover:border-gray-500'
      }`}
    >
      {children}
    </button>
  )
}

export default function EventsBrowser({
  events,
  weekend,
  initialWhen = 'all',
}: {
  events: DirectoryEvent[]
  weekend: WeekendWindow
  initialWhen?: When
}) {
  const [city, setCity] = useState<'all' | 'Edmonton' | 'Calgary'>('all')
  const [when, setWhen] = useState<When>(initialWhen)
  const [category, setCategory] = useState<'all' | EventCategory>('all')
  const [freeOnly, setFreeOnly] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [visible, setVisible] = useState(PAGE_SIZE)

  // Only offer categories that actually have events, so no chip is a dead end.
  const categories = useMemo(() => {
    const present = new Set(events.map(e => e.category))
    return EVENT_CATEGORIES.filter(c => present.has(c))
  }, [events])

  const filtered = useMemo(() => {
    const today = todayInAlberta()
    const kw = keyword.trim().toLowerCase()
    const range: { from: string; to: string } | null =
      when === 'weekend' ? { from: weekend.start, to: weekend.end }
      : when === 'week' ? { from: today, to: addDays(today, 7) }
      : when === 'month' ? { from: today, to: addDays(today, 30) }
      : null

    return events.filter(e => {
      if (city !== 'all' && e.city !== city) return false
      if (category !== 'all' && e.category !== category) return false
      if (freeOnly && !e.isFree) return false
      // Our own past events stay visible on the unfiltered list only.
      if (range) {
        if (!overlaps(e, range.from, range.to)) return false
      } else if (!e.manual && e.end < today) {
        return false
      }
      if (kw) {
        const haystack = `${e.name} ${e.venue || ''} ${e.category} ${e.city} ${e.description || ''}`.toLowerCase()
        if (!haystack.includes(kw)) return false
      }
      return true
    })
  }, [events, city, when, category, freeOnly, keyword, weekend])

  const shown = filtered.slice(0, visible)
  const today = todayInAlberta()
  const hasFilters = city !== 'all' || when !== 'all' || category !== 'all' || freeOnly || keyword.trim() !== ''

  const update = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v)
    setVisible(PAGE_SIZE)
  }

  return (
    <div>
      {/* Filters */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 md:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="City">
              <Chip active={city === 'all'} onClick={() => update(setCity)('all')}>Both cities</Chip>
              <Chip active={city === 'Edmonton'} onClick={() => update(setCity)('Edmonton')}>Edmonton</Chip>
              <Chip active={city === 'Calgary'} onClick={() => update(setCity)('Calgary')}>Calgary</Chip>
            </div>
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="When">
              {WHEN_OPTIONS.map(opt => (
                <Chip key={opt.value} active={when === opt.value} onClick={() => update(setWhen)(opt.value)}>
                  {opt.label}
                </Chip>
              ))}
              <Chip active={freeOnly} onClick={() => update(setFreeOnly)(!freeOnly)}>Free</Chip>
            </div>
          </div>

          <label className="relative block w-full lg:max-w-xs">
            <span className="sr-only">Search events</span>
            <input
              type="search"
              value={keyword}
              onChange={e => update(setKeyword)(e.target.value)}
              placeholder="Search by name, venue or neighbourhood"
              className="w-full rounded-full border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-gray-900 focus:outline-none"
            />
            <Search className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-gray-400" aria-hidden="true" />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2" role="group" aria-label="Category">
          <SlidersHorizontal className="h-4 w-4 text-gray-400" aria-hidden="true" />
          <Chip active={category === 'all'} onClick={() => update(setCategory)('all')}>All types</Chip>
          {categories.map(c => (
            <Chip key={c} active={category === c} onClick={() => update(setCategory)(c)}>{c}</Chip>
          ))}
        </div>
      </div>

      {/* Result line */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-gray-600" aria-live="polite">
          {filtered.length === 0
            ? 'No events match'
            : `Showing ${shown.length} of ${filtered.length} event${filtered.length === 1 ? '' : 's'}`}
          {when === 'weekend' && <span className="text-gray-400"> · {weekend.label}</span>}
        </p>
        {hasFilters && (
          <button
            type="button"
            onClick={() => {
              setCity('all'); setWhen('all'); setCategory('all'); setFreeOnly(false); setKeyword(''); setVisible(PAGE_SIZE)
            }}
            className="inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" /> Clear filters
          </button>
        )}
      </div>

      {/* Cards */}
      {shown.length === 0 ? (
        <p className="py-16 text-center text-gray-500">
          Nothing matches those filters yet. Try &ldquo;All upcoming&rdquo; or clear the search.
        </p>
      ) : (
        <ul className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {shown.map((event, i) => (
            <li key={event.id}>
              <EventCard event={event} past={event.manual && event.end < today} eager={i < 4} />
            </li>
          ))}
        </ul>
      )}

      {filtered.length > shown.length && (
        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={() => setVisible(v => v + PAGE_SIZE)}
            className="rounded-full border border-gray-900 px-6 py-2.5 text-sm font-semibold text-gray-900 transition hover:bg-gray-900 hover:text-white"
          >
            Show more events ({filtered.length - shown.length} left)
          </button>
        </div>
      )}
    </div>
  )
}
