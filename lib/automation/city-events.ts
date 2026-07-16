/**
 * Keyless event fetchers for Alberta's smaller cities.
 *
 * Calgary and Edmonton are handled by lib/automation/open-data.ts (Socrata).
 * The cities below have no open-data events feed, so each one reads from the
 * best free, machine-readable calendar its tourism/municipal site exposes:
 *
 *   Red Deer      visitreddeer.com    The Events Calendar REST API (Tribe)
 *   Medicine Hat  stayinmedicinehat.com  The Events Calendar REST API (Tribe)
 *   Fort McMurray maccalendar.ca      Modern Events Calendar (WP REST)
 *   Lethbridge    visitlethbridge.com Modern Events Calendar (JSON-LD via ajax)
 *   Grande Prairie cityofgp.com       Drupal FullCalendar (embedded settings JSON)
 *
 * None require an API key. Every adapter is fail-soft: any network/parse error
 * returns [] so the article pipeline can still run on whatever it does get.
 * Events are mapped to the shared EventbriteEvent shape and run through the
 * editorial values filter here, exactly like the Socrata sources.
 *
 * This module also exposes fetchWeekendCityEvents(), the single entry point the
 * weekend-events orchestrator uses for ALL seven cities (it delegates Calgary
 * and Edmonton to open-data.ts and the rest to the adapters below).
 */

import type { EventbriteEvent } from './eventbrite'
import { filterEvents } from './content-filter'
import { fetchOpenDataEvents } from './open-data'

const FETCH_TIMEOUT_MS = 12_000
const UA = 'CultureAlberta/1.0 (hello@culturealberta.com)'

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** ISO calendar date (YYYY-MM-DD) for a Date, in the server's reference frame. */
function isoDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** Pull the YYYY-MM-DD out of any date/datetime string, ignoring time and tz. */
function ymd(raw?: string): string {
  const m = String(raw || '').match(/(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[1]}-${m[2]}-${m[3]}` : ''
}

/** Pull an "H:MM AM/PM" label out of a datetime string, or '' if date-only. */
function timeLabel(raw?: string): string {
  const m = String(raw || '').match(/[T ](\d{1,2}):(\d{2})/)
  if (!m) return ''
  let h = parseInt(m[1], 10)
  // Some calendars encode markets/all-day events with a placeholder pre-dawn
  // time (e.g. a farmers' market at "2:00 AM"). No real public event starts
  // before 5 AM, so treat those as all-day rather than print a wrong time.
  if (h < 5) return ''
  const suffix = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${h}:${m[2]} ${suffix}`
}

/** "2026-07-17" → "Friday, July 17" (formatted in UTC so the date never shifts). */
function dayLabel(iso: string): string {
  if (!iso) return ''
  try {
    return new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-CA', {
      timeZone: 'UTC',
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return iso
  }
}

/** Human "When" line from an event's start/end date strings. */
function whenLabel(startRaw: string, endRaw: string): string {
  const s = ymd(startRaw)
  const e = ymd(endRaw) || s
  const t = timeLabel(startRaw)
  if (e && e !== s) return `${dayLabel(s)} to ${dayLabel(e)}`
  return t ? `${dayLabel(s)} at ${t}` : dayLabel(s)
}

/** Does an event's [start,end] calendar range intersect the [winStart,winEnd] window? */
function overlapsWindow(startRaw: string, endRaw: string, winStart: string, winEnd: string): boolean {
  const s = ymd(startRaw)
  if (!s) return false
  const e = ymd(endRaw) || s
  // ISO date strings compare correctly as plain strings.
  return s <= winEnd && e >= winStart
}

/** Decode the HTML entities that show up in WordPress/JSON-LD titles. */
function decodeEntities(s = ''): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => safeCodePoint(parseInt(n, 16)))
    .replace(/&#(\d+);/g, (_, n) => safeCodePoint(parseInt(n, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .trim()
}

function safeCodePoint(n: number): string {
  try {
    return String.fromCodePoint(n)
  } catch {
    return ''
  }
}

