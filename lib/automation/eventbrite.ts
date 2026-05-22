/**
 * Eventbrite API client for fetching weekend events by Alberta city.
 * API docs: https://www.eventbrite.com/platform/api
 *
 * Requires env var: EVENTBRITE_PRIVATE_TOKEN
 * Get yours at: eventbrite.com → Account Settings → Developer Links → API Keys
 */

import { filterEvents, type FilterableEvent } from './content-filter'

const BASE_URL = 'https://www.eventbriteapi.com/v3'

// Eventbrite category IDs to INCLUDE (family/community friendly)
// Full list: https://www.eventbrite.com/platform/api#/reference/category
const ALLOWED_CATEGORY_IDS = [
  '103', // Music
  '110', // Food & Drink
  '113', // Community & Culture
  '115', // Performing & Visual Arts
  '116', // Film, Media & Entertainment
  '117', // Sports & Fitness
  '118', // Travel & Outdoor
  '119', // Charity & Causes
  '105', // Arts
]

// Eventbrite uses canonical city names for location search
const CITY_CONFIG: Record<string, { query: string; label: string; province: string }> = {
  calgary: {
    query: 'Calgary, AB, Canada',
    label: 'Calgary',
    province: 'AB',
  },
  edmonton: {
    query: 'Edmonton, AB, Canada',
    label: 'Edmonton',
    province: 'AB',
  },
  lethbridge: {
    query: 'Lethbridge, AB, Canada',
    label: 'Lethbridge',
    province: 'AB',
  },
  'medicine-hat': {
    query: 'Medicine Hat, AB, Canada',
    label: 'Medicine Hat',
    province: 'AB',
  },
  'grande-prairie': {
    query: 'Grande Prairie, AB, Canada',
    label: 'Grande Prairie',
    province: 'AB',
  },
  'fort-mcmurray': {
    query: 'Fort McMurray, AB, Canada',
    label: 'Fort McMurray',
    province: 'AB',
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
}

function formatEventbriteDate(utcStr: string, timezone: string): string {
  try {
    return new Date(utcStr).toLocaleString('en-CA', {
      timeZone: timezone,
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  } catch {
    return utcStr
  }
}

function formatPrice(ticketClasses: Array<{ free: boolean; cost?: { display: string } }>): string {
  if (!ticketClasses || ticketClasses.length === 0) return 'See website'

  const allFree = ticketClasses.every(t => t.free)
  if (allFree) return 'Free'

  const prices = ticketClasses
    .filter(t => !t.free && t.cost?.display)
    .map(t => t.cost!.display)

  if (prices.length === 0) return 'See website'
  if (prices.length === 1) return prices[0]

  // Return range
  return `${prices[0]} – ${prices[prices.length - 1]}`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapEvent(raw: any): EventbriteEvent {
  const timezone = raw.start?.timezone || 'America/Edmonton'
  const ticketClasses = raw.ticket_classes || []
  const isFree = ticketClasses.length === 0 || ticketClasses.every((t: any) => t.free)

  return {
    id: raw.id,
    title: raw.name?.text || 'Untitled Event',
    description: raw.description?.text || '',
    shortDescription: (raw.description?.text || '').slice(0, 300),
    startDate: raw.start?.utc || '',
    endDate: raw.end?.utc || '',
    startFormatted: formatEventbriteDate(raw.start?.utc, timezone),
    venueName: raw.venue?.name || '',
    venueAddress: [
      raw.venue?.address?.address_1,
      raw.venue?.address?.city,
    ].filter(Boolean).join(', '),
    url: raw.url || '',
    isFree,
    price: formatPrice(ticketClasses),
    categoryName: raw.category?.name || '',
    imageUrl: raw.logo?.url || null,
  }
}

export async function fetchWeekendEvents(
  city: string,
  weekendStart: Date,
  weekendEnd: Date,
  maxResults = 30
): Promise<EventbriteEvent[]> {
  const token = process.env.EVENTBRITE_PRIVATE_TOKEN
  if (!token) {
    throw new Error('EVENTBRITE_PRIVATE_TOKEN env var is not set')
  }

  const cityConfig = CITY_CONFIG[city]
  if (!cityConfig) {
    throw new Error(`Unknown city: ${city}. Valid options: ${Object.keys(CITY_CONFIG).join(', ')}`)
  }

  const startStr = weekendStart.toISOString().replace(/\.\d{3}Z$/, 'Z')
  const endStr = weekendEnd.toISOString().replace(/\.\d{3}Z$/, 'Z')

  const params = new URLSearchParams({
    'location.address': cityConfig.query,
    'location.within': '25km',
    'start_date.range_start': startStr,
    'start_date.range_end': endStr,
    'status': 'live',
    'expand': 'venue,category,ticket_classes,logo',
    'page_size': String(Math.min(maxResults, 50)),
    'sort_by': 'date',
  })

  // Add category filters
  ALLOWED_CATEGORY_IDS.forEach(id => {
    params.append('categories', id)
  })

  const url = `${BASE_URL}/events/search/?${params.toString()}`

  console.log(`[eventbrite] Fetching events for ${cityConfig.label}...`)

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    next: { revalidate: 0 }, // No caching — always fresh
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Eventbrite API error ${response.status}: ${body}`)
  }

  const data = await response.json()
  const rawEvents: unknown[] = data.events || []

  console.log(`[eventbrite] Got ${rawEvents.length} raw events for ${cityConfig.label}`)

  // Map to our format
  const mapped = (rawEvents as any[]).map(mapEvent)

  // Apply content filter
  const filtered = filterEvents(mapped as Array<EventbriteEvent & FilterableEvent>)

  console.log(`[eventbrite] ${filtered.length} events passed content filter for ${cityConfig.label}`)

  return filtered
}

/**
 * Get the Friday–Sunday date range for the upcoming weekend.
 * Runs on Thursday — returns Fri/Sat/Sun of the same week.
 */
export function getUpcomingWeekend(): { start: Date; end: Date; label: string } {
  const now = new Date()
  const day = now.getDay() // 0=Sun, 1=Mon, ... 4=Thu, 5=Fri, 6=Sat

  // Days until Friday
  const daysUntilFriday = (5 - day + 7) % 7 || 7

  const friday = new Date(now)
  friday.setDate(now.getDate() + daysUntilFriday)
  friday.setHours(0, 0, 0, 0)

  const sunday = new Date(friday)
  sunday.setDate(friday.getDate() + 2)
  sunday.setHours(23, 59, 59, 999)

  const monthName = friday.toLocaleString('en-CA', { month: 'long' })
  const label = `${monthName} ${friday.getDate()}–${sunday.getDate()}`

  return { start: friday, end: sunday, label }
}

export { CITY_CONFIG }
