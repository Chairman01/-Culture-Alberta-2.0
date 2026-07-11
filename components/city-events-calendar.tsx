import Link from 'next/link'
import { Calendar, MapPin, ExternalLink } from 'lucide-react'
import { fetchUpcomingOpenDataEvents } from '@/lib/automation/open-data'
import { getEventsByLocation } from '@/lib/events'
import { EventsStructuredData, type StructuredEvent } from '@/components/seo/structured-data'

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

function formatDateBadge(iso: string): { day: string; month: string } {
  try {
    const d = new Date(iso)
    return {
      day: d.toLocaleDateString('en-CA', { day: 'numeric', timeZone: 'UTC' }),
      month: d.toLocaleDateString('en-CA', { month: 'short', timeZone: 'UTC' }),
    }
  } catch {
    return { day: '', month: '' }
  }
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
  limit = 10,
}: {
  citySlug: string
  cityLabel: string
  limit?: number
}) {
  const events = await getCityEvents(citySlug, cityLabel, limit)

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {events.map(event => (
          <div key={event.id} className="flex items-start gap-4 rounded-lg border bg-white p-4 shadow-sm">
            <div className="flex flex-col items-center justify-center rounded-md bg-blue-50 px-3 py-2 min-w-[56px]">
              <span className="text-xs font-semibold uppercase text-blue-600">
                {formatDateBadge(event.startDate).month}
              </span>
              <span className="text-xl font-bold text-blue-800 leading-none">
                {formatDateBadge(event.startDate).day}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-gray-900 leading-snug line-clamp-2">
                {event.url ? (
                  <a href={event.url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-700">
                    {event.name}
                  </a>
                ) : (
                  event.name
                )}
              </h3>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {event.dateLabel}
                </span>
                {event.venueName && (
                  <span className="flex items-center gap-1 min-w-0">
                    <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate max-w-[180px]">{event.venueName}</span>
                  </span>
                )}
                {event.category && (
                  <span className="rounded-full bg-gray-100 px-2 py-0.5">{event.category}</span>
                )}
                {event.url && <ExternalLink className="h-3 w-3" />}
              </div>
            </div>
          </div>
        ))}
      </div>

      <Link href="/events" className="mt-4 inline-flex sm:hidden items-center gap-1 text-sm font-medium text-blue-600">
        Full events calendar →
      </Link>
    </section>
  )
}
