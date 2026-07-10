/**
 * Municipal open-data event fetchers for Calgary and Edmonton.
 *
 * Both cities publish machine-readable event calendars on their Socrata
 * open-data portals. No API key required; unauthenticated requests are
 * rate-limited but our volume (a couple of calls per ISR regeneration or
 * cron run) is far below the limit.
 *
 *   Edmonton: https://data.edmonton.ca/Events/Public-Events-Calendar-Listings/64u3-c7bh
 *     - structured `begins`/`ends` dates plus `start_time`/`end_time` strings
 *   Calgary:  https://data.calgary.ca/News-and-Events/City-of-Calgary-Events/n625-9k5x
 *     - dates only as human text in `all_dates` (e.g. "Jul 16 2026 6:30 - 7:30 p.m.",
 *       multiple occurrences separated by <br>), so we parse them here
 *
 * Events are mapped to the shared EventbriteEvent shape so they flow into the
 * same article-generator pipeline as Ticketmaster events, replacing the old
 * city iCal feeds (both of which had gone 404).
 */

import type { EventbriteEvent } from './eventbrite'

const EDMONTON_ENDPOINT = 'https://data.edmonton.ca/resource/64u3-c7bh.json'
const CALGARY_ENDPOINT = 'https://data.calgary.ca/resource/n625-9k5x.json'

const FETCH_OPTS: RequestInit & { next: { revalidate: number } } = {
  next: { revalidate: 0 },
  headers: {
    'User-Agent': 'CultureAlberta/1.0 (hello@culturealberta.com)',
    Accept: 'application/json',
  },
}

const FETCH_TIMEOUT_MS = 10_000

