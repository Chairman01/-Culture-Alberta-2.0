/**
 * Server-only: the merged event directory behind /events and the city hubs.
 *
 * Sources, in priority order:
 *   1. Our own `events` table (curated in the admin) — always pinned first.
 *   2. Calgary and Edmonton municipal open data (values-filtered at source).
 *
 * Every event gets a normalised category (the feeds use a dozen spellings),
 * a photo where one can be found (curated image, else the organizer page's
 * og:image from ./link-previews) and the date fields the page needs to say
 * what is on this weekend. Types and date helpers live in ./types so client
 * components can share them without dragging this module into the browser.
 */

import { unstable_cache } from 'next/cache'
import { fetchUpcomingOpenDataEvents } from '@/lib/automation/open-data'
import { getLinkPreviews, isPreviewableUrl, refreshLinkPreviews, type LinkPreview } from './link-previews'
import { ALBERTA_TZ, dateRangeLabel, todayInAlberta, type DirectoryEvent, type EventCategory, type EventCity } from './types'

export * from './types'

const DIRECTORY_DAYS_AHEAD = 90
const RECENT_PAST_MANUAL = 3
// How many organizer pages a page render may fetch when the cron has not got
// to them yet. Small on purpose: this runs inside ISR regeneration.
const RENDER_TOPUP_LIMIT = 6
const RENDER_TOPUP_BUDGET_MS = 4_000

// ---------------------------------------------------------------------------
// Category normalisation
// ---------------------------------------------------------------------------

const CATEGORY_RULES: Array<{ category: EventCategory; test: RegExp }> = [
  { category: 'Market', test: /\b(market|makers?|craft (fair|sale)|bazaar|swap|rummage|garage sale|book sale)\b/i },
  { category: 'Food', test: /\b(food truck|food fest|feast|taste of|brunch|bbq|barbecue|pancake|culinary|night market)\b/i },
  { category: 'Sports', test: /\b(vs\.?|versus|game|match|hockey|football|soccer|basketball|baseball|lacrosse|rugby|cfl|nhl|whl|cpl|elks|stampeders|oilers|flames|hitmen|oil kings|cavalry|wild fc|tournament|marathon|half marathon|\d+ ?k run|fun run|race|triathlon|cyclocross|sport)\b/i },
  { category: 'Heritage', test: /\b(heritage|historic|history|museum|doors open|culture days|archive|legislature|indigenous|treaty|powwow|pow wow|remembrance)\b/i },
  { category: 'Arts & Theatre', test: /\b(theatre|theater|ballet|opera|symphony|orchestra|play|musical|comedy|improv|film|cinema|screening|gallery|exhibit|art walk|studio|dance|drag|magic|circus|choir|recital|concert|book launch|author|poetry)\b/i },
  { category: 'Family', test: /\b(family|kids?|children|toddler|teen|youth|pumpkin|halloween|haunted|spooky|easter|santa|christmas|holiday|lantern|light festival|zoo|science|lego|story ?time|drop-in|craft)\b/i },
  { category: 'Festival', test: /\b(festival|fest|carnival|fair|parade|celebration|days?\b|expo|show\b|jamboree|fiesta|mela)\b/i },
  { category: 'Outdoors', test: /\b(park|trail|hike|walk|bike|cycling|garden|river|nature|outdoor|camp|ski|skate|snow|winter|bird|farm|orchard|u-pick|corn maze)\b/i },
  { category: 'Recreation', test: /\b(fitness|yoga|swim|workout|class|lesson|clinic|program|registration|leisure|recreation|open gym|pickleball|climbing)\b/i },
]

/**
 * One label per event, from the feed's own type first and the title second.
 * The feeds disagree with each other ("Festivals" / "Festival & Events" /
 * "Recreation and leisure"), so the filter would otherwise show near-duplicates.
 */
