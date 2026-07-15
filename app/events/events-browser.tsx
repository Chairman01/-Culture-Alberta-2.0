'use client'

import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'

/**
 * Events browser styled after the City of Edmonton's public events listing:
 * keyword search + event type + from/to date filters, a results count, and
 * a paginated card grid where each card links out to the event's own website.
 *
 * Data arrives as props from the server page, already values-filtered.
 */

export interface BrowserEvent {
  id: string
  name: string
  start: string           // YYYY-MM-DD
  end?: string            // YYYY-MM-DD
  dateRangeLabel: string  // "July 10, 2026 - July 12, 2026"
  venue?: string
  city: 'Edmonton' | 'Calgary'
  category: string
  url?: string
  manual?: boolean        // created in our admin — always pinned first
  // Schema.org Event fields (not rendered in the browser UI)
  description?: string
  image?: string
  price?: number
  currency?: string
  organizerName?: string
  organizerUrl?: string
}

const PAGE_SIZE = 12

const BADGE_COLORS: Array<{ match: RegExp; classes: string }> = [
  { match: /festival/i, classes: 'bg-red-700 text-white' },
  { match: /sport/i, classes: 'bg-orange-600 text-white' },
  { match: /outdoor/i, classes: 'bg-amber-700 text-white' },
  { match: /art/i, classes: 'bg-blue-700 text-white' },
  { match: /communit|programming/i, classes: 'bg-purple-700 text-white' },
  { match: /recreation|leisure/i, classes: 'bg-teal-700 text-white' },
]

function badgeClass(category: string): string {
  return BADGE_COLORS.find(b => b.match.test(category))?.classes || 'bg-gray-600 text-white'
}

function mapsUrl(venue: string, city: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${venue}, ${city}, Alberta`)}`
}

function todayStr(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export default function EventsBrowser({ events }: { events: BrowserEvent[] }) {
  const [keyword, setKeyword] = useState('')
  const [city, setCity] = useState('all')
  const [eventType, setEventType] = useState('all')
  const [fromDate, setFromDate] = useState(todayStr())
  const [toDate, setToDate] = useState('')
  const [page, setPage] = useState(1)

  const eventTypes = useMemo(
    () => [...new Set(events.map(e => e.category).filter(Boolean))].sort(),
    [events]
  )

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase()
    const today = todayStr()
    const matches = events.filter(e => {
      if (city !== 'all' && e.city !== city) return false
      if (eventType !== 'all' && e.category !== eventType) return false
      // Date-range overlap: event [start, end] intersects filter [from, to].
      // Our own (manual) events are exempt so they stay visible even after
      // they've happened — they're the priority content on this page.
      if (!e.manual) {
        const end = e.end || e.start
        if (fromDate && end < fromDate) return false
        if (toDate && e.start > toDate) return false
      }
      if (kw) {
        const haystack = `${e.name} ${e.venue || ''} ${e.category} ${e.city}`.toLowerCase()
        if (!haystack.includes(kw)) return false
      }
      return true
    })

    // Manual events pinned first: upcoming soonest-first, then recent past;
    // automated events follow in date order.
    const rank = (e: BrowserEvent) => (e.manual ? ((e.end || e.start) >= today ? 0 : 1) : 2)
    return matches.sort((a, b) => {
      const r = rank(a) - rank(b)
      if (r !== 0) return r
      // Past manual events: most recent first; everything else: soonest first
      return rank(a) === 1 ? b.start.localeCompare(a.start) : a.start.localeCompare(b.start)
    })
  }, [events, keyword, city, eventType, fromDate, toDate])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageEvents = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const showingFrom = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1
  const showingTo = Math.min(safePage * PAGE_SIZE, filtered.length)

  const resetPage = () => setPage(1)

  return (
    <div>
      {/* Filter bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
        <div>
          <label htmlFor="ev-keyword" className="block text-sm font-semibold text-gray-800 mb-1">Search By Keyword</label>
          <div className="relative">
            <input
              id="ev-keyword"
              type="text"
              value={keyword}
              onChange={e => { setKeyword(e.target.value); resetPage() }}
              placeholder="Type Keyword..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 pr-9 text-sm focus:border-blue-500 focus:outline-none"
            />
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
          </div>
        </div>
        <div>
          <label htmlFor="ev-city" className="block text-sm font-semibold text-gray-800 mb-1">City</label>
          <select
            id="ev-city"
            value={city}
            onChange={e => { setCity(e.target.value); resetPage() }}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:border-blue-500 focus:outline-none"
          >
            <option value="all">Edmonton &amp; Calgary</option>
            <option value="Edmonton">Edmonton</option>
            <option value="Calgary">Calgary</option>
          </select>
        </div>
        <div>
          <label htmlFor="ev-type" className="block text-sm font-semibold text-gray-800 mb-1">Event Type</label>
          <select
            id="ev-type"
            value={eventType}
            onChange={e => { setEventType(e.target.value); resetPage() }}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:border-blue-500 focus:outline-none"
          >
            <option value="all">All Types</option>
            {eventTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="ev-from" className="block text-sm font-semibold text-gray-800 mb-1">From Date</label>
          <input
            id="ev-from"
            type="date"
            value={fromDate}
            onChange={e => { setFromDate(e.target.value); resetPage() }}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="ev-to" className="block text-sm font-semibold text-gray-800 mb-1">To Date</label>
          <input
            id="ev-to"
            type="date"
            value={toDate}
            onChange={e => { setToDate(e.target.value); resetPage() }}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Result count */}
      <p className="text-sm text-gray-600 mb-4">
        Showing {showingFrom}-{showingTo} Events out of {filtered.length} Events
      </p>

      {/* Card grid */}
      {pageEvents.length === 0 ? (
        <p className="py-16 text-center text-gray-500">
          No events match your filters. Try widening the dates or clearing the keyword.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {pageEvents.map(event => (
            <div key={event.id} className="flex flex-col rounded-md border bg-white p-5 shadow-sm">
              <h3 className="text-lg font-bold leading-snug mb-2 border-b border-blue-400 pb-3">
                {event.url ? (
                  <a
                    href={event.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-700 hover:text-blue-900 hover:underline"
                  >
                    {event.name}
                  </a>
                ) : (
                  <span className="text-gray-900">{event.name}</span>
                )}
              </h3>
              <p className="text-sm text-gray-800 mb-1">
                <strong>Date:</strong> {event.dateRangeLabel}
              </p>
              <p className="text-sm text-gray-800 mb-3">
                <strong>Location:</strong>{' '}
                {event.venue ? (
                  <a
                    href={mapsUrl(event.venue, event.city)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-700 hover:underline"
                  >
                    {event.venue}
                  </a>
                ) : (
                  event.city
                )}
              </p>
              <div className="mt-auto flex flex-wrap items-center gap-2">
                {event.manual && (
                  <span className="rounded bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white">
                    Culture Alberta
                  </span>
                )}
                <span className={`rounded px-2.5 py-1 text-xs font-semibold ${badgeClass(event.category)}`}>
                  {event.category}
                </span>
                <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600">{event.city}</span>
                {event.manual && (event.end || event.start) < todayStr() && (
                  <span className="rounded bg-gray-200 px-2 py-1 text-xs text-gray-600">Recently held</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={safePage <= 1}
            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-40"
          >
            ← Previous
          </button>
          <span className="text-sm text-gray-600">Page {safePage} of {totalPages}</span>
          <button
            type="button"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages}
            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
