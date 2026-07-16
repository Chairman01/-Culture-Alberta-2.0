/**
 * Ticketmaster Discovery API client for fetching weekend events by Alberta city.
 * Replaces the deprecated Eventbrite public search API.
 *
 * API docs: https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/
 * Free tier: 5,000 calls/day — plenty for weekly automation.
 *
 * Requires env var: TICKETMASTER_API_KEY
 * Get yours (free) at: https://developer.ticketmaster.com/
 */

import { filterEvents, type FilterableEvent } from './content-filter'

const BASE_URL = 'https://app.ticketmaster.com/discovery/v2'

// Ticketmaster segment/classification names to include.
// 'Music' is deliberately excluded — concerts and music festivals are not
// promoted in weekend articles (editorial values; see content-filter.ts).
const ALLOWED_CLASSIFICATIONS = [
  'Arts & Theatre',
  'Sports',
  'Family',
  'Film',
  'Miscellaneous',
]

const CITY_CONFIG: Record<string, { query: string; label: string; stateCode: string }> = {
  calgary: {
    query: 'Calgary',
    label: 'Calgary',
    stateCode: 'AB',
  },
  edmonton: {
    query: 'Edmonton',
    label: 'Edmonton',
    stateCode: 'AB',
  },
  lethbridge: {
    query: 'Lethbridge',
    label: 'Lethbridge',
    stateCode: 'AB',
  },
  'medicine-hat': {
    query: 'Medicine Hat',
    label: 'Medicine Hat',
    stateCode: 'AB',
  },
  'grande-prairie': {
    query: 'Grande Prairie',
    label: 'Grande Prairie',
    stateCode: 'AB',
  },
  'fort-mcmurray': {
    query: 'Fort McMurray',
    label: 'Fort McMurray',
    stateCode: 'AB',
  },
  'red-deer': {
    query: 'Red Deer',
    label: 'Red Deer',
    stateCode: 'AB',
  },
}

export interface EventbriteEvent {
  id: string
  title: string
  description: string
  shortDescription: string
  startDate: string       // ISO
  endDate: string         // ISO
  startFormatted: string  // Human readable e.g. "Saturday, May 24 at 7:00 PM"
  venueName: string
  venueAddress: string
  url: string
  isFree: boolean
  price: string           // e.g. "$15–$45" or "Free"
  categoryName: string
  imageUrl: string | null
  instagramUrl?: string | null  // organizer's Instagram profile, discovered from their website
}

