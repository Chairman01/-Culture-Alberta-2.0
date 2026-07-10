/**
 * Instagram enrichment for weekend events.
 *
 * Most event organizers link their Instagram from their event page. We fetch
 * each event's website and pull the first Instagram profile link so articles
 * can include a real "@handle" link per event — the kind of touch readers
 * (and editors) expect from a human-written roundup.
 *
 * Fail-soft by design: timeouts and fetch errors just leave instagramUrl unset.
 */

import type { EventbriteEvent } from './eventbrite'

const FETCH_TIMEOUT_MS = 8_000
const CONCURRENCY = 5

// Profile links only — not /p/, /reel/, /tv/ (posts), not share/explore/accounts
const IG_PROFILE_RE = /instagram\.com\/([A-Za-z0-9_.]{2,30})/gi
const IG_NON_PROFILE = new Set([
  'p', 'reel', 'reels', 'tv', 'explore', 'accounts', 'share', 'stories', 'about', 'legal', 'invites',
])

export function extractInstagramProfile(html: string): string | null {
  IG_PROFILE_RE.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = IG_PROFILE_RE.exec(html)) !== null) {
    const handle = match[1].replace(/\.$/, '')
    if (!IG_NON_PROFILE.has(handle.toLowerCase())) {
      return `https://www.instagram.com/${handle}`
    }
  }
  return null
}

async function fetchInstagramForUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      next: { revalidate: 0 },
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CultureAlberta/1.0; hello@culturealberta.com)',
        Accept: 'text/html',
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: 'follow',
    })
    if (!res.ok) return null
    const html = await res.text()
    return extractInstagramProfile(html)
  } catch {
    return null
  }
}

/**
 * Mutating enrichment: sets `instagramUrl` on events whose website links an
 * Instagram profile. Only the first `limit` events are checked (they're the
 * ones that end up in the article), with modest concurrency.
 */
export async function enrichEventsWithInstagram(
  events: EventbriteEvent[],
  limit = 24
): Promise<void> {
  const targets = events.slice(0, limit).filter(e => e.url && !e.instagramUrl)

  for (let i = 0; i < targets.length; i += CONCURRENCY) {
    const batch = targets.slice(i, i + CONCURRENCY)
    const results = await Promise.all(batch.map(e => fetchInstagramForUrl(e.url)))
    results.forEach((ig, idx) => {
      if (ig) batch[idx].instagramUrl = ig
    })
  }

  const found = targets.filter(e => e.instagramUrl).length
  console.log(`[instagram-enrich] Found Instagram profiles for ${found}/${targets.length} events`)
}
