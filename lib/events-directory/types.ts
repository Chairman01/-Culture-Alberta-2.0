/**
 * Types and pure date helpers for the events directory. No server imports:
 * this file is shared with client components (the /events browser and the
 * event card), so everything here must be safe to bundle for the browser.
 */

export type EventCity = 'Edmonton' | 'Calgary'

export const EVENT_CATEGORIES = [
  'Festival',
  'Family',
  'Sports',
  'Arts & Theatre',
  'Market',
  'Food',
  'Heritage',
  'Outdoors',
  'Recreation',
  'Community',
] as const
export type EventCategory = (typeof EVENT_CATEGORIES)[number]

export interface DirectoryEvent {
  id: string
  name: string
  /** YYYY-MM-DD, local calendar date */
  start: string
  /** YYYY-MM-DD, inclusive; same as start for one-day events */
  end: string
  /** "7:00 PM" / "10:00 AM to 4:00 PM" when the source gives a time */
  timeLabel?: string
  /** "September 26, 2026" or "September 25, 2026 - September 27, 2026" */
  dateLabel: string
  venue?: string
  city: EventCity
  category: EventCategory
  url?: string
  /** true when `url` leaves the site (organizer page) */
  external: boolean
  /** created in our admin — pinned first everywhere */
  manual: boolean
  description?: string
  image?: string
  price?: number
  currency?: string
  isFree: boolean
  organizerName?: string
  organizerUrl?: string
}

export interface WeekendWindow {
  /** Friday, YYYY-MM-DD */
  start: string
  /** Sunday, YYYY-MM-DD */
  end: string
  /** "September 25–27" */
  label: string
}

// ---------------------------------------------------------------------------
// Dates (everything in Alberta local time)
// ---------------------------------------------------------------------------

export const ALBERTA_TZ = 'America/Edmonton'

/** Today's calendar date in Alberta as YYYY-MM-DD. */
export function todayInAlberta(now: Date = new Date()): string {
  return now.toLocaleDateString('en-CA', { timeZone: ALBERTA_TZ }) // en-CA gives ISO order
}

export function addDays(ymd: string, days: number): string {
  const d = new Date(`${ymd}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function formatDate(ymd: string, opts: Intl.DateTimeFormatOptions): string {
  return new Date(`${ymd}T12:00:00Z`).toLocaleDateString('en-CA', { timeZone: 'UTC', ...opts })
}

/**
 * The weekend readers mean when they say "this weekend": the coming
 * Friday–Sunday, or the current one from Friday through Sunday night.
 */
export function weekendWindow(now: Date = new Date()): WeekendWindow {
  const today = todayInAlberta(now)
  const dow = new Date(`${today}T12:00:00Z`).getUTCDay() // 0 Sun … 6 Sat
  const toFriday = dow === 6 ? -1 : dow === 0 ? -2 : 5 - dow
  const start = addDays(today, toFriday)
  const end = addDays(start, 2)
  const sameMonth = start.slice(0, 7) === end.slice(0, 7)
  const label = sameMonth
    ? `${formatDate(start, { month: 'long', day: 'numeric' })}–${formatDate(end, { day: 'numeric' })}`
    : `${formatDate(start, { month: 'long', day: 'numeric' })} – ${formatDate(end, { month: 'long', day: 'numeric' })}`
  return { start, end, label }
}

export function dateRangeLabel(start: string, end?: string): string {
  const startLabel = formatDate(start, { month: 'long', day: 'numeric', year: 'numeric' })
  if (!end || end === start) return startLabel
  return `${startLabel} - ${formatDate(end, { month: 'long', day: 'numeric', year: 'numeric' })}`
}

/** "Fri" / "Sep" / "25" for card badges. */
export function shortDayLabel(ymd: string): { weekday: string; month: string; day: string } {
  return {
    weekday: formatDate(ymd, { weekday: 'short' }),
    month: formatDate(ymd, { month: 'short' }),
    day: formatDate(ymd, { day: 'numeric' }),
  }
}

/** True when an event overlaps [from, to] (inclusive calendar dates). */
export function overlaps(event: Pick<DirectoryEvent, 'start' | 'end'>, from: string, to: string): boolean {
  return event.start <= to && event.end >= from
}
