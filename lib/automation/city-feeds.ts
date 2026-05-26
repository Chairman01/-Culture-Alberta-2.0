/**
 * City iCal / RSS event feed fetcher for Alberta municipalities.
 *
 * Fetches public event calendar feeds published by city websites and maps them
 * to the shared EventbriteEvent interface so they flow into the same article
 * generator pipeline as Ticketmaster events.
 *
 * HOW TO FIND A CITY'S iCAL URL:
 *   1. Go to the city's events/calendar page
 *   2. Look for "Subscribe", "Add to Calendar", "Export", or "iCal" links
 *   3. Right-click → copy link address
 *   4. Paste the URL in CITY_ICAL_FEEDS below
 *
 * If a city has no iCal feed, set it to null — the system will skip it
 * gracefully and rely solely on Ticketmaster for that city.
 */

import type { EventbriteEvent } from './eventbrite'

// ---------------------------------------------------------------------------
// Feed URL configuration — update these as city URLs change
// ---------------------------------------------------------------------------

const CITY_ICAL_FEEDS: Record<string, string | null> = {
  // Calgary: City of Calgary public event calendar
  // Verify at: https://www.calgary.ca/events.html → look for "Subscribe"
  calgary: 'https://www.calgary.ca/content/dam/www/csps/abs/documents/events-calendar.ics',

  // Edmonton: City of Edmonton events calendar
  // Verify at: https://www.edmonton.ca/programs_services/events → "Add to Calendar"
  edmonton: 'https://www.edmonton.ca/events.ics',

  // Smaller cities — add iCal URLs if they publish feeds
  lethbridge: null,
  'medicine-hat': null,
  'grande-prairie': null,
  'fort-mcmurray': null,
}

// ---------------------------------------------------------------------------
// Lightweight iCal (.ics) parser
// Handles VCALENDAR → VEVENT blocks, including folded lines and CRLF line endings
// ---------------------------------------------------------------------------

interface RawVEvent {
  summary?: string
  description?: string
  location?: string
  url?: string
  dtstart?: string
  dtend?: string
  uid?: string
}

function unfoldLines(raw: string): string[] {
  // iCal uses CRLF; fold continuation lines start with space or tab
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n[ \t]/g, '') // unfold continuation lines
    .split('\n')
}

function parseIcalValue(value: string): string {
  // Unescape iCal encoded chars: \n → newline, \, → comma, etc.
  return value
    .replace(/\\n/g, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
    .trim()
}

/** Parse a DTSTART/DTEND property value to ISO 8601 string */
function parseDt(raw: string): string {
  // Formats: 20240524T180000Z  |  20240524T180000  |  20240524
  const clean = raw.replace(/^.*?:/, '') // strip property params (TZID=...)
  if (clean.length === 8) {
    // All-day: YYYYMMDD
    return `${clean.slice(0, 4)}-${clean.slice(4, 6)}-${clean.slice(6, 8)}T00:00:00`
  }
  // Datetime: YYYYMMDDTHHMMSS[Z]
  return [
    clean.slice(0, 4), '-', clean.slice(4, 6), '-', clean.slice(6, 8),
    'T', clean.slice(9, 11), ':', clean.slice(11, 13), ':', clean.slice(13, 15),
    clean.endsWith('Z') ? 'Z' : '',
  ].join('')
}

function parseIcal(icsText: string): RawVEvent[] {
  const lines = unfoldLines(icsText)
  const events: RawVEvent[] = []
  let current: RawVEvent | null = null

  for (const line of lines) {
    const colon = line.indexOf(':')
    if (colon === -1) continue

    const key = line.slice(0, colon).toUpperCase().split(';')[0] // strip params
    const rawVal = line.slice(colon + 1)

    if (key === 'BEGIN' && rawVal.trim().toUpperCase() === 'VEVENT') {
      current = {}
      continue
    }
    if (key === 'END' && rawVal.trim().toUpperCase() === 'VEVENT') {
      if (current) events.push(current)
      current = null
      continue
    }
    if (!current) continue

    switch (key) {
      case 'SUMMARY':     current.summary     = parseIcalValue(rawVal); break
      case 'DESCRIPTION': current.description = parseIcalValue(rawVal); break
      case 'LOCATION':    current.location    = parseIcalValue(rawVal); break
      case 'URL':         current.url         = parseIcalValue(rawVal); break
      case 'UID':         current.uid         = parseIcalValue(rawVal); break
      case 'DTSTART':     current.dtstart     = parseDt(rawVal.trim()); break
      case 'DTEND':       current.dtend       = parseDt(rawVal.trim()); break
    }
  }

  return events
}

// ---------------------------------------------------------------------------
// Format helpers
// ---------------------------------------------------------------------------

function formatEventDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-CA', {
      timeZone: 'America/Edmonton',
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  } catch {
    return iso
  }
}

