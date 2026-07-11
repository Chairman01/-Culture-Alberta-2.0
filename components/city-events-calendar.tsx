import Link from 'next/link'
import { fetchUpcomingOpenDataEvents } from '@/lib/automation/open-data'
import { getEventsByLocation } from '@/lib/events'
import { EventsStructuredData, type StructuredEvent } from '@/components/seo/structured-data'
import { EventsMonthCalendar, type CalendarEvent } from '@/components/events-month-calendar'

/**
 * Dynamic "Upcoming events" calendar section for city hub pages.
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
        description: e.excerpt || undefined,
      })
    }
  } catch {
    // Table unavailable — open data alone is fine
  }

  return events
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .slice(0, limit)
}

export async function CityEventsCalendar({
  citySlug,
  cityLabel,
  limit = 120,
}: {
  citySlug: string
  cityLabel: string
  limit?: number
}) {
  const events = await getCityEvents(citySlug, cityLabel, limit)

  if (events.length === 0) return null

  // Cap the JSON-LD payload; the interactive calendar still gets everything
  const structuredEvents: StructuredEvent[] = events.slice(0, 25).map(e => ({
    name: e.name,
    startDate: e.startDate,
    endDate: e.endDate,
    venueName: e.venueName,
    city: cityLabel,
    url: e.url,
    description: e.description,
    category: e.category,
  }))

  const calendarEvents: CalendarEvent[] = events.map(e => ({
    id: e.id,
    name: e.name,
    start: e.startDate.slice(0, 10),
    end: e.endDate ? e.endDate.slice(0, 10) : undefined,
    timeLabel: e.dateLabel,
    venue: e.venueName,
    category: e.category,
    url: e.url,
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
          Full events calendar →
        </Link>
      </div>

      <EventsMonthCalendar events={calendarEvents} />

      <Link href="/events" className="mt-4 inline-flex sm:hidden items-center gap-1 text-sm font-medium text-blue-600">
        Full events calendar →
      </Link>
    </section>
  )
}