export function normalizeCategory(rawCategory: string | undefined, title: string, description?: string): EventCategory {
  const raw = (rawCategory || '').toLowerCase()
  if (/festival/.test(raw)) return 'Festival'
  if (/sport|athletic/.test(raw)) return 'Sports'
  if (/market/.test(raw)) return 'Market'
  if (/food|culinary/.test(raw)) return 'Food'
  if (/heritage|histor|museum/.test(raw)) return 'Heritage'
  if (/art|theat|music|perform|film|cultur/.test(raw)) return 'Arts & Theatre'
  if (/family|kid|child|youth/.test(raw)) return 'Family'
  if (/outdoor|park|nature|environment/.test(raw)) return 'Outdoors'

  const text = `${title} ${description || ''}`
  for (const rule of CATEGORY_RULES) {
    if (rule.test.test(text)) return rule.category
  }
  if (/recreation|leisure|fitness|program/.test(raw)) return 'Recreation'
  return 'Community'
}

// ---------------------------------------------------------------------------
// Source mapping
// ---------------------------------------------------------------------------

/** Pull "7:00 PM" / "6:30 - 7:30 p.m." out of the feeds' prose labels. */
function extractTimeLabel(formatted: string | undefined): string | undefined {
  if (!formatted) return undefined
  const clean = formatted.replace(/\s*\(runs until[^)]*\)\s*$/i, '')
  const m = clean.match(/(\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?)[^,]*)$/i)
  if (m) return m[1].replace(/^(from|at)\s+/i, '').trim()
  const tail = clean.match(/(?:\bfrom\b|\bat\b)\s+(.+)$/i)
  return tail ? tail[1].trim() : undefined
}

function isFreeText(...parts: Array<string | undefined>): boolean {
  return /\bfree\b/i.test(parts.filter(Boolean).join(' '))
}

async function loadOpenDataEvents(): Promise<DirectoryEvent[]> {
  try {
    const rows = await fetchUpcomingOpenDataEvents(DIRECTORY_DAYS_AHEAD)
    return rows.map((e): DirectoryEvent => {
      const start = e.startDate.slice(0, 10)
      const end = (e.endDate || e.startDate).slice(0, 10)
      const description = e.shortDescription || undefined
      const url = e.url || undefined
      return {
        id: e.id,
        name: e.title,
        start,
        end: end < start ? start : end,
        timeLabel: extractTimeLabel(e.startFormatted),
        dateLabel: dateRangeLabel(start, end),
        venue: e.venueName || undefined,
        city: e.city === 'calgary' ? 'Calgary' : 'Edmonton',
        category: normalizeCategory(e.categoryName, e.title, description),
        url,
        external: !!url,
        manual: false,
        description,
        image: e.imageUrl || undefined,
        isFree: e.isFree || isFreeText(e.title, e.price, description),
      }
    })
  } catch (error) {
    console.warn('[events-directory] open data failed:', error)
    return []
  }
}

async function loadCuratedEvents(): Promise<DirectoryEvent[]> {
  try {
    const { getAllEvents } = await import('@/lib/events')
    const curated = await getAllEvents()
    const today = todayInAlberta()
    const mapped: DirectoryEvent[] = []

    for (const e of curated) {
      const row = e as any
      const startIso: string | undefined = row.event_date
      const loc = (e.location || '').toLowerCase()
      const city: EventCity | null = loc.includes('calgary') ? 'Calgary' : loc.includes('edmonton') ? 'Edmonton' : null
      if (!startIso || !city) continue

      const startDate = new Date(startIso)
      const start = startDate.toLocaleDateString('en-CA', { timeZone: ALBERTA_TZ })
      const end = row.event_end_date
        ? new Date(row.event_end_date).toLocaleDateString('en-CA', { timeZone: ALBERTA_TZ })
        : start
      // A timestamp exactly at midnight is a date-only entry, not a midnight event.
      const hasTime = startDate.toLocaleTimeString('en-CA', { timeZone: ALBERTA_TZ, hour12: false }) !== '00:00:00'
      const timeLabel = hasTime
        ? startDate.toLocaleTimeString('en-CA', { timeZone: ALBERTA_TZ, hour: 'numeric', minute: '2-digit' })
        : undefined
      const slug: string | undefined = row.slug
      const price = typeof row.price === 'number' ? row.price : undefined
      const description = e.excerpt || e.description || undefined

      mapped.push({
        id: e.id,
        name: e.title,
        start,
        end: end < start ? start : end,
        timeLabel,
        dateLabel: dateRangeLabel(start, end),
        venue: row.venue || undefined,
        city,
        category: normalizeCategory(e.category, e.title, description),
        url: slug ? `/events/${slug}` : row.website_url || undefined,
        external: !slug && !!row.website_url,
        manual: true,
        description,
        image: row.image_url || undefined,
        price,
        currency: row.currency || undefined,
        isFree: price === 0 || isFreeText(e.title, description),
        organizerName: row.organizer || undefined,
        organizerUrl: row.website_url || undefined,
      })
    }

    // All upcoming, plus the last few that already happened: the page is the
    // record of what Culture Alberta put on, not just a listing.
    const upcoming = mapped.filter(e => e.end >= today)
    const recentPast = mapped
      .filter(e => e.end < today)
      .sort((a, b) => b.start.localeCompare(a.start))
      .slice(0, RECENT_PAST_MANUAL)
    return [...upcoming, ...recentPast]
  } catch (error) {
    console.warn('[events-directory] curated events failed (non-fatal):', error)
    return []
  }
}

