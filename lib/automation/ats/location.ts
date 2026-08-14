/**
 * Map an ATS board's free-text location onto one of our municipalities.
 *
 * ATS boards list an employer's whole footprint — Toronto, Houston, remote —
 * so this is the filter that keeps the board Albertan. It has to be strict in
 * both directions: a missed match loses a real local job, and a false match
 * puts a Houston role on the Fort McMurray page.
 *
 * Returns null for anything not confidently in one of our seven cities,
 * including Alberta towns we don't have a section for. Those are dropped
 * rather than lumped into the nearest city.
 */

import { JobCity } from '@/lib/types/job'

/**
 * Ordered longest-phrase-first inside each city so "fort saskatchewan" can't be
 * swallowed by a looser "fort" style match, and so surrounding communities land
 * on the city page a commuter would actually look at.
 */
const CITY_PATTERNS: Array<{ city: JobCity; patterns: RegExp[] }> = [
  {
    city: 'fort-mcmurray',
    patterns: [/\bfort\s*mc\s*murray\b/i, /\bfort\s*mac\b/i, /\bwood\s*buffalo\b/i],
  },
  {
    city: 'grande-prairie',
    patterns: [/\bgrande\s*prairie\b/i, /\bclairmont\b/i, /\bsexsmith\b/i, /\bwembley\b/i],
  },
  {
    city: 'medicine-hat',
    patterns: [/\bmedicine\s*hat\b/i, /\bredcliff\b/i, /\bdunmore\b/i],
  },
  {
    city: 'red-deer',
    patterns: [/\bred\s*deer\b/i, /\bsylvan\s*lake\b/i, /\blacombe\b/i, /\bblackfalds\b/i, /\bpenhold\b/i],
  },
  {
    city: 'lethbridge',
    patterns: [/\blethbridge\b/i, /\bcoaldale\b/i, /\bcoalhurst\b/i, /\btaber\b/i],
  },
  {
    // Edmonton before Calgary is arbitrary — the two never collide.
    city: 'edmonton',
    patterns: [
      /\bedmonton\b/i, /\bsherwood\s*park\b/i, /\bst\.?\s*albert\b/i,
      /\bspruce\s*grove\b/i, /\bfort\s*saskatchewan\b/i, /\bleduc\b/i,
      /\bstony\s*plain\b/i, /\bbeaumont\b/i, /\bnisku\b/i, /\bdevon\b/i,
      // Bare "Sherwood" is how some boards label a Sherwood Park site —
      // Costco's warehouse there is listed as plain "SHERWOOD, Alberta", which
      // the "sherwood park" pattern above never matched. There is no other
      // Sherwood in Alberta, so the looser form is safe.
      /\bsherwood\b/i,
    ],
  },
  {
    city: 'calgary',
    patterns: [
      /\bcalgary\b/i, /\bairdrie\b/i, /\bcochrane\b/i, /\bokotoks\b/i,
      /\bchestermere\b/i, /\bstrathmore\b/i, /\bhigh\s*river\b/i, /\bcanmore\b/i,
      // Tsuut'ina Nation adjoins Calgary's southwest edge; the retail sites
      // there (Costco Buffalo Run among them) are a Calgary commute, and are
      // listed under the nation's name rather than a municipality.
      /\btsuut'?\s*ina\b/i,
    ],
  },
]

/**
 * Note there is deliberately no "vague location" rejection here. A bare
 * "Alberta, Canada" matches no city pattern and is dropped anyway, whereas a
 * multi-office string like "Alberta, Canada; British Columbia; Calgary, Alberta"
 * is a real Calgary job — an early bail-out on the leading token silently threw
 * those away.
 */

/** Non-Alberta signals that must lose even when an Alberta city is also listed. */
const REMOTE_ONLY = /\b(fully\s+remote|remote\s*[-–]\s*(us|usa|united states))\b/i

/**
 * A single posting can list several offices ("Calgary; Toronto; Remote").
 * Return every Alberta city mentioned so a genuinely multi-city role appears on
 * each relevant board — deduped, and empty when none apply.
 */
export function matchJobCities(location: string | null | undefined): JobCity[] {
  if (!location) return []
  const text = location.trim()
  if (!text || REMOTE_ONLY.test(text)) return []

  const found = new Set<JobCity>()
  for (const { city, patterns } of CITY_PATTERNS) {
    if (patterns.some(p => p.test(text))) found.add(city)
  }
  return [...found]
}

/** Single best city, for callers that only need one. */
export function matchJobCity(location: string | null | undefined): JobCity | null {
  return matchJobCities(location)[0] ?? null
}