function formatDate(localDate: string, localTime: string | undefined, timezone = 'America/Edmonton'): string {
  try {
    const dateStr = localTime ? `${localDate}T${localTime}` : localDate
    return new Date(dateStr).toLocaleString('en-CA', {
      timeZone: timezone,
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  } catch {
    return localDate
  }
}

function formatPrice(ranges: Array<{ min?: number; max?: number; currency?: string }> | undefined): string {
  if (!ranges || ranges.length === 0) return 'See website'
  const r = ranges[0]
  if (!r.min && !r.max) return 'See website'
  const currency = r.currency === 'CAD' ? 'CA$' : '$'
  if (r.min === r.max || !r.max) return `${currency}${r.min?.toFixed(0)}`
  return `${currency}${r.min?.toFixed(0)}-${currency}${r.max?.toFixed(0)}`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapEvent(raw: any): EventbriteEvent {
  const venue = raw._embedded?.venues?.[0]
  const venueName = venue?.name || ''
  const venueAddress = [venue?.address?.line1, venue?.city?.name ?? venue?.location?.city]
    .filter(Boolean).join(', ')

  const localDate = raw.dates?.start?.localDate || ''
  const localTime = raw.dates?.start?.localTime
  const isoStart = raw.dates?.start?.dateTime || localDate

  const classification = raw.classifications?.[0]
  const categoryName = classification?.segment?.name || classification?.genre?.name || ''

  // Pick best image (prefer 16:9 landscape)
  const images: Array<{ url: string; ratio?: string; width?: number }> = raw.images || []
  const best = images.find(i => i.ratio === '16_9' && (i.width || 0) >= 1024)
    ?? images.find(i => i.ratio === '16_9')
    ?? images[0]

  const name: string = raw.name || 'Untitled Event'
  const info: string = raw.info || raw.pleaseNote || raw.description || ''

  return {
    id: raw.id,
    title: name,
    description: info,
    shortDescription: info.slice(0, 300),
    startDate: isoStart,
    endDate: raw.dates?.end?.dateTime || isoStart,
    startFormatted: formatDate(localDate, localTime),
    venueName,
    venueAddress,
    url: raw.url || '',
    isFree: !raw.priceRanges || raw.priceRanges.length === 0,
    price: formatPrice(raw.priceRanges),
    categoryName,
    imageUrl: best?.url || null,
  }
}

export async function fetchWeekendEvents(
  city: string,
  weekendStart: Date,
  weekendEnd: Date,
  maxResults = 30
): Promise<EventbriteEvent[]> {
  const apiKey = process.env.TICKETMASTER_API_KEY
  if (!apiKey) {
    throw new Error('TICKETMASTER_API_KEY env var is not set')
  }

  const cityConfig = CITY_CONFIG[city]
  if (!cityConfig) {
    throw new Error(`Unknown city: ${city}. Valid options: ${Object.keys(CITY_CONFIG).join(', ')}`)
  }

  // Ticketmaster expects ISO 8601 without milliseconds
  const startStr = weekendStart.toISOString().replace(/\.\d{3}Z$/, 'Z')
  const endStr = weekendEnd.toISOString().replace(/\.\d{3}Z$/, 'Z')

  const params = new URLSearchParams({
    apikey: apiKey,
    city: cityConfig.query,
    stateCode: cityConfig.stateCode,
    countryCode: 'CA',
    startDateTime: startStr,
    endDateTime: endStr,
    size: String(Math.min(maxResults, 50)),
    sort: 'date,asc',
    classificationName: ALLOWED_CLASSIFICATIONS.join(','),
  })

  const url = `${BASE_URL}/events.json?${params.toString()}`
  console.log(`[ticketmaster] Fetching events for ${cityConfig.label}...`)

  const response = await fetch(url, {
    next: { revalidate: 0 },
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Ticketmaster API error ${response.status}: ${body}`)
  }

  const data = await response.json()
  const rawEvents: unknown[] = data._embedded?.events || []

  console.log(`[ticketmaster] Got ${rawEvents.length} raw events for ${cityConfig.label}`)

  // Map to our format
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapped = (rawEvents as any[]).map(mapEvent)

  // Apply content filter
  const filtered = filterEvents(mapped as Array<EventbriteEvent & FilterableEvent>)

  console.log(`[ticketmaster] ${filtered.length} events passed content filter for ${cityConfig.label}`)

  return filtered
}

/**
 * Get the Friday–Sunday date range for the upcoming weekend.
 */
export function getUpcomingWeekend(): { start: Date; end: Date; label: string } {
  const now = new Date()
  const day = now.getDay() // 0=Sun ... 4=Thu, 5=Fri, 6=Sat

  // Days until Friday (if already Friday or later, go to NEXT Friday)
  const daysUntilFriday = (5 - day + 7) % 7 || 7

  const friday = new Date(now)
  friday.setDate(now.getDate() + daysUntilFriday)
  friday.setHours(0, 0, 0, 0)

  const sunday = new Date(friday)
  sunday.setDate(friday.getDate() + 2)
  sunday.setHours(23, 59, 59, 999)

  const fridayMonth = friday.toLocaleString('en-CA', { month: 'long' })
  const sundayMonth = sunday.toLocaleString('en-CA', { month: 'long' })
  const year = sunday.getFullYear()
  // Include the year so search engines read the guide as current-dated and the
  // long-tail "...this weekend July 2026" query matches. Same-month weekends
  // collapse the second month for readability.
  const label = fridayMonth === sundayMonth
    ? `${fridayMonth} ${friday.getDate()} to ${sunday.getDate()}, ${year}`
    : `${fridayMonth} ${friday.getDate()} to ${sundayMonth} ${sunday.getDate()}, ${year}`

  return { start: friday, end: sunday, label }
}

export { CITY_CONFIG }
