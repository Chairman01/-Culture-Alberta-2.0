import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, CalendarDays } from 'lucide-react'
import { EventsStructuredData, type StructuredEvent } from '@/components/seo/structured-data'
import { EventCard } from '@/components/events/event-card'
import { buildSeoTitle } from '@/lib/seo/title'
import { getDirectoryEvents } from '@/lib/events-directory/directory'
import { overlaps, todayInAlberta, weekendWindow, type DirectoryEvent } from '@/lib/events-directory/types'
import { getWeekendGuides, WEEKEND_CITIES, type WeekendCity } from '@/lib/weekend-guides'
import EventsBrowser from './events-browser'

/**
 * /events — the Alberta events calendar.
 *
 * Leads with what is on this weekend (the two weekend guides plus the weekend's
 * events), then the full browsable directory. Everything on the page is in the
 * server HTML: the cards, the guide links and the Event ItemList JSON-LD, so
 * search engines see the same listing readers do.
 */

const BASE_URL = 'https://www.culturealberta.com'
const PAGE_TITLE = "Events in Calgary & Edmonton: What's On This Weekend"
const DESCRIPTION =
  'Things to do in Calgary and Edmonton this weekend and beyond: festivals, markets, family events, sports, theatre and free things to do, with photos, dates, venues and links. Updated daily from official city listings and Culture Alberta picks.'

export const metadata: Metadata = {
  title: buildSeoTitle(PAGE_TITLE),
  description: DESCRIPTION,
  alternates: { canonical: `${BASE_URL}/events` },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-snippet': -1, 'max-image-preview': 'large' },
  },
  openGraph: {
    title: PAGE_TITLE,
    description: DESCRIPTION,
    url: `${BASE_URL}/events`,
    type: 'website',
    siteName: 'Culture Alberta',
    images: [{ url: `${BASE_URL}/images/culture-alberta-og.jpg`, width: 1200, height: 630, alt: 'Culture Alberta events' }],
  },
  twitter: { card: 'summary_large_image', title: PAGE_TITLE, description: DESCRIPTION },
}

export const revalidate = 3600

// Weekend spotlight: enough to fill two rows without crowding out the guides.
const SPOTLIGHT_COUNT = 8
// Structured data: Google reads the list, not the page; keep it to the near term.
const STRUCTURED_COUNT = 60

async function weekendGuideCards() {
  const cities: WeekendCity[] = ['edmonton', 'calgary']
  return Promise.all(
    cities.map(async city => {
      try {
        const { latest } = await getWeekendGuides(city)
        return { city, ...WEEKEND_CITIES[city], guide: latest }
      } catch {
        return { city, ...WEEKEND_CITIES[city], guide: null }
      }
    })
  )
}

function toStructured(e: DirectoryEvent): StructuredEvent {
  return {
    name: e.name,
    startDate: e.start,
    endDate: e.end !== e.start ? e.end : undefined,
    venueName: e.venue,
    city: e.city,
    url: e.url,
    category: e.category,
    description: e.description,
    image: e.image,
    price: e.isFree ? 0 : e.price,
    currency: e.currency,
    organizerName: e.organizerName,
    organizerUrl: e.organizerUrl,
  }
}

const SPOTLIGHT_CATEGORY_WEIGHT: Partial<Record<DirectoryEvent['category'], number>> = {
  Recreation: 0,
  Community: 1,
}

// Recurring drop-in programming is real, but it is not what "this weekend"
// means to a reader; keep it off the spotlight unless nothing else is on.
const ROUTINE_TITLE = /(workout|fitness|training|drop-in|class|lesson|clinic)/i

function spotlightScore(e: DirectoryEvent): number {
  const categoryWeight = ROUTINE_TITLE.test(e.name) ? 0 : (SPOTLIGHT_CATEGORY_WEIGHT[e.category] ?? 2)
  return (e.manual ? 4 : 0) + (e.image ? 2 : 0) + categoryWeight
}

function pickSpotlight(events: DirectoryEvent[], count: number): DirectoryEvent[] {
  const seen = new Set<string>()
  const picked: DirectoryEvent[] = []
  for (const e of [...events].sort((a, b) => spotlightScore(b) - spotlightScore(a) || a.start.localeCompare(b.start))) {
    const series = e.name.split(/[:|–-]/)[0].trim().toLowerCase()
    if (seen.has(series)) continue
    seen.add(series)
    picked.push(e)
    if (picked.length === count) break
  }
  return picked
}