/** Strip HTML tags and decode entities, collapsing whitespace. */
function stripHtml(s = ''): string {
  return decodeEntities(s.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim()
}

async function fetchJson(url: string, init?: RequestInit): Promise<Response> {
  return fetch(url, {
    ...init,
    headers: { 'User-Agent': UA, Accept: 'application/json, text/html;q=0.9, */*;q=0.8', ...(init?.headers || {}) },
    next: { revalidate: 0 },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  })
}

// ---------------------------------------------------------------------------
// The Events Calendar (Tribe) — Red Deer, Medicine Hat
// ---------------------------------------------------------------------------

interface TribeVenue {
  venue?: string
  address?: string
  city?: string
}
interface TribeEvent {
  id: number
  title?: string
  description?: string
  excerpt?: string
  url?: string
  start_date?: string   // "2026-07-17 07:00:00" (site-local)
  end_date?: string
  all_day?: boolean
  cost?: string
  venue?: TribeVenue | unknown[]   // object when set, [] when empty
  categories?: Array<{ name?: string }>
}

async function fetchTribeEvents(
  host: string,
  citySlug: string,
  winStart: string,
  winEnd: string
): Promise<EventbriteEvent[]> {
  const url =
    `https://${host}/wp-json/tribe/events/v1/events` +
    `?per_page=50&start_date=${winStart} 00:00:00&end_date=${winEnd} 23:59:59`

  try {
    const res = await fetchJson(url)
    if (!res.ok) {
      console.warn(`[city-events] ${citySlug} (Tribe): HTTP ${res.status} — skipping`)
      return []
    }
    const data = await res.json()
    const rows: TribeEvent[] = Array.isArray(data?.events) ? data.events : []
    console.log(`[city-events] ${citySlug} (Tribe): ${rows.length} events from ${host}`)

    return rows
      .filter(r => r.title && r.start_date && overlapsWindow(r.start_date, r.end_date || '', winStart, winEnd))
      .map((r, i): EventbriteEvent => {
        const venue = Array.isArray(r.venue) ? null : (r.venue as TribeVenue | undefined)
        const venueName = venue?.venue || ''
        const desc = stripHtml(r.excerpt || r.description || '')
        return {
          id: `${citySlug}-tribe-${r.id}`,
          title: decodeEntities(r.title || '').trim() || 'Untitled event',
          description: desc,
          shortDescription: desc.slice(0, 300),
          startDate: (r.start_date || '').replace(' ', 'T'),
          endDate: (r.end_date || r.start_date || '').replace(' ', 'T'),
          startFormatted: r.all_day ? dayLabel(ymd(r.start_date)) : whenLabel(r.start_date || '', r.end_date || ''),
          venueName,
          venueAddress: [venueName, venue?.city].filter(Boolean).join(', '),
          url: r.url || '',
          isFree: /free|no charge/i.test(r.cost || ''),
          price: (r.cost || '').trim() || 'See website',
          categoryName: r.categories?.[0]?.name || 'Community',
          imageUrl: null,
        }
      })
  } catch (err) {
    console.warn(`[city-events] ${citySlug} (Tribe) failed (${err instanceof Error ? err.message : err}) — skipping`)
    return []
  }
}

// ---------------------------------------------------------------------------
// Modern Events Calendar REST — Fort McMurray (maccalendar.ca)
// ---------------------------------------------------------------------------

interface MecRestEvent {
  title?: { rendered?: string }
  excerpt?: { rendered?: string }
  content?: { rendered?: string }
  link?: string
  event_date?: { start?: string; end?: string }   // date-only, "2026-08-25"
  event_location?: { name?: string } | null
}

async function fetchMecRestEvents(
  host: string,
  citySlug: string,
  winStart: string,
  winEnd: string
): Promise<EventbriteEvent[]> {
  // MEC can't order by the event date meta field, so page through recent posts
  // (newest first — upcoming events cluster near the top) and filter locally.
  const MAX_PAGES = 6
  const collected: EventbriteEvent[] = []

  try {
    for (let page = 1; page <= MAX_PAGES; page++) {
      const res = await fetchJson(`https://${host}/wp-json/wp/v2/mec-events?per_page=100&page=${page}`)
      if (!res.ok) {
        if (page === 1) console.warn(`[city-events] ${citySlug} (MEC): HTTP ${res.status} — skipping`)
        break
      }
      const rows: MecRestEvent[] = await res.json()
      if (!Array.isArray(rows) || rows.length === 0) break

      for (const r of rows) {
        const start = r.event_date?.start || ''
        const end = r.event_date?.end || start
        if (!start || !overlapsWindow(start, end, winStart, winEnd)) continue
        const title = stripHtml(r.title?.rendered || '')
        if (title.length < 3) continue
        const desc = stripHtml(r.excerpt?.rendered || r.content?.rendered || '')
        const venueName = r.event_location?.name || ''
        collected.push({
          id: `${citySlug}-mec-${collected.length}-${start}`,
          title,
          description: desc,
          shortDescription: desc.slice(0, 300),
          startDate: start,
          endDate: end,
          startFormatted: whenLabel(start, end),
          venueName,
          venueAddress: venueName,
          url: r.link || '',
          isFree: false,
          price: 'See website',
          categoryName: 'Community',
          imageUrl: null,
        })
      }

      const totalPages = parseInt(res.headers.get('x-wp-totalpages') || '1', 10)
      if (page >= totalPages) break
    }

    console.log(`[city-events] ${citySlug} (MEC): ${collected.length} events in window from ${host}`)
    return collected
  } catch (err) {
    console.warn(`[city-events] ${citySlug} (MEC) failed (${err instanceof Error ? err.message : err}) — skipping`)
    return collected
  }
}

// ---------------------------------------------------------------------------
// Modern Events Calendar JSON-LD (ajax) — Lethbridge (visitlethbridge.com)
// ---------------------------------------------------------------------------

interface JsonLdEvent {
  '@type'?: string
  name?: string
  description?: string
  startDate?: string
  endDate?: string
  url?: string
  location?: { name?: string; address?: unknown }
  offers?: { price?: string | number } | Array<{ price?: string | number }>
}

/** The months (year+month) a [start,end] window touches, as {y, m} pairs. */
function monthsInWindow(winStart: string, winEnd: string): Array<{ y: string; m: string }> {
  const out: Array<{ y: string; m: string }> = []
  const seen = new Set<string>()
  for (const iso of [winStart, winEnd]) {
    const [y, m] = iso.split('-')
    const key = `${y}-${m}`
    if (y && m && !seen.has(key)) {
      seen.add(key)
      out.push({ y, m })
    }
  }
  return out
}

async function fetchMecAjaxEvents(
  host: string,
  citySlug: string,
  winStart: string,
  winEnd: string
): Promise<EventbriteEvent[]> {
  const collected: EventbriteEvent[] = []

  try {
    for (const { y, m } of monthsInWindow(winStart, winEnd)) {
      const res = await fetchJson(`https://${host}/wp-admin/admin-ajax.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `action=mec_list_load_more&mec_year=${y}&mec_month=${m}`,
      })
      if (!res.ok) {
        console.warn(`[city-events] ${citySlug} (MEC-ajax): HTTP ${res.status} for ${y}-${m} — skipping`)
        continue
      }
      const text = await res.text()
      let html = text
      try { html = JSON.parse(text).html || text } catch { /* already html */ }

      const blocks = html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)
      for (const b of blocks) {
        let obj: JsonLdEvent
        try { obj = JSON.parse(b[1]) } catch { continue }
        if (obj['@type'] !== 'Event' || !obj.startDate) continue
        if (!overlapsWindow(obj.startDate, obj.endDate || '', winStart, winEnd)) continue

        const offer = Array.isArray(obj.offers) ? obj.offers[0] : obj.offers
        const priceRaw = offer?.price
        const price =
          priceRaw === undefined || priceRaw === '' ? 'See website'
          : Number(priceRaw) === 0 ? 'Free'
          : `$${priceRaw}`
        const venueName = obj.location?.name ? decodeEntities(obj.location.name) : ''
        const desc = stripHtml(obj.description || '')

        collected.push({
          id: `${citySlug}-ld-${collected.length}-${ymd(obj.startDate)}`,
          title: decodeEntities(obj.name || '').trim() || 'Untitled event',
          description: desc,
          shortDescription: desc.slice(0, 300),
          startDate: obj.startDate,
          endDate: obj.endDate || obj.startDate,
          startFormatted: whenLabel(obj.startDate, obj.endDate || ''),
          venueName,
          venueAddress: venueName,
          url: obj.url || '',
          isFree: price === 'Free',
          price,
          categoryName: 'Community',
          imageUrl: null,
        })
      }
    }

    // The month feed can repeat a multi-day event once per day; keep one per URL/title.
    const seen = new Set<string>()
    const deduped = collected.filter(e => {
      const key = (e.url || e.title).toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    console.log(`[city-events] ${citySlug} (MEC-ajax): ${deduped.length} events in window from ${host}`)
    return deduped
  } catch (err) {
    console.warn(`[city-events] ${citySlug} (MEC-ajax) failed (${err instanceof Error ? err.message : err}) — skipping`)
    return collected
  }
}

// ---------------------------------------------------------------------------
// Drupal FullCalendar (embedded settings JSON) — Grande Prairie (cityofgp.com)
// ---------------------------------------------------------------------------

interface DrupalCalEvent {
  title?: string   // HTML blob: <h3>Name</h3><time>…</time><span>Category</span>
  start?: string   // "2026-08-01T12:00:00" (site-local, no tz)
  end?: string
  url?: string     // relative, e.g. "/heritageday"
}

async function fetchDrupalCalendarEvents(
  pageUrl: string,
  origin: string,
  citySlug: string,
  winStart: string,
  winEnd: string
): Promise<EventbriteEvent[]> {
  try {
    const res = await fetchJson(pageUrl, { headers: { Accept: 'text/html' } })
    if (!res.ok) {
      console.warn(`[city-events] ${citySlug} (Drupal): HTTP ${res.status} — skipping`)
      return []
    }
    const html = await res.text()
    const m = html.match(/<script type="application\/json" data-drupal-selector="drupal-settings-json">([\s\S]*?)<\/script>/)
    if (!m) {
      console.warn(`[city-events] ${citySlug} (Drupal): no settings JSON found — skipping`)
      return []
    }

    const settings = JSON.parse(m[1])
    const fcv = settings.fullCalendarView
    const view = Array.isArray(fcv) ? fcv[0] : fcv
    let opts = view?.calendar_options
    if (typeof opts === 'string') opts = JSON.parse(opts)
    const rows: DrupalCalEvent[] = Array.isArray(opts?.events) ? opts.events : []

    const seen = new Set<string>()
    const events: EventbriteEvent[] = []
    for (const r of rows) {
      if (!r.start || !overlapsWindow(r.start, r.end || '', winStart, winEnd)) continue
      // The title field is HTML; prefer the <h3> name, else strip everything.
      const h3 = (r.title || '').match(/<h3[^>]*>([\s\S]*?)<\/h3>/i)
      const title = stripHtml(h3 ? h3[1] : (r.title || ''))
      if (title.length < 3) continue

      const path = r.url || ''
      const url = path.startsWith('http') ? path : `${origin}${path.startsWith('/') ? '' : '/'}${path}`
      const key = (url || title).toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)

      events.push({
        id: `${citySlug}-gp-${events.length}-${ymd(r.start)}`,
        title,
        description: '',
        shortDescription: '',
        startDate: r.start,
        endDate: r.end || r.start,
        startFormatted: whenLabel(r.start, r.end || ''),
        venueName: '',
        venueAddress: '',
        url,
        isFree: false,
        price: 'See website',
        categoryName: 'Community',
        imageUrl: null,
      })
    }

    console.log(`[city-events] ${citySlug} (Drupal): ${events.length} events in window from ${origin}`)
    return events
  } catch (err) {
    console.warn(`[city-events] ${citySlug} (Drupal) failed (${err instanceof Error ? err.message : err}) — skipping`)
    return []
  }
}

// ---------------------------------------------------------------------------
// Per-city adapter registry + public entry point
// ---------------------------------------------------------------------------

type CityAdapter = (winStart: string, winEnd: string) => Promise<EventbriteEvent[]>

const CITY_ADAPTERS: Record<string, CityAdapter> = {
  'red-deer':       (s, e) => fetchTribeEvents('visitreddeer.com', 'red-deer', s, e),
  'medicine-hat':   (s, e) => fetchTribeEvents('stayinmedicinehat.com', 'medicine-hat', s, e),
  'fort-mcmurray':  (s, e) => fetchMecRestEvents('maccalendar.ca', 'fort-mcmurray', s, e),
  lethbridge:       (s, e) => fetchMecAjaxEvents('visitlethbridge.com', 'lethbridge', s, e),
  'grande-prairie': (s, e) =>
    fetchDrupalCalendarEvents(
      'https://cityofgp.com/culture-community/news-events/event-calendar',
      'https://cityofgp.com',
      'grande-prairie',
      s,
      e
    ),
}

/**
 * Weekend event source of record for a single city.
 * Calgary and Edmonton read from the Socrata open-data feeds; every other city
 * reads from its tourism/municipal calendar adapter above. Always returns a
 * values-filtered EventbriteEvent[] and never throws.
 */
export async function fetchWeekendCityEvents(
  city: string,
  start: Date,
  end: Date
): Promise<EventbriteEvent[]> {
  if (city === 'calgary' || city === 'edmonton') {
    // open-data.ts already applies the values filter.
    return fetchOpenDataEvents(city, start, end)
  }

  const adapter = CITY_ADAPTERS[city]
  if (!adapter) return []

  const winStart = isoDateOnly(start)
  const winEnd = isoDateOnly(end)
  const events = await adapter(winStart, winEnd)
  return filterEvents(events)
}