/** EventbriteEvent plus which city the event belongs to (for multi-city pages). */
export interface OpenDataEvent extends EventbriteEvent {
  city: 'calgary' | 'edmonton'
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function isoDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function formatDayLabel(iso: string): string {
  try {
    // Date-only strings are parsed as UTC midnight; format in UTC so the
    // calendar date doesn't shift when the server runs in another timezone.
    return new Date(iso).toLocaleDateString('en-CA', {
      timeZone: 'UTC',
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return iso
  }
}

/** "13:00:00" → "1:00 PM"; "11:00 AM" passes through. */
function normalizeTime(raw?: string): string {
  if (!raw) return ''
  const trimmed = raw.trim()
  if (/am|pm/i.test(trimmed)) return trimmed.toUpperCase().replace(/\s+/g, ' ')
  const m = trimmed.match(/^(\d{1,2}):(\d{2})/)
  if (!m) return trimmed
  let h = parseInt(m[1], 10)
  const suffix = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${h}:${m[2]} ${suffix}`
}

// ---------------------------------------------------------------------------
// Edmonton — Public Events Calendar Listings (Socrata, structured dates)
// ---------------------------------------------------------------------------

interface EdmontonRow {
  title?: string
  begins?: string      // "2026-07-10T00:00:00.000" (date component is what matters)
  ends?: string
  start_time?: string  // "11:00 AM" or "13:00:00" — both appear in the data
  end_time?: string
  event_type?: string
  event_venue?: string
  neighbourhood?: string
  event_link?: { url?: string }
  latitude?: string
  longitude?: string
}

function mapEdmontonRow(row: EdmontonRow, idx: number): OpenDataEvent {
  const begins = row.begins || ''
  const ends = row.ends || begins
  const startTime = normalizeTime(row.start_time)
  const endTime = normalizeTime(row.end_time)

  const sameDay = begins.slice(0, 10) === ends.slice(0, 10)
  const dayLabel = sameDay
    ? formatDayLabel(begins)
    : `${formatDayLabel(begins)} to ${formatDayLabel(ends)}`
  const timeLabel = startTime
    ? endTime ? ` from ${startTime} to ${endTime}` : ` at ${startTime}`
    : ''

  // "Roads - Central" style venues mean a street event without a fixed venue
  const venue = row.event_venue && !/^roads\s*-/i.test(row.event_venue)
    ? row.event_venue
    : ''

  return {
    id: `edm-open-${begins.slice(0, 10)}-${idx}`,
    title: row.title || 'Untitled event',
    description: '',
    shortDescription: '',
    startDate: begins,
    endDate: ends,
    startFormatted: `${dayLabel}${timeLabel}`,
    venueName: venue,
    venueAddress: [venue, row.neighbourhood].filter(Boolean).join(', '),
    url: row.event_link?.url || '',
    isFree: false,
    price: 'See website',
    categoryName: row.event_type || 'Community',
    imageUrl: null,
    city: 'edmonton',
  }
}

export async function fetchEdmontonOpenDataEvents(
  start: Date,
  end: Date
): Promise<OpenDataEvent[]> {
  const where = `begins <= '${isoDateOnly(end)}' AND ends >= '${isoDateOnly(start)}'`
  const url = `${EDMONTON_ENDPOINT}?$where=${encodeURIComponent(where)}&$order=begins&$limit=300`

  try {
    const res = await fetch(url, { ...FETCH_OPTS, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
    if (!res.ok) {
      console.warn(`[open-data] Edmonton: HTTP ${res.status} — skipping`)
      return []
    }
    const rows: EdmontonRow[] = await res.json()
    console.log(`[open-data] Edmonton: ${rows.length} events between ${isoDateOnly(start)} and ${isoDateOnly(end)}`)
    return rows
      .filter(r => r.title && r.title.trim().length > 2)
      .map(mapEdmontonRow)
  } catch (err) {
    console.warn(`[open-data] Edmonton fetch failed (${err instanceof Error ? err.message : err}) — skipping`)
    return []
  }
}

// ---------------------------------------------------------------------------
// Calgary — City of Calgary Events (Socrata, human-readable dates)
// ---------------------------------------------------------------------------

interface CalgaryRow {
  title?: string
  notes?: string
  address?: string
  event_type?: string
  event_group?: string
  more_info_url?: string
  all_dates?: string        // "Jul 16 2026 6:30 - 7:30 p.m." joined with <br>
  next_date_times?: string  // first upcoming occurrence, same format
  latitude?: string
  longitude?: string
}

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, june: 5,
  jul: 6, july: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11,
}

interface CalgaryOccurrence {
  date: Date
  label: string // e.g. "Thursday, July 16 from 6:30 - 7:30 p.m."
}

/** Parse one "<Mon> <D> <YYYY> <time range>" chunk from `all_dates`. */
function parseCalgaryDateChunk(chunk: string): CalgaryOccurrence | null {
  const m = chunk.trim().match(/^([A-Za-z]+)\.?\s+(\d{1,2})\s+(\d{4})\s*(.*)$/)
  if (!m) return null
  const month = MONTHS[m[1].toLowerCase()]
  if (month === undefined) return null
  const day = parseInt(m[2], 10)
  const year = parseInt(m[3], 10)
  // Noon UTC keeps the calendar date stable regardless of server timezone
  const date = new Date(Date.UTC(year, month, day, 12))
  if (isNaN(date.getTime())) return null

  const timeText = m[4].trim()
  const dayLabel = date.toLocaleDateString('en-CA', {
    timeZone: 'UTC',
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
  return {
    date,
    label: timeText ? `${dayLabel}, ${timeText}` : dayLabel,
  }
}

function mapCalgaryRow(
  row: CalgaryRow,
  occurrences: CalgaryOccurrence[],
  idx: number
): OpenDataEvent {
  const first = occurrences[0]
  const last = occurrences[occurrences.length - 1]
  const startFormatted = occurrences.length > 1
    ? `${first.label} (runs until ${last.date.toLocaleDateString('en-CA', { timeZone: 'UTC', month: 'long', day: 'numeric' })})`
    : first.label

  const notes = (row.notes || '').trim()

  return {
    id: `cgy-open-${isoDateOnly(first.date)}-${idx}`,
    title: row.title || 'Untitled event',
    description: notes,
    shortDescription: notes.slice(0, 300),
    startDate: first.date.toISOString(),
    endDate: last.date.toISOString(),
    startFormatted,
    venueName: row.address || '',
    venueAddress: row.address || '',
    url: row.more_info_url || '',
    isFree: false,
    price: 'See website',
    categoryName: row.event_type || 'Community',
    imageUrl: null,
    city: 'calgary',
  }
}

export async function fetchCalgaryOpenDataEvents(
  start: Date,
  end: Date
): Promise<OpenDataEvent[]> {
  // The whole dataset is small (~100 rows), so fetch it all and filter by
  // parsed occurrence dates — Socrata can't query inside the text field.
  const url = `${CALGARY_ENDPOINT}?$limit=500`

  let rows: CalgaryRow[]
  try {
    const res = await fetch(url, { ...FETCH_OPTS, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
    if (!res.ok) {
      console.warn(`[open-data] Calgary: HTTP ${res.status} — skipping`)
      return []
    }
    rows = await res.json()
  } catch (err) {
    console.warn(`[open-data] Calgary fetch failed (${err instanceof Error ? err.message : err}) — skipping`)
    return []
  }

  const events: OpenDataEvent[] = []
  const seen = new Set<string>()

  rows.forEach((row, idx) => {
    if (!row.title || row.title.trim().length <= 2) return

    const inWindow = (row.all_dates || row.next_date_times || '')
      .split(/<br\s*\/?>/i)
      .map(parseCalgaryDateChunk)
      .filter((o): o is CalgaryOccurrence => o !== null && o.date >= start && o.date <= end)
      .sort((a, b) => a.date.getTime() - b.date.getTime())

    if (inWindow.length === 0) return

    // The dataset repeats recurring programs as separate rows; dedupe on
    // title + address so one program at one location appears once.
    const key = `${row.title}|${row.address || ''}`.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)

    events.push(mapCalgaryRow(row, inWindow, idx))
  })

  console.log(`[open-data] Calgary: ${events.length} events between ${isoDateOnly(start)} and ${isoDateOnly(end)}`)
  return events.sort((a, b) => a.startDate.localeCompare(b.startDate))
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch open-data events for one city within a date window.
 * Returns [] for cities without an open-data feed and on any failure,
 * so callers can safely merge with other sources.
 */
export async function fetchOpenDataEvents(
  city: string,
  start: Date,
  end: Date
): Promise<EventbriteEvent[]> {
  if (city === 'edmonton') return fetchEdmontonOpenDataEvents(start, end)
  if (city === 'calgary') return fetchCalgaryOpenDataEvents(start, end)
  return []
}

/**
 * Fetch upcoming open-data events for both cities (for the /events calendar).
 * Window: today through `daysAhead` days from now.
 */
export async function fetchUpcomingOpenDataEvents(
  daysAhead = 60
): Promise<OpenDataEvent[]> {
  const start = new Date()
  start.setUTCHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + daysAhead)

  const [edmonton, calgary] = await Promise.all([
    fetchEdmontonOpenDataEvents(start, end),
    fetchCalgaryOpenDataEvents(start, end),
  ])

  return [...edmonton, ...calgary].sort((a, b) =>
    a.startDate.localeCompare(b.startDate)
  )
}
