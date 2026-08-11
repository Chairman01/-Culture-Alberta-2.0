/** City options for newsletter signup - used across all newsletter forms */
export const NEWSLETTER_CITIES = [
  { value: '', label: 'Select your city' },
  { value: 'edmonton', label: 'Edmonton' },
  { value: 'calgary', label: 'Calgary' },
  { value: 'lethbridge', label: 'Lethbridge' },
  { value: 'red-deer', label: 'Red Deer' },
  { value: 'grande-prairie', label: 'Grande Prairie' },
  { value: 'fort-mcmurray', label: 'Fort McMurray' },
  { value: 'medicine-hat', label: 'Medicine Hat' },
  { value: 'other-alberta', label: 'Other Alberta' },
  { value: 'other', label: 'Other' },
] as const

/** Cities that actually have their own newsletter (see VALID_CITIES in
 *  app/api/newsletter/send/route.ts). Everywhere else falls back to
 *  'other-alberta', which is a holding bucket rather than a sending list. */
const CITIES_WITH_A_NEWSLETTER = new Set([
  'edmonton', 'calgary', 'lethbridge', 'red-deer',
  'grande-prairie', 'fort-mcmurray', 'medicine-hat',
])

/**
 * Alberta municipalities routed to the edition they actually belong to.
 *
 * Anything outside the seven named cities used to fall into 'other-alberta',
 * which the send route does not recognise — so it never sends. That left 45
 * confirmed subscribers receiving nothing at all, including commuters in
 * Spruce Grove, Leduc and Airdrie who plainly belong to an existing edition.
 *
 * The rule is nearest edition wins: a town goes to the closest city that
 * publishes, not to the biggest one. Taber reads Lethbridge, not Calgary;
 * Brooks reads Medicine Hat; Rocky Mountain House reads Red Deer. Only places
 * with no edition within reasonable driving distance — the far north, the
 * remote east — stay in 'other-alberta' and need a decision by hand.
 *
 * Keyed by slug (spaces already collapsed to hyphens by the caller).
 */
const REGIONS: Record<string, string[]> = {
  edmonton: [
    // Metro and commuter belt
    'st-albert', 'saint-albert', 'sherwood-park', 'spruce-grove', 'stony-plain',
    'fort-saskatchewan', 'leduc', 'beaumont', 'devon', 'nisku', 'morinville',
    'gibbons', 'bon-accord', 'legal', 'calmar', 'thorsby', 'ardrossan',
    'strathcona-county', 'sturgeon-county', 'parkland-county', 'bruderheim',
    'lancaster-park', 'onoway', 'alberta-beach', 'wabamun', 'entwistle',
    // Central and eastern catchment
    'vegreville', 'camrose', 'wetaskiwin', 'daysland', 'tofield', 'viking',
    'lamont', 'mundare', 'two-hills', 'vilna', 'smoky-lake', 'redwater',
    'thorhild', 'waskatenau', 'boyle', 'athabasca', 'westlock', 'barrhead',
    'clyde', 'lac-la-biche', 'st-paul', 'elk-point', 'bonnyville', 'cold-lake',
    'drayton-valley', 'breton', 'warburg', 'evansburg', 'edson', 'hinton',
    'jasper', 'whitecourt', 'mayerthorpe', 'swan-hills', 'wainwright',
    'vermilion', 'lloydminster', 'kitscoty', 'provost',
  ],
  calgary: [
    'airdrie', 'chestermere', 'cochrane', 'okotoks', 'strathmore', 'high-river',
    'crossfield', 'langdon', 'beiseker', 'irricana', 'carstairs', 'black-diamond',
    'turner-valley', 'bragg-creek', 'de-winton', 'balzac', 'rocky-view-county',
    'foothills-county', 'canmore', 'banff', 'exshaw', 'nanton', 'vulcan',
    'drumheller', 'carbon', 'acme', 'linden', 'standard', 'gleichen', 'siksika',
  ],
  'red-deer': [
    'rocky-mountain-house', 'sylvan-lake', 'lacombe', 'blackfalds', 'ponoka',
    'innisfail', 'olds', 'didsbury', 'sundre', 'bowden', 'penhold', 'stettler',
    'rimbey', 'eckville', 'bentley', 'three-hills', 'trochu', 'delburne',
    'elnora', 'alix', 'bashaw', 'castor', 'coronation', 'hanna', 'caroline',
    'nordegg', 'clive', 'mirror', 'red-deer-county',
  ],
  lethbridge: [
    'taber', 'coaldale', 'coalhurst', 'picture-butte', 'barnwell', 'vauxhall',
    'fort-macleod', 'claresholm', 'granum', 'stavely', 'cardston', 'magrath',
    'raymond', 'stirling', 'warner', 'milk-river', 'pincher-creek', 'blairmore',
    'coleman', 'crowsnest-pass', 'nobleford', 'champion', 'carmangay',
  ],
  'medicine-hat': [
    'brooks', 'redcliff', 'bow-island', 'dunmore', 'seven-persons', 'foremost',
    'suffield', 'cypress-county', 'oyen', 'bassano', 'duchess', 'rosemary',
    'tilley', 'ralston',
  ],
  'grande-prairie': [
    'beaverlodge', 'sexsmith', 'wembley', 'clairmont', 'hythe', 'valleyview',
    'fairview', 'spirit-river', 'rycroft', 'wanham', 'berwyn', 'grimshaw',
    'peace-river', 'manning', 'high-prairie', 'mclennan', 'falher', 'girouxville',
    'grande-cache', 'fox-creek', 'high-level', 'la-crete', 'fort-vermilion',
    'county-of-grande-prairie',
  ],
  'fort-mcmurray': [
    'anzac', 'fort-mackay', 'fort-mckay', 'conklin', 'janvier', 'gregoire-lake',
    'wood-buffalo', 'regional-municipality-of-wood-buffalo', 'fort-chipewyan',
  ],
}

const METRO_AREAS: Record<string, string> = {}
for (const [edition, towns] of Object.entries(REGIONS)) {
  for (const t of towns) METRO_AREAS[t.toLowerCase()] = edition
}

/**
 * Maps a free-text Alberta municipality (as picked in <CitySelect/>) onto the
 * newsletter it should receive.
 *
 * Order: an exact city edition, then the nearest edition's catchment, then
 * 'other-alberta'. That last bucket still sends nothing — it is a holding pen
 * for towns with no edition within reach, and anyone in it needs a decision
 * rather than a silent subscription.
 */
export function toNewsletterCity(city: string): string {
  const slug = city.trim().toLowerCase().replace(/\s+/g, '-')
  if (CITIES_WITH_A_NEWSLETTER.has(slug)) return slug
  return METRO_AREAS[slug] ?? 'other-alberta'
}

/** True when a slug is a holding bucket rather than a sending list. */
export function isOrphanNewsletterCity(city: string | null | undefined): boolean {
  return !city || !CITIES_WITH_A_NEWSLETTER.has(city)
}
