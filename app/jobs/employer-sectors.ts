/**
 * Industry grouping for the employer directory.
 *
 * A flat, count-sorted list of 43 employers is only browsable if you already
 * know the name you want. Someone who wants "a job at a college" or "anything
 * in oil and gas" has to read all 43 and know, for instance, that Keyera is
 * midstream and Benevity is software. Grouping does that reading for them.
 *
 * Curated by name rather than derived from the job `category` column: that
 * column describes the *role* (a Costco accountant is Finance), while this
 * describes the *employer*. Grouping the directory by role category would put
 * the same company in six places.
 *
 * Adding an employer needs no entry here — `sectorFor` classifies universities,
 * colleges, cities and counties on their name, which covers the two kinds of
 * board most often added. Anything else lands in "Other Employers", which is
 * visible rather than hidden, so a miss looks like a miss.
 */

export const SECTORS = [
  'Post-secondary & Education',
  'Government & Public Sector',
  'Retail & Grocery',
  'Energy & Utilities',
  'Construction & Skilled Trades',
  'Tech & Finance',
  'Hospitality & Food Service',
  'Other Employers',
] as const

export type EmployerSector = (typeof SECTORS)[number]

/**
 * Chip labels. The full sector names are headings and can afford to be precise;
 * as filter chips they wrapped onto seven lines at 375px, burying the employer
 * list under a wall of buttons.
 */
export const SECTOR_CHIP_LABELS: Record<EmployerSector, string> = {
  'Post-secondary & Education': 'Education',
  'Government & Public Sector': 'Government',
  'Retail & Grocery': 'Retail',
  'Energy & Utilities': 'Energy',
  'Construction & Skilled Trades': 'Trades',
  'Tech & Finance': 'Tech & Finance',
  'Hospitality & Food Service': 'Hospitality',
  'Other Employers': 'Other',
}

/** One-line explainer under each group heading. */
export const SECTOR_BLURBS: Record<EmployerSector, string> = {
  'Post-secondary & Education':
    'Universities, colleges and polytechnics — faculty, admin, trades and student-facing roles.',
  'Government & Public Sector':
    'Provincial ministries, city halls and county offices.',
  'Retail & Grocery':
    'Store, warehouse and distribution roles, usually the largest share of entry-level openings.',
  'Energy & Utilities':
    'Oil and gas, midstream, pipelines and power.',
  'Construction & Skilled Trades':
    'General contractors and heavy equipment — site, shop and field roles.',
  'Tech & Finance':
    'Software, fintech and adtech, concentrated in Calgary and Edmonton.',
  'Hospitality & Food Service':
    'Restaurants, hotels and resorts.',
  'Other Employers':
    'Everything that does not fit the groups above.',
}

/**
 * Employers we place by hand. Keyed by the exact `company` value stored on the
 * job, the same key `MANUAL_COMPANY_DOMAINS` uses in ./shared.
 */
const SECTOR_BY_COMPANY: Record<string, EmployerSector> = {
  // Retail & grocery
  'Calgary Co-op': 'Retail & Grocery',
  'Costco Wholesale Canada': 'Retail & Grocery',
  'Save-On-Foods': 'Retail & Grocery',
  'The Home Depot Canada': 'Retail & Grocery',
  'Canadian Tire': 'Retail & Grocery',

  // Government — the name heuristic catches "City of …" and "… County", but not
  // these three.
  'Government of Alberta': 'Government & Public Sector',
  'Elections Alberta': 'Government & Public Sector',
  'Regional Municipality of Wood Buffalo': 'Government & Public Sector',

  // Education — the heuristic catches University/College/Polytechnic. NAIT and
  // SAIT are acronyms with no such word in them.
  NAIT: 'Post-secondary & Education',
  SAIT: 'Post-secondary & Education',

  // Energy & utilities
  Suncor: 'Energy & Utilities',
  'Cenovus Energy': 'Energy & Utilities',
  'TC Energy': 'Energy & Utilities',
  Enbridge: 'Energy & Utilities',
  Keyera: 'Energy & Utilities',
  AltaGas: 'Energy & Utilities',
  'Whitecap Resources': 'Energy & Utilities',
  'Strathcona Resources': 'Energy & Utilities',
  'Capital Power': 'Energy & Utilities',
  ENMAX: 'Energy & Utilities',

  // Construction & trades. Finning sits here rather than in retail: it sells
  // and services Caterpillar equipment, and its openings are technicians and
  // field service, not store staff.
  Ledcor: 'Construction & Skilled Trades',
  Bird: 'Construction & Skilled Trades',
  Finning: 'Construction & Skilled Trades',

  // Tech & finance
  Jobber: 'Tech & Finance',
  'Neo Financial': 'Tech & Finance',
  Benevity: 'Tech & Finance',
  StackAdapt: 'Tech & Finance',

  // Hospitality
  "Hell's Kitchen at River Cree Resort": 'Hospitality & Food Service',
}

/**
 * Sector for an employer.
 *
 * Falls back to a name test so the two categories that grow most often —
 * post-secondaries and municipalities — classify themselves when a board is
 * added to `lib/automation/ats/boards.ts`.
 *
 * "Strathcona County" must be tested before "Strathcona Resources" would match
 * anything, which the explicit map above already handles; the county falls
 * through to the /County/ test and the oil producer does not.
 */
export function sectorFor(company: string): EmployerSector {
  const mapped = SECTOR_BY_COMPANY[company]
  if (mapped) return mapped

  if (/\b(University|College|Polytechnic|Institute|School|Academy)\b/i.test(company)) {
    return 'Post-secondary & Education'
  }
  if (/^City of |^Town of |^County of |\bCounty\b|\bMunicipality\b|\bGovernment\b/i.test(company)) {
    return 'Government & Public Sector'
  }
  return 'Other Employers'
}
