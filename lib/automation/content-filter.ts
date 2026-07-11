/**
 * Content filter for automated articles.
 * Removes events that conflict with Culture Alberta's editorial values.
 * Add or remove terms from the lists below to adjust filtering.
 */

// Keywords that disqualify an event — checked against title + description (case-insensitive)
const BLOCKED_KEYWORDS: string[] = [
  // Adult / sexual content
  'strip club', 'strip show', 'stripclub',
  'burlesque', 'exotic dancer', 'exotic dance',
  'adult entertainment', 'adult show', 'adult only',
  'erotic', 'erotica',
  'sex', 'sexual', 'fetish', 'kink', 'bdsm',
  'nude', 'nudist',
  'onlyfans',

  // LGBTQ+ events
  'pride parade', 'pride festival', 'pride march', 'pride event', 'pride night',
  'drag show', 'drag queen', 'drag brunch', 'drag performance', 'drag race',
  'queer night', 'queer event', 'queer festival',
  'lgbtq', 'lgbt+', 'lgbtq+',
  'trans day', 'transgender celebration',
  'gay bar', 'lesbian bar',

  // Gambling — including events HELD at casinos (venue name is checked too)
  'casino', 'poker night', 'poker tournament',
  'slot machine', 'blackjack night',
  'gambling', 'bingo',

  // Alcohol-centred events and venues
  'brewery', 'brewpub', 'brew fest', 'beerfest', 'beer festival', 'beer garden',
  'beer tasting', 'wine tasting', 'winery', 'wine festival', 'wine night',
  'distillery', 'taproom', 'cocktail', 'mixology', 'happy hour',
  'pub crawl', 'bar crawl', 'oktoberfest', 'booze',
  'whisky', 'whiskey tasting',

  // Nightlife / adults-only
  'nightclub', 'night club', 'rave', 'after dark',
  'adults only', 'adults-only', '18+', '19+',

  // Music festivals and concerts (editorial choice — not promoted)
  'music festival', 'concert', 'live music', 'music fest', 'music series',
  'dj set', 'edm night', 'rockin', 'rock fest', 'folk fest', 'jamboree',
  'jazz festival', 'blues festival', 'punk', 'hip hop', 'hip-hop',
  'album release', 'anniversary release', 'listening party',

  // Cannabis
  'cannabis', '420 ',

  // Occult / esoteric (optional — remove if too broad for your audience)
  'tarot reading', 'psychic fair', 'witchcraft', 'wicca', 'seance',
  'ouija',

  // Bars/clubs with adult themes
  'ladies night', 'wet t-shirt',
  'bachelor party show', 'bachelorette party show',
]

// Allowed exceptions — if an event contains a blocked word but also contains
// one of these, it passes through (e.g. "Charity Bingo Night" vs "Poker Night")
const ALLOWED_EXCEPTIONS: string[] = [
  'charity bingo',
  'family bingo',
  'church bingo',
]

export interface FilterableEvent {
  title: string
  description?: string
  categoryName?: string
  venueName?: string
}

/**
 * Returns true if the event should be EXCLUDED from the article.
 */
export function isEventBlocked(event: FilterableEvent): boolean {
  const textToCheck = [
    event.title,
    event.description ?? '',
    event.categoryName ?? '',
    event.venueName ?? '',
  ]
    .join(' ')
    .toLowerCase()

  // Check exceptions first
  const hasException = ALLOWED_EXCEPTIONS.some(ex => textToCheck.includes(ex.toLowerCase()))
  if (hasException) return false

  // Check blocked keywords
  if (BLOCKED_KEYWORDS.some(keyword => textToCheck.includes(keyword.toLowerCase()))) {
    return true
  }

  // Music-category events are blocked UNLESS the text shows it's actually
  // theatre/comedy/etc. (city feeds lump those under "Music & Performing Arts")
  const category = (event.categoryName ?? '').toLowerCase()
  if (category.includes('music')) {
    const NON_MUSIC_PERFORMING_ARTS = ['comedy', 'improv', 'theatre', 'theater', 'fashion', 'film', 'dance', 'circus', 'magic', 'storytelling', 'poetry']
    return !NON_MUSIC_PERFORMING_ARTS.some(w => textToCheck.includes(w))
  }

  return false
}

/**
 * Filters an array of events, returning only those that pass.
 * Logs how many were removed so you can audit the filter.
 */
export function filterEvents<T extends FilterableEvent>(events: T[]): T[] {
  const before = events.length
  const clean = events.filter(e => !isEventBlocked(e))
  const removed = before - clean.length

  if (removed > 0) {
    console.log(`[content-filter] Removed ${removed} event(s) from ${before} total`)
  }

  return clean
}
