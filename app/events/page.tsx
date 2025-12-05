import { Metadata } from "next"
import { loadOptimizedFallback } from '@/lib/optimized-fallback'
import EventsClient from "./events-client"

export const metadata: Metadata = {
  title: 'Cultural Events in Alberta | Festivals, Performances & More',
  description: 'Discover cultural events, festivals, and performances happening across Alberta. Find events in Calgary, Edmonton, and beyond.',
  openGraph: {
    title: 'Cultural Events in Alberta | Culture Alberta',
    description: 'Discover cultural events, festivals, and performances happening across Alberta.',
    type: 'website',
  },
}

// Force dynamic rendering to always get fresh events
export const dynamic = 'force-dynamic'
export const revalidate = 3600 // Revalidate every hour

async function getEvents() {
  try {
    console.log('🔧 SSR: Loading events from optimized fallback...')

    const fallbackArticles = await loadOptimizedFallback()
    console.log(`✅ SSR: Loaded ${fallbackArticles.length} articles from optimized fallback`)

    // Filter for events only
    const events = fallbackArticles.filter(article => article.type === 'event')
    console.log(`✅ SSR: Found ${events.length} events in fallback data`)

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
    }))
  } catch (error) {
    console.error('❌ SSR: Failed to load events:', error)
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

export default async function EventsPage() {
  const events = await getEvents()

  // Sort by date (closest first)
  events.sort((a, b) => {
    const dateA = new Date(a.date || 0).getTime()
    const dateB = new Date(b.date || 0).getTime()
    return dateA - dateB
  })

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        <section className="w-full py-16 md:py-24 lg:py-32 bg-muted/40">
          <div className="container mx-auto max-w-7xl px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl">Cultural Events</h1>
                <p className="max-w-[900px] text-muted-foreground md:text-xl mx-auto">
                  Discover cultural events, festivals, and performances happening across Alberta.
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

            {/* Client-side interactive component */}
            <EventsClient events={events} />
          </div>
        </section>
      </main>
    </div>
  )
}