// ---------------------------------------------------------------------------
// Images
// ---------------------------------------------------------------------------

function previewUrls(events: DirectoryEvent[]): string[] {
  return events
    .filter(e => !e.image && e.external && isPreviewableUrl(e.url))
    .map(e => e.url as string)
}

/**
 * Attach organizer-page images. Reads the cache; when the service key is
 * present (production), also fetches a few missing ones so a brand-new event
 * is not blank until the nightly cron.
 */
async function attachImages(events: DirectoryEvent[]): Promise<DirectoryEvent[]> {
  const urls = previewUrls(events)
  if (urls.length === 0) return events

  let previews: Map<string, LinkPreview>
  try {
    previews = await getLinkPreviews(urls)
  } catch (error) {
    console.warn('[events-directory] previews unavailable:', error)
    return events
  }

  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const { previews: fresh } = await refreshLinkPreviews(urls, {
        limit: RENDER_TOPUP_LIMIT,
        budgetMs: RENDER_TOPUP_BUDGET_MS,
        known: previews,
      })
      fresh.forEach((p, url) => previews.set(url, p))
    } catch (error) {
      console.warn('[events-directory] preview top-up failed:', error)
    }
  }

  return events.map(e => {
    if (e.image || !e.url) return e
    const preview = previews.get(e.url)
    return preview?.imageUrl ? { ...e, image: preview.imageUrl } : e
  })
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

// Our own upcoming events lead, then everything else by date, then the few
// recently held Culture Alberta events at the very end so a listing never
// opens on something that has already happened.
function rank(e: DirectoryEvent, today: string): number {
  if (e.manual && e.end >= today) return 0
  if (e.end >= today) return 1
  return 2
}

/** Every event, uncached: curated first, then open data, both by date. */
export async function loadDirectoryEvents(): Promise<DirectoryEvent[]> {
  const [curated, openData] = await Promise.all([loadCuratedEvents(), loadOpenDataEvents()])
  const today = todayInAlberta()
  const merged = await attachImages([...curated, ...openData])
  return merged.sort((a, b) => {
    const r = rank(a, today) - rank(b, today)
    if (r !== 0) return r
    // Past events newest first; everything else soonest first.
    return rank(a, today) === 2 ? b.start.localeCompare(a.start) : a.start.localeCompare(b.start)
  })
}

/** Organizer URLs the image cron should keep warm. */
export async function getDirectoryPreviewUrls(): Promise<string[]> {
  const [curated, openData] = await Promise.all([loadCuratedEvents(), loadOpenDataEvents()])
  return [...new Set(previewUrls([...curated, ...openData]))]
}

/**
 * The directory, cached for 30 minutes. The open-data fetches underneath are
 * themselves cached for an hour, so a regeneration costs one Supabase read
 * for previews plus at most a handful of organizer-page fetches.
 */
export const getDirectoryEvents = unstable_cache(loadDirectoryEvents, ['events-directory-v1'], {
  revalidate: 1800,
  tags: ['events-directory'],
})

/** Events for one city, soonest first, for the city hub pages. */
export async function getCityDirectoryEvents(city: EventCity, limit: number): Promise<DirectoryEvent[]> {
  const today = todayInAlberta()
  const all = await getDirectoryEvents()
  return all.filter(e => e.city === city && e.end >= today).slice(0, limit)
}
