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

  // Gambling
  'casino night', 'poker night', 'poker tournament',
  'slot machine', 'blackjack night',
  'gambling',

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
}

/**
 * Returns true if the event should be EXCLUDED from the article.
 */
export function isEventBlocked(event: FilterableEvent): boolean {
  const textToCheck = [
    event.title,
    event.description ?? '',
    event.categoryName ?? '',
  ]
    .join(' ')
    .toLowerCase()

  // Check exceptions first
  const hasException = ALLOWED_EXCEPTIONS.some(ex => textToCheck.includes(ex.toLowerCase()))
  if (hasException) return false

  // Check blocked keywords
  return BLOCKED_KEYWORDS.some(keyword => textToCheck.includes(keyword.toLowerCase()))
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
