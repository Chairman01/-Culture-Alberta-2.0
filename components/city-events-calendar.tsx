import Link from 'next/link'
import { EventsStructuredData, type StructuredEvent } from '@/components/seo/structured-data'
import { EventCard } from '@/components/events/event-card'
import { getCityDirectoryEvents, type EventCity } from '@/lib/events-directory/directory'

/**
 * Compact "Upcoming events" section for city hub pages — two rows of the same
 * photo cards as /events, with a link to the full calendar.
 *
 * Server component. Reads the shared events directory (curated events plus
 * the city's municipal open data, values-filtered, with organizer photos) so
 * the city page and /events never disagree. Renders nothing when a city has
 * no upcoming events (smaller cities without an open-data feed), so it is safe
 * to drop into every city page.
 *
 * SEO: server-rendered listing plus schema.org Event ItemList JSON-LD, which
 * is what makes the events eligible for Google/Bing event rich results.
 */

// Two rows of cards on desktop (4 per row)
const MAX_CARDS = 8

function asCity(slug: string): EventCity | null {
  if (slug === 'calgary') return 'Calgary'
  if (slug === 'edmonton') return 'Edmonton'
  return null
}

export async function CityEventsCalendar({
  citySlug,
  cityLabel,
}: {
  citySlug: string
  cityLabel: string
}) {
  const city = asCity(citySlug)
  if (!city) return null

  let events: Awaited<ReturnType<typeof getCityDirectoryEvents>> = []
  try {
    events = await getCityDirectoryEvents(city, MAX_CARDS)
  } catch {
    // Directory unavailable — the page still renders without this section
  }
  if (events.length === 0) return null

  const structuredEvents: StructuredEvent[] = events.map(e => ({
    name: e.name,
    startDate: e.start,
    endDate: e.end !== e.start ? e.end : undefined,
    venueName: e.venue,
    city: cityLabel,
    url: e.url,
    description: e.description,
    category: e.category,
    image: e.image,
    price: e.isFree ? 0 : e.price,
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
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h2 id="city-events-heading" className="font-display text-2xl font-bold text-gray-900 md:text-3xl">
            Upcoming events in {cityLabel}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Things to do in {cityLabel}, from official city listings and Culture Alberta picks.
          </p>
        </div>
        <Link href="/events" className="hidden items-center gap-1 text-sm font-medium text-red-600 hover:text-red-700 sm:inline-flex">
          See all events →
        </Link>
      </div>

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {events.map(event => (
          <li key={event.id}>
            <EventCard event={event} />
          </li>
        ))}
      </ul>

      <Link href="/events" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-red-600 sm:hidden">
        See all events →
      </Link>
    </section>
  )
}
