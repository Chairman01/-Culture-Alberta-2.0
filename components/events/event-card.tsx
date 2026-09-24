import Link from 'next/link'
import { CalendarDays, Clock, MapPin, Ticket } from 'lucide-react'
import type { DirectoryEvent, EventCategory } from '@/lib/events-directory/types'
import { shortDayLabel } from '@/lib/events-directory/types'

/**
 * One event, as a photo card. Shared by the /events browser (client) and the
 * city hub sections (server), so it has no hooks and no data fetching.
 *
 * External photos are plain <img>, not next/image: the directory carries a few
 * hundred one-off organizer images, and pushing each through Vercel's image
 * optimizer would be paid transformations for pictures shown a handful of
 * times. Lazy loading and fixed aspect boxes keep the layout stable instead.
 */

const CATEGORY_STYLES: Record<EventCategory, { pill: string; panel: string }> = {
  Festival: { pill: 'bg-rose-600 text-white', panel: 'from-rose-500 to-orange-400' },
  Family: { pill: 'bg-sky-600 text-white', panel: 'from-sky-500 to-cyan-400' },
  Sports: { pill: 'bg-emerald-700 text-white', panel: 'from-emerald-600 to-lime-500' },
  'Arts & Theatre': { pill: 'bg-purple-700 text-white', panel: 'from-purple-600 to-fuchsia-500' },
  Market: { pill: 'bg-amber-600 text-white', panel: 'from-amber-500 to-yellow-400' },
  Food: { pill: 'bg-orange-600 text-white', panel: 'from-orange-500 to-red-400' },
  Heritage: { pill: 'bg-stone-700 text-white', panel: 'from-stone-600 to-amber-700' },
  Outdoors: { pill: 'bg-green-700 text-white', panel: 'from-green-600 to-teal-500' },
  Recreation: { pill: 'bg-teal-700 text-white', panel: 'from-teal-600 to-sky-500' },
  Community: { pill: 'bg-indigo-700 text-white', panel: 'from-indigo-600 to-blue-500' },
}

export function categoryPillClass(category: EventCategory): string {
  return CATEGORY_STYLES[category]?.pill || CATEGORY_STYLES.Community.pill
}

function mapsUrl(venue: string, city: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${venue}, ${city}, Alberta`)}`
}

function priceLabel(event: DirectoryEvent): string | null {
  if (event.isFree) return 'Free'
  if (typeof event.price === 'number' && event.price > 0) {
    return `${event.currency === 'CAD' || !event.currency ? '$' : `${event.currency} `}${event.price.toFixed(event.price % 1 ? 2 : 0)}`
  }
  return null
}

export interface EventCardProps {
  event: DirectoryEvent
  /** Marks a past curated event on the listing */
  past?: boolean
  /** Sizes the title for the featured row */
  featured?: boolean
  /** First cards above the fold load eagerly */
  eager?: boolean
}

export function EventCard({ event, past = false, featured = false, eager = false }: EventCardProps) {
  const day = shortDayLabel(event.start)
  const multiDay = event.end !== event.start
  const price = priceLabel(event)
  const styles = CATEGORY_STYLES[event.category] || CATEGORY_STYLES.Community

  const title = event.url ? (
    event.external ? (
      <a href={event.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
        {event.name}
      </a>
    ) : (
      <Link href={event.url} className="hover:underline">
        {event.name}
      </Link>
    )
  ) : (
    <span>{event.name}</span>
  )

  return (
    <article
      className={`group flex h-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${past ? 'opacity-80' : ''}`}
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-gray-100">
        {event.image ? (
          <img
            src={event.image}
            alt=""
            loading={eager ? 'eager' : 'lazy'}
            decoding="async"
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className={`flex h-full w-full items-end bg-gradient-to-br ${styles.panel} p-4`} aria-hidden="true">
            <span className="text-sm font-semibold uppercase tracking-wide text-white/90">{event.city}</span>
          </div>
        )}

        {/* Date badge */}
        <div className="absolute left-3 top-3 flex min-w-[3.25rem] flex-col items-center rounded-lg bg-white/95 px-2 py-1 text-center shadow">
          <span className="text-[10px] font-bold uppercase tracking-wider text-red-600">{day.month}</span>
          <span className="text-xl font-extrabold leading-none text-gray-900">{day.day}</span>
          <span className="text-[10px] font-medium text-gray-500">{multiDay ? 'onward' : day.weekday}</span>
        </div>

        <div className="absolute right-3 top-3 flex flex-col items-end gap-1.5">
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold shadow ${styles.pill}`}>{event.category}</span>
          {price && (
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold shadow ${event.isFree ? 'bg-green-600 text-white' : 'bg-white/95 text-gray-900'}`}>
              {price}
            </span>
          )}
        </div>

        {event.manual && (
          <span className="absolute bottom-3 left-3 rounded-full bg-gray-900/90 px-2.5 py-1 text-[11px] font-semibold text-white">
            Culture Alberta pick
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className={`font-display font-bold leading-snug text-gray-900 ${featured ? 'text-xl' : 'text-base'} line-clamp-2`}>
          {title}
        </h3>

        <dl className="mt-3 space-y-1.5 text-sm text-gray-700">
          <div className="flex items-start gap-2">
            <CalendarDays className="mt-0.5 h-4 w-4 flex-none text-gray-400" aria-hidden="true" />
            <dd>{event.dateLabel}</dd>
          </div>
          {event.timeLabel && (
            <div className="flex items-start gap-2">
              <Clock className="mt-0.5 h-4 w-4 flex-none text-gray-400" aria-hidden="true" />
              <dd>{event.timeLabel}</dd>
            </div>
          )}
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-4 w-4 flex-none text-gray-400" aria-hidden="true" />
            <dd className="line-clamp-1">
              {event.venue ? (
                <>
                  <a
                    href={mapsUrl(event.venue, event.city)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    {event.venue}
                  </a>
                  <span className="text-gray-400"> · {event.city}</span>
                </>
              ) : (
                event.city
              )}
            </dd>
          </div>
        </dl>

        {event.description && (
          <p className="mt-3 line-clamp-2 text-sm text-gray-600">{event.description}</p>
        )}

        <div className="mt-auto flex items-center justify-between pt-4">
          {event.url ? (
            event.external ? (
              <a
                href={event.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-red-600 hover:text-red-700"
              >
                <Ticket className="h-4 w-4" aria-hidden="true" />
                Details &amp; tickets
              </a>
            ) : (
              <Link href={event.url} className="inline-flex items-center gap-1.5 text-sm font-semibold text-red-600 hover:text-red-700">
                <Ticket className="h-4 w-4" aria-hidden="true" />
                Event details
              </Link>
            )
          ) : (
            <span />
          )}
          {past && <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500">Recently held</span>}
        </div>
      </div>
    </article>
  )
}
