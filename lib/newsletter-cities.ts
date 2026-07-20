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
 * Maps a free-text Alberta municipality (as picked in <CitySelect/>) onto the
 * newsletter it should receive. Towns without their own edition land in
 * 'other-alberta' so nobody is subscribed to a list that does not exist.
 */
export function toNewsletterCity(city: string): string {
  const slug = city.trim().toLowerCase().replace(/\s+/g, '-')
  return CITIES_WITH_A_NEWSLETTER.has(slug) ? slug : 'other-alberta'
}
