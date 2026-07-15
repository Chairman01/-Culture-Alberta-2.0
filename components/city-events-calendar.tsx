import Link from 'next/link'
import { fetchUpcomingOpenDataEvents } from '@/lib/automation/open-data'
import { getEventsByLocation } from '@/lib/events'
import { EventsStructuredData, type StructuredEvent } from '@/components/seo/structured-data'

/**
 * Compact "Upcoming events" section for city hub pages — two rows of cards
 * matching the /events listing style, with a link to the full calendar.
 *
 * Server component: merges the city's municipal open-data feed (Calgary and
 * Edmonton) with our curated events table, values-filtered at the source.
 * Renders nothing when a city has no upcoming events (smaller cities without
 * an open-data feed), so it is safe to drop into every city page.
 *
 * SEO: server-rendered listing plus schema.org Event ItemList JSON-LD, which
 * is what makes the events eligible for Google/Bing event rich results.
 */

interface DisplayEvent {
  id: string
  name: string
  dateLabel: string
  startDate: string
  endDate?: string
  venueName?: string
  category?: string
  url?: string
  description?: string
  image?: string
  price?: number
  currency?: string
  organizerName?: string
  organizerUrl?: string
}

async function getCityEvents(citySlug: string, cityLabel: string, limit: number): Promise<DisplayEvent[]> {
  const events: DisplayEvent[] = []

  // Municipal open data (Calgary / Edmonton only; [] elsewhere)
  if (citySlug === 'calgary' || citySlug === 'edmonton') {
    try {
      const openData = await fetchUpcomingOpenDataEvents(60, citySlug)
      for (const e of openData) {
        events.push({
          id: e.id,
          name: e.title,
          dateLabel: e.startFormatted,
          startDate: e.startDate,
          endDate: e.endDate,
          venueName: e.venueName || undefined,
          category: e.categoryName,
          url: e.url || undefined,
          description: e.shortDescription || undefined,
          image: e.imageUrl || undefined,
        })
      }
    } catch {
      // Feed failure is non-fatal; curated events still render
    }
  }

  // Curated events from our own events table
  try {
    const curated = await getEventsByLocation(cityLabel)
    const now = Date.now()
    for (const e of curated) {
      const start = (e as any).event_date
      if (!start || new Date(start).getTime() < now - 24 * 60 * 60 * 1000) continue
      events.push({
        id: e.id,
        name: e.title,
        dateLabel: new Date(start).toLocaleDateString('en-CA', {
          weekday: 'long', month: 'long', day: 'numeric', timeZone: 'America/Edmonton',
        }),
        startDate: start,
        endDate: (e as any).event_end_date || undefined,
        venueName: (e as any).venue || undefined,
        category: e.category || undefined,
        url: (e as any).website_url || undefined,
        description: e.excerpt || e.description || undefined,
        image: (e as any).image_url || undefined,
        price: typeof (e as any).price === 'number' ? (e as any).price : undefined,
        currency: (e as any).currency || undefined,
        organizerName: (e as any).organizer || undefined,
        organizerUrl: (e as any).website_url || undefined,
      })
    }
  } catch {
    // Table unavailable — open data alone is fine
  }

  return events
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .slice(0, limit)
}

const BADGE_COLORS: Array<{ match: RegExp; classes: string }> = [
  { match: /festival/i, classes: 'bg-red-700 text-white' },
  { match: /sport/i, classes: 'bg-orange-600 text-white' },
  { match: /outdoor/i, classes: 'bg-amber-700 text-white' },
  { match: /art/i, classes: 'bg-blue-700 text-white' },
  { match: /communit|programming/i, classes: 'bg-purple-700 text-white' },
  { match: /recreation|leisure/i, classes: 'bg-teal-700 text-white' },
]

function badgeClass(category?: string): string {
  if (!category) return 'bg-gray-600 text-white'
  return BADGE_COLORS.find(b => b.match.test(category))?.classes || 'bg-gray-600 text-white'
}

function dateRangeLabel(start: string, end?: string): string {
  const fmt = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('en-CA', { timeZone: 'UTC', month: 'long', day: 'numeric', year: 'numeric' })
    } catch {
      return iso
    }
  }
  if (!end || end.slice(0, 10) === start.slice(0, 10)) return fmt(start)
  return `${fmt(start)} - ${fmt(end)}`
}

// Two rows of cards on desktop (4 per row)
const MAX_CARDS = 8

export async function CityEventsCalendar({
  citySlug,
  cityLabel,
}: {
  citySlug: string
  cityLabel: string
}) {
  const events = await getCityEvents(citySlug, cityLabel, MAX_CARDS)

  if (events.length === 0) return null

  const structuredEvents: StructuredEvent[] = events.map(e => ({
    name: e.name,
    startDate: e.startDate,
    endDate: e.endDate,
    venueName: e.venueName,
    city: cityLabel,
    url: e.url,
    description: e.description,
    category: e.category,
    image: e.image,
    price: e.price,
    currency: e.currency,
    organizerName: e.organizerName,
    organizerUrl: e.organizerUrl,
  }))

  return (
    <section className="w-full py-10" aria-labelledby="city-events-heading">
      <EventsStructuredData
        events={structuredEvents}
        pageUrl={`/${citySlug}`}
        listName={`Upcoming events in ${cityLabel}, Alberta`}
      />
      <div className="flex items-end justify-between mb-6">
        <div>
          <h2 id="city-events-heading" className="font-display text-2xl md:text-3xl font-bold text-gray-900">
            Upcoming events in {cityLabel}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Things to do in {cityLabel}, updated from official city event listings.
          </p>
        </div>
        <Link href="/events" className="hidden sm:inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700">
          See all events →
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {events.map(event => (
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
              <strong>Date:</strong> {dateRangeLabel(event.startDate, event.endDate)}
            </p>
            <p className="text-sm text-gray-800 mb-3">
              <strong>Location:</strong> {event.venueName || cityLabel}
            </p>
            {event.category && (
              <div className="mt-auto">
                <span className={`rounded px-2.5 py-1 text-xs font-semibold ${badgeClass(event.category)}`}>
                  {event.category}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      <Link href="/events" className="mt-4 inline-flex sm:hidden items-center gap-1 text-sm font-medium text-blue-600">
        See all events →
      </Link>
    </section>
  )
}