export default async function EventsPage() {
  const [events, guides] = await Promise.all([getDirectoryEvents(), weekendGuideCards()])
  const today = todayInAlberta()
  const weekend = weekendWindow()

  const upcoming = events.filter(e => e.end >= today)
  const thisWeekend = upcoming.filter(e => overlaps(e, weekend.start, weekend.end))
  // The spotlight is the one row most readers ever see: our own picks and
  // photographed festivals, family days and games first, drop-in fitness last,
  // and one card per series ("Free summer workouts: Qigong / Kickboxing / …").
  const spotlight = pickSpotlight(thisWeekend, SPOTLIGHT_COUNT)

  const edmontonCount = upcoming.filter(e => e.city === 'Edmonton').length
  const calgaryCount = upcoming.filter(e => e.city === 'Calgary').length

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        <EventsStructuredData
          events={upcoming.slice(0, STRUCTURED_COUNT).map(toStructured)}
          pageUrl="/events"
          listName="Upcoming events in Calgary and Edmonton, Alberta"
        />

        {/* Hero */}
        <section className="w-full bg-gray-950 text-white">
          <div className="container mx-auto max-w-7xl px-4 py-12 md:px-6 md:py-16">
            <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-red-300">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
              Updated daily
            </p>
            <h1 className="font-display text-3xl font-bold tracking-tight sm:text-5xl">
              Events in Calgary &amp; Edmonton
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-gray-300">
              {upcoming.length} things to do across Alberta&apos;s two big cities: {edmontonCount} in Edmonton, {calgaryCount} in
              Calgary. Festivals, markets, family days out, sports and theatre, with the free ones marked.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {guides.map(g => (
                <Link
                  key={g.city}
                  href={g.path}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-gray-900 transition hover:bg-red-50"
                >
                  Things to do in {g.label} this weekend
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* This weekend */}
        <section className="w-full border-b border-gray-200 bg-white" aria-labelledby="weekend-heading">
          <div className="container mx-auto max-w-7xl px-4 py-10 md:px-6 md:py-12">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 id="weekend-heading" className="font-display text-2xl font-bold text-gray-900 md:text-3xl">
                  This weekend, {weekend.label}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  {thisWeekend.length} event{thisWeekend.length === 1 ? '' : 's'} on Friday to Sunday. Our editors&apos; full
                  weekend guides are below.
                </p>
              </div>
            </div>

            {/* Weekend guides */}
            <div className="mb-8 grid gap-4 md:grid-cols-2">
              {guides.map(g => (
                <Link
                  key={g.city}
                  href={g.path}
                  className="group relative flex min-h-[11rem] items-end overflow-hidden rounded-2xl bg-gray-900 p-5 text-white shadow-sm"
                >
                  {g.guide?.imageUrl && (
                    <img
                      src={g.guide.imageUrl}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="absolute inset-0 h-full w-full object-cover opacity-70 transition duration-300 group-hover:scale-[1.03] group-hover:opacity-80"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-950/90 via-gray-950/30 to-transparent" />
                  <div className="relative">
                    <p className="text-xs font-semibold uppercase tracking-wider text-red-300">Weekend guide</p>
                    <h3 className="font-display mt-1 text-xl font-bold leading-snug md:text-2xl">
                      {g.guide?.title || `Things to Do in ${g.label} This Weekend`}
                    </h3>
                    <p className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-white/90">
                      Read the guide <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </p>
                  </div>
                </Link>
              ))}
            </div>

            {spotlight.length > 0 && (
              <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {spotlight.map((event, i) => (
                  <li key={`spot-${event.id}`}>
                    <EventCard event={event} eager={i < 4} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Full directory */}
        <section className="w-full bg-gray-50" aria-labelledby="all-events-heading">
          <div className="container mx-auto max-w-7xl px-4 py-10 md:px-6 md:py-14">
            <h2 id="all-events-heading" className="font-display mb-6 text-2xl font-bold text-gray-900 md:text-3xl">
              All upcoming events
            </h2>
            <EventsBrowser events={events} weekend={weekend} />
          </div>
        </section>

        {/* About / internal links */}
        <section className="w-full bg-white">
          <div className="container mx-auto max-w-3xl px-4 py-12 md:px-6">
            <h2 className="font-display text-xl font-bold text-gray-900">About this calendar</h2>
            <div className="mt-3 space-y-3 text-gray-700 [&_a]:font-medium [&_a]:text-red-600 [&_a]:underline">
              <p>
                Culture Alberta&apos;s events calendar combines the City of Edmonton and City of Calgary public event
                listings with events our editors add themselves. Concerts, bars and casino events are left out on
                purpose; what remains is festivals, markets, sports, theatre, museums and family days out. Dates and
                venues can change without notice, so check the organizer&apos;s page before you go.
              </p>
              <p>
                Planning the weekend? Read the current guides for{' '}
                <Link href={WEEKEND_CITIES.edmonton.path}>things to do in Edmonton this weekend</Link> and{' '}
                <Link href={WEEKEND_CITIES.calgary.path}>things to do in Calgary this weekend</Link>, or browse the{' '}
                <Link href="/edmonton">Edmonton</Link> and <Link href="/calgary">Calgary</Link> city pages. Running an
                event? Email <a href="mailto:hello@culturealberta.com">hello@culturealberta.com</a> and we will take a look.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