/** Map a parsed VEVENT to the shared EventbriteEvent shape */
function mapToEvent(raw: RawVEvent, idx: number): EventbriteEvent {
  const title = raw.summary || 'Untitled Event'
  const description = raw.description || ''
  const start = raw.dtstart || new Date().toISOString()
  const end = raw.dtend || start

  return {
    id: raw.uid || `city-feed-${idx}-${Date.now()}`,
    title,
    description,
    shortDescription: description.slice(0, 300),
    startDate: start,
    endDate: end,
    startFormatted: formatEventDate(start),
    venueName: raw.location?.split(',')[0]?.trim() || '',
    venueAddress: raw.location || '',
    url: raw.url || '',
    isFree: true, // city-published events are usually free or have separate ticketing
    price: 'See website',
    categoryName: 'Community',
    imageUrl: null,
  }
}

// ---------------------------------------------------------------------------
// Weekend date filter
// ---------------------------------------------------------------------------

function isWithinWeekend(isoStr: string, start: Date, end: Date): boolean {
  try {
    const d = new Date(isoStr)
    return d >= start && d <= end
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch and return events from a city's iCal feed that fall within the weekend.
 * Returns an empty array (never throws) so callers can safely merge with Ticketmaster results.
 */
export async function fetchCityFeedEvents(
  city: string,
  weekendStart: Date,
  weekendEnd: Date
): Promise<EventbriteEvent[]> {
  const url = CITY_ICAL_FEEDS[city]

  if (!url) {
    // City has no configured feed — skip silently
    return []
  }

  let icsText: string
  try {
    const res = await fetch(url, {
      next: { revalidate: 0 },
      headers: {
        'User-Agent': 'CultureAlberta/1.0 (hello@culturealberta.com)',
        Accept: 'text/calendar, */*',
      },
      signal: AbortSignal.timeout(10_000), // 10 s timeout
    })

    if (!res.ok) {
      console.warn(`[city-feeds] ${city}: HTTP ${res.status} from ${url} — skipping feed`)
      return []
    }

    icsText = await res.text()
  } catch (err) {
    console.warn(`[city-feeds] ${city}: Could not fetch feed (${err instanceof Error ? err.message : err}) — skipping`)
    return []
  }

  if (!icsText.includes('BEGIN:VCALENDAR') && !icsText.includes('BEGIN:VEVENT')) {
    console.warn(`[city-feeds] ${city}: Response doesn't look like iCal — skipping`)
    return []
  }

  const rawEvents = parseIcal(icsText)
  console.log(`[city-feeds] ${city}: Parsed ${rawEvents.length} events from feed`)

  // Filter to events that start within the upcoming weekend
  const weekendEvents = rawEvents
    .filter(e => e.dtstart && isWithinWeekend(e.dtstart, weekendStart, weekendEnd))
    .filter(e => e.summary && e.summary.trim().length > 2)

  console.log(`[city-feeds] ${city}: ${weekendEvents.length} events fall within weekend window`)

  return weekendEvents.map((e, i) => mapToEvent(e, i))
}

/**
 * Merge Ticketmaster events and city feed events, deduplicating by title similarity.
 * Ticketmaster events take priority (they have richer data); city feed events fill gaps.
 */
export function mergeAndDedup(
  ticketmasterEvents: EventbriteEvent[],
  cityFeedEvents: EventbriteEvent[]
): EventbriteEvent[] {
  if (cityFeedEvents.length === 0) return ticketmasterEvents

  const tmTitles = new Set(
    ticketmasterEvents.map(e => normalizeTitle(e.title))
  )

  // Only add city feed events whose titles don't already appear in Ticketmaster
  const uniqueCityEvents = cityFeedEvents.filter(e => {
    const norm = normalizeTitle(e.title)
    // Check for exact or near-exact match
    return !tmTitles.has(norm) && !isTitleSimilarToAny(norm, tmTitles)
  })

  console.log(`[city-feeds] Merging: ${ticketmasterEvents.length} Ticketmaster + ${uniqueCityEvents.length} unique city feed events (${cityFeedEvents.length - uniqueCityEvents.length} deduplicated)`)

  // Ticketmaster events first (better data), then city feed extras
  return [...ticketmasterEvents, ...uniqueCityEvents]
}

function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 40)
}

function isTitleSimilarToAny(norm: string, existing: Set<string>): boolean {
  for (const t of existing) {
    // If 80%+ of the shorter title appears in the longer one, consider duplicate
    const shorter = norm.length < t.length ? norm : t
    const longer  = norm.length < t.length ? t : norm
    if (shorter.length >= 6 && longer.includes(shorter)) return true
  }
  return false
}
