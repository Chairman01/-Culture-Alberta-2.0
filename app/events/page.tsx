import { Metadata } from "next"
import { fetchUpcomingOpenDataEvents } from '@/lib/automation/open-data'
import { EventsStructuredData, type StructuredEvent } from '@/components/seo/structured-data'
import EventsBrowser, { type BrowserEvent } from "./events-browser"

export const metadata: Metadata = {
  title: 'Alberta Events Calendar | Things to Do in Calgary & Edmonton',
  description: 'Upcoming events, festivals, markets, and performances in Calgary and Edmonton — searchable by keyword, type, and date, updated from official city event listings.',
  openGraph: {
    title: 'Alberta Events Calendar | Culture Alberta',
    description: 'Upcoming events, festivals, markets, and performances in Calgary and Edmonton — updated from official city event listings.',
    type: 'website',
  },
}

export const revalidate = 3600 // Revalidate every hour

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-CA', {
      timeZone: 'UTC', month: 'long', day: 'numeric', year: 'numeric',
    })
  } catch {
    return iso
  }
}

function dateRangeLabel(start: string, end?: string): string {
  const startLabel = formatDate(start)
  if (!end || end.slice(0, 10) === start.slice(0, 10)) return startLabel
  return `${startLabel} - ${formatDate(end)}`
}

/** Edmonton + Calgary events: municipal open-data feeds (values-filtered at source) + our curated events. */
async function getBrowserEvents(): Promise<BrowserEvent[]> {
  const events: BrowserEvent[] = []

  try {
    const openData = await fetchUpcomingOpenDataEvents(90)
    for (const e of openData) {
      events.push({
        id: e.id,
        name: e.title,
        start: e.startDate.slice(0, 10),
        end: e.endDate ? e.endDate.slice(0, 10) : undefined,
        dateRangeLabel: dateRangeLabel(e.startDate, e.endDate),
        venue: e.venueName || undefined,
        city: (e.city === 'calgary' ? 'Calgary' : 'Edmonton') as BrowserEvent['city'],
        category: e.categoryName || 'Community',
        url: e.url || undefined,
      })
    }
  } catch (error) {
    console.warn('⚠️ Open-data events failed to load:', error)
  }

  // Curated events from our own events table (Edmonton/Calgary).
  // These take priority over automated feed events: all upcoming ones plus
  // the 3 most recent past ones are included and pinned first in the browser.
  try {
    const { getAllEvents } = await import('@/lib/events')
    const curated = await getAllEvents()
    const today = new Date().toISOString().slice(0, 10)
    const mapped: BrowserEvent[] = []
    for (const e of curated) {
      const start = (e as any).event_date
      const loc = (e.location || '').toLowerCase()
      const city = loc.includes('calgary') ? 'Calgary' : loc.includes('edmonton') ? 'Edmonton' : null
      if (!start || !city) continue
      const end = (e as any).event_end_date
      const slug = (e as any).slug
      mapped.push({
        id: e.id,
        name: e.title,
        start: start.slice(0, 10),
        end: end ? end.slice(0, 10) : undefined,
        dateRangeLabel: dateRangeLabel(start, end),
        venue: (e as any).venue || undefined,
        city: city as BrowserEvent['city'],
        category: e.category || 'Community',
        url: slug ? `/events/${slug}` : (e as any).website_url || undefined,
        manual: true,
      })
    }
    const upcoming = mapped.filter(e => (e.end || e.start) >= today)
    const recentPast = mapped
      .filter(e => (e.end || e.start) < today)
      .sort((a, b) => b.start.localeCompare(a.start))
      .slice(0, 3)
    events.push(...upcoming, ...recentPast)
  } catch (error) {
    console.warn('⚠️ Curated events failed to load (non-fatal):', error)
  }

  return events.sort((a, b) => a.start.localeCompare(b.start))
}

export default async function EventsPage() {
  const events = await getBrowserEvents()

  // schema.org Event ItemList — eligibility for Google/Bing event rich results
  const structuredEvents: StructuredEvent[] = events.slice(0, 50).map(e => ({
    name: e.name,
    startDate: e.start,
    endDate: e.end,
    venueName: e.venue,
    city: e.city,
    url: e.url,
    category: e.category,
  }))

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        <EventsStructuredData
          events={structuredEvents}
          pageUrl="/events"
          listName="Upcoming events in Calgary and Edmonton, Alberta"
        />

        <section className="w-full py-12 md:py-16 bg-muted/40">
          <div className="container mx-auto max-w-7xl px-4 md:px-6">
            <div className="space-y-3">
              <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl">Upcoming Events</h1>
              <p className="max-w-[800px] text-muted-foreground md:text-lg">
                Things to do in Edmonton and Calgary, updated from official city event listings.
              </p>
              <p className="max-w-[800px] text-sm text-muted-foreground">
                Dates and locations may be changed by the organizer without notice. Please check the
                event&apos;s website for details and more information.
              </p>
            </div>
          </div>
        </section>

        <section className="w-full py-10 md:py-14">
          <div className="container mx-auto max-w-7xl px-4 md:px-6">
            {/* Server-rendered event list for SEO */}
            <div className="sr-only">
              <h2>Found {events.length} upcoming events in Edmonton and Calgary</h2>
              <ul>
                {events.map(event => (
                  <li key={event.id}>
                    {event.name} - {event.venue || event.city} - {event.dateRangeLabel}
                  </li>
                ))}
              </ul>
            </div>

            <EventsBrowser events={events} />
          </div>
        </section>
      </main>
    </div>
  )
}
