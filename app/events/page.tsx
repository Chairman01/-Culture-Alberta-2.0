import { Metadata } from "next"
import { loadOptimizedFallback } from '@/lib/optimized-fallback'
import { fetchUpcomingOpenDataEvents } from '@/lib/automation/open-data'
import { EventsStructuredData, type StructuredEvent } from '@/components/seo/structured-data'
import { EventsMonthCalendar, type CalendarEvent } from '@/components/events-month-calendar'
import EventsClient from "./events-client"

export const metadata: Metadata = {
  title: 'Alberta Events Calendar | Things to Do in Calgary & Edmonton',
  description: 'Upcoming events, festivals, markets, and performances across Alberta — updated from City of Calgary and City of Edmonton event listings.',
  openGraph: {
    title: 'Alberta Events Calendar | Culture Alberta',
    description: 'Upcoming events, festivals, markets, and performances across Alberta — updated from City of Calgary and City of Edmonton event listings.',
    type: 'website',
  },
}

export const revalidate = 3600 // Revalidate every hour

async function getEvents() {
  console.log('🔄 Loading events with fallback system...')

  // Try Supabase first using the events library
  try {
    const { getAllEvents } = await import('@/lib/events')
    const supabaseEvents = await getAllEvents()

    // Filter for events only (getAllEvents already returns only events)
    const events = supabaseEvents

    if (events.length > 0) {
      console.log(`✅ Loaded ${events.length} events from Supabase`)

      // Transform to expected format
      return events.map(event => ({
        id: event.id,
        title: event.title,
        excerpt: event.excerpt || event.description?.substring(0, 200) || '',
        description: event.description || '',
        category: event.category || 'General',
        location: event.location || 'Alberta',
        date: event.event_date || new Date().toISOString(),
        imageUrl: event.image_url || '',
        author: event.organizer || 'Event Organizer',
        websiteUrl: event.website_url || '',
      }))
    }
  } catch (error) {
    console.warn('⚠️ Supabase failed for events, using fallback:', error)
  }

  // Fallback to optimized JSON
  try {
    console.log('⚠️ Using optimized fallback for events')
    const fallbackArticles = await loadOptimizedFallback()
    console.log(`⚡ FALLBACK: Loaded ${fallbackArticles.length} articles from optimized fallback`)

    // Filter for events only
    const events = fallbackArticles.filter(article => article.type === 'event')
    console.log(`✅ Found ${events.length} events in fallback data`)

    // Transform to expected format
    return events.map(event => ({
      id: event.id,
      title: event.title,
      excerpt: event.excerpt || event.content?.substring(0, 200) || '',
      description: event.content || '',
      category: event.category || 'General',
      location: event.location || 'Alberta',
      date: (event as any).event_date || (event as any).eventDate || event.date || event.createdAt || new Date().toISOString(),
      imageUrl: event.imageUrl || '',
      author: event.author || 'Event Organizer',
      websiteUrl: (event as any).website_url || (event as any).websiteUrl || '',
    }))
  } catch (error) {
    console.error('❌ Failed to load events from fallback:', error)
    // Return fallback event to prevent empty page
    return [{
      id: 'fallback-event',
      title: 'Upcoming Cultural Events in Alberta',
      excerpt: 'Discover upcoming events, festivals, and happenings across Alberta. Check back soon for new events!',
      description: 'We are working on bringing you amazing event content.',
      category: 'Events',
      location: 'Alberta',
      date: new Date().toISOString(),
      imageUrl: '',
      author: 'Culture Alberta',
    }]
  }
}

/** Events from Calgary + Edmonton open-data portals, mapped to the page's shape. */
async function getMunicipalEvents() {
  try {
    const openDataEvents = await fetchUpcomingOpenDataEvents(60)
    return openDataEvents.map(e => {
      const cityName = e.city === 'edmonton' ? 'Edmonton' : 'Calgary'
      return {
        id: e.id,
        title: e.title,
        excerpt: e.shortDescription || '',
        description: e.description || '',
        category: e.categoryName || 'Community',
        location: e.venueName ? `${e.venueName}, ${cityName}` : cityName,
        date: e.startDate,
        displayDate: e.startFormatted,
        imageUrl: '',
        author: `City of ${cityName}`,
        websiteUrl: e.url,
        external: true,
      }
    })
  } catch (error) {
    console.warn('⚠️ Open-data events failed to load (non-fatal):', error)
    return []
  }
}

export default async function EventsPage() {
  const [curated, municipal] = await Promise.all([getEvents(), getMunicipalEvents()])

  // Hide events that have already happened (keep today's)
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 1)
  const events = [...curated, ...municipal].filter(e => {
    const d = new Date(e.date || 0)
    return isNaN(d.getTime()) || d >= cutoff
  })

  // Sort by date (soonest first)
  events.sort((a, b) => {
    const dateA = new Date(a.date || 0).getTime()
    const dateB = new Date(b.date || 0).getTime()
    return dateA - dateB
  })

  // schema.org Event ItemList — eligibility for Google/Bing event rich results
  const structuredEvents: StructuredEvent[] = events.slice(0, 50).map(e => {
    const author = (e as any).author || ''
    const loc = (e.location || '').toLowerCase()
    const city = author.startsWith('City of ')
      ? author.slice('City of '.length)
      : loc.includes('edmonton') ? 'Edmonton' : loc.includes('calgary') ? 'Calgary' : 'Alberta'
    return {
      name: e.title,
      startDate: e.date,
      venueName: e.location,
      city,
      url: (e as any).websiteUrl || undefined,
      description: e.excerpt || undefined,
      category: e.category,
    }
  })

  const calendarEvents: CalendarEvent[] = events.map(e => ({
    id: e.id,
    name: e.title,
    start: (e.date || '').slice(0, 10),
    end: undefined,
    timeLabel: (e as any).displayDate,
    venue: e.location,
    category: e.category,
    url: (e as any).websiteUrl || undefined,
  })).filter(e => e.start)

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        <EventsStructuredData
          events={structuredEvents}
          pageUrl="/events"
          listName="Upcoming events in Alberta — Calgary, Edmonton and beyond"
        />
        <section className="w-full py-16 md:py-24 lg:py-32 bg-muted/40">
          <div className="container mx-auto max-w-7xl px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl">Alberta Events Calendar</h1>
                <p className="max-w-[900px] text-muted-foreground md:text-xl mx-auto">
                  What&apos;s on in Calgary, Edmonton, and across Alberta — updated from official city event listings and our own picks.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="w-full py-16 md:py-24 lg:py-32">
          <div className="container mx-auto max-w-7xl px-4 md:px-6">
            {/* Server-rendered event count for SEO */}
            <div className="sr-only">
              <h2>Found {events.length} cultural events in Alberta</h2>
              <ul>
                {events.map(event => (
                  <li key={event.id}>
                    {event.title} - {event.location} - {event.date}
                  </li>
                ))}
              </ul>
            </div>

            {/* Month calendar — compact overview with per-day drill-down */}
            <div className="mb-12 flex justify-center">
              <EventsMonthCalendar events={calendarEvents} />
            </div>

            {/* Client-side interactive component */}
            <EventsClient events={events} />
          </div>
        </section>
      </main>
    </div>
  )
}
