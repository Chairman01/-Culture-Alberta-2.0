/**
 * Elections Alberta 2026 referendum hiring — reference data.
 *
 * Elections Alberta is hiring a minimum of 60,000 workers for the October 19,
 * 2026 referendum, across all 87 provincial electoral divisions. It is the
 * largest recruitment drive in the province's history, and every Alberta reader
 * lives in one of these divisions — which is what makes it worth a page of its
 * own rather than two job listings.
 *
 * Sources (checked 2026-08-03):
 *   https://www.elections.ab.ca/jobs/election-officer-recruitment/
 *   https://www.elections.ab.ca/resources/maps/
 */

export const ELECTIONS_ALBERTA = {
  employer: 'Elections Alberta',
  domain: 'elections.ab.ca',
  applyUrl: 'https://recruitment.elections.ab.ca/8400/8',
  recruitmentInfoUrl: 'https://www.elections.ab.ca/jobs/election-officer-recruitment/',
  mapsUrl: 'https://www.elections.ab.ca/resources/maps/',
  overviewMapUrl: 'https://www.elections.ab.ca/uploads/2023_ABOverview_EDs2017_PUBLISHED.pdf',
  positionsTotal: 60_000,
  divisions: 87,
} as const

/** Key dates. Hiring closes well before polling day — the deadline is the story. */
export const ELECTION_DATES = [
  { label: 'Hiring window', value: 'July 15 – October 10, 2026', note: 'Applications close October 10' },
  { label: 'Training', value: 'Early October 2026', note: 'Paid; online plus one in-person session' },
  { label: 'Advance voting', value: 'October 13 – 17, 2026', note: 'Some positions start October 13' },
  { label: 'Referendum day', value: 'October 19, 2026', note: 'The largest single-day shift' },
  { label: 'Ballot counting', value: 'October 19 – 21, 2026', note: 'Results are due within 48 hours' },
] as const

/**
 * The nine roles. Elections Alberta publishes the titles and duties but not a
 * rate card, so no pay figures are stated here — inventing them would be worse
 * than leaving the field out.
 */
export const ELECTION_ROLES = [
  { title: 'Site Supervisor', blurb: 'The senior official at a voting place, responsible for all staff and activities on site.', minAge: 18 },
  { title: 'Information Officer', blurb: 'Greets electors and directs them to the right voting area. Usually the first person voters meet.', minAge: 16 },
  { title: 'Voting Officer', blurb: 'Issues ballots and manages the ballot box at a voting station.', minAge: 18 },
  { title: 'Registration Officer', blurb: 'Registers electors who are not already on the list, and handles address changes.', minAge: 18 },
  { title: 'Record Clerk', blurb: 'Maintains the official record of who has voted at the voting place.', minAge: 16 },
  { title: 'Ballot Box Clerk', blurb: 'Supervises the ballot box and helps electors deposit their ballots correctly.', minAge: 16 },
  { title: 'Count Supervisor', blurb: 'Runs a counting centre and is accountable for the integrity of the count.', minAge: 18 },
  { title: 'Count Coordinator', blurb: 'Coordinates counting teams and reconciles totals as results come in.', minAge: 18 },
  { title: 'Counting Officer', blurb: 'Counts ballots after voting closes, working to the 48-hour reporting deadline.', minAge: 16 },
] as const

export const ELIGIBILITY = [
  'Alberta resident, 16 or older (several roles require 18+)',
  'Eligible to work in Canada',
  'Must pass a criminal record check',
  'No political activity of any kind while employed',
  'Must swear an oath upholding Elections Alberta’s non-partisan mandate',
] as const

export const INELIGIBLE = [
  'Sitting MPs, MLAs, municipal councillors and school trustees',
  'Candidates in the referendum',
  'Judges',
  'Anyone convicted of an indictable offence in the past 10 years',
] as const

export type EdRegion = 'Calgary' | 'Edmonton' | 'Rest of Alberta'

export interface ElectoralDivision {
  number: number
  name: string
  region: EdRegion
}

/**
 * Official PDF boundary map for a division.
 *
 * Derived rather than stored: the filename is `2023_ED{n}_{NAME}_PUBLISHED.pdf`
 * where NAME is the division upper-cased with spaces removed and hyphens turned
 * into underscores. Verified against all 87 links on the Elections Alberta maps
 * page on 2026-08-03 — 87 matches, 0 mismatches. Note the number is NOT
 * zero-padded (ED1, not ED01), which 404s.
 */
export function divisionMapUrl(division: ElectoralDivision): string {
  const slug = division.name.toUpperCase().replace(/\s+/g, '').replace(/-/g, '_')
  return `https://www.elections.ab.ca/uploads/2023_ED${division.number}_${slug}_PUBLISHED.pdf`
}

/** URL-safe slug, e.g. "Calgary-Fish Creek" → "calgary-fish-creek". */
export function divisionSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

const CALGARY = [
  'Calgary-Acadia', 'Calgary-Beddington', 'Calgary-Bow', 'Calgary-Buffalo', 'Calgary-Cross',
  'Calgary-Currie', 'Calgary-East', 'Calgary-Edgemont', 'Calgary-Elbow', 'Calgary-Falconridge',
  'Calgary-Fish Creek', 'Calgary-Foothills', 'Calgary-Glenmore', 'Calgary-Hays', 'Calgary-Klein',
  'Calgary-Lougheed', 'Calgary-Bhullar-McCall', 'Calgary-Mountain View', 'Calgary-North',
  'Calgary-North East', 'Calgary-North West', 'Calgary-Peigan', 'Calgary-Shaw',
  'Calgary-South East', 'Calgary-Varsity', 'Calgary-West',
]

const EDMONTON = [
  'Edmonton-Beverly-Clareview', 'Edmonton-Castle Downs', 'Edmonton-City Centre', 'Edmonton-Decore',
  'Edmonton-Ellerslie', 'Edmonton-Glenora', 'Edmonton-Gold Bar', 'Edmonton-Highlands-Norwood',
  'Edmonton-Manning', 'Edmonton-McClung', 'Edmonton-Meadows', 'Edmonton-Mill Woods',
  'Edmonton-North West', 'Edmonton-Riverview', 'Edmonton-Rutherford', 'Edmonton-South',
  'Edmonton-South West', 'Edmonton-Strathcona', 'Edmonton-West Henday', 'Edmonton-Whitemud',
]

const REST = [
  'Airdrie-Cochrane', 'Airdrie-East', 'Athabasca-Barrhead-Westlock', 'Banff-Kananaskis',
  'Bonnyville-Cold Lake-St Paul', 'Brooks-Medicine Hat', 'Camrose', 'Cardston-Siksika',
  'Central Peace-Notley', 'Chestermere-Strathmore', 'Cypress-Medicine Hat', 'Drayton Valley-Devon',
  'Drumheller-Stettler', 'Fort McMurray-Lac La Biche', 'Fort McMurray-Wood Buffalo',
  'Fort Saskatchewan-Vegreville', 'Grande Prairie', 'Grande Prairie-Wapiti', 'Highwood',
  'Innisfail-Sylvan Lake', 'Lac Ste Anne-Parkland', 'Lacombe-Ponoka', 'Leduc-Beaumont',
  'Lesser Slave Lake', 'Lethbridge-East', 'Lethbridge-West', 'Livingstone-Macleod',
  'Maskwacis-Wetaskiwin', 'Morinville-St Albert', 'Olds-Didsbury-Three Hills', 'Peace River',
  'Red Deer-North', 'Red Deer-South', 'Rimbey-Rocky Mountain House-Sundre', 'Sherwood Park',
  'Spruce Grove-Stony Plain', 'St Albert', 'Strathcona-Sherwood Park', 'Taber-Warner',
  'Vermilion-Lloydminster-Wainwright', 'West Yellowhead',
]

/** All 87 divisions in official numbering order (1–26 Calgary, 27–46 Edmonton, 47–87 rest). */
export const ELECTORAL_DIVISIONS: ElectoralDivision[] = [
  ...CALGARY.map((name, i) => ({ number: i + 1, name, region: 'Calgary' as const })),
  ...EDMONTON.map((name, i) => ({ number: i + 27, name, region: 'Edmonton' as const })),
  ...REST.map((name, i) => ({ number: i + 47, name, region: 'Rest of Alberta' as const })),
]

// ── Municipalities ───────────────────────────────────────────────────────────

export interface Municipality {
  /** Everyday name of the place, as a resident would type it. */
  name: string
  /** Every electoral division that covers part of it. */
  divisions: number[]
}

/**
 * Where you live → which electoral division you work in.
 *
 * Nobody thinks of themselves as living in "Highwood" — they live in Okotoks.
 * Searching divisions by name alone therefore fails exactly the people it needs
 * to serve, and a big municipality is split across several divisions anyway
 * (Calgary spans 26 of them).
 *
 * Two sources, both authoritative, no guesswork:
 *   1. Elections Alberta's own municipal sub-maps on the maps page, which state
 *      outright that e.g. the Town of Okotoks sits in ED 65. Captured 2026-08-03.
 *   2. Municipalities named in a division's own title — Lethbridge-East and
 *      Lethbridge-West plainly cover Lethbridge.
 *
 * Deliberately NOT exhaustive. Alberta has hundreds of municipalities and
 * mapping the rest would mean interpreting boundary shapefiles, which is how
 * you end up confidently telling someone the wrong answer. Anything not listed
 * falls back to the boundary maps, which the page says plainly.
 */
export const MUNICIPALITIES: Municipality[] = [
  // Major cities — the seven the jobs board already covers
  { name: 'Calgary', divisions: Array.from({ length: 26 }, (_, i) => i + 1) },
  { name: 'Edmonton', divisions: Array.from({ length: 20 }, (_, i) => i + 27) },
  { name: 'Red Deer', divisions: [78, 79] },
  { name: 'Lethbridge', divisions: [71, 72] },
  { name: 'Medicine Hat', divisions: [52, 57] },
  { name: 'Grande Prairie', divisions: [63, 64] },
  { name: 'Fort McMurray', divisions: [60, 61] },

  // Other cities and towns, from Elections Alberta's municipal sub-maps
  { name: 'Airdrie', divisions: [47, 48] },
  { name: 'St Albert', divisions: [75, 83] },
  { name: 'Sherwood Park', divisions: [81, 84] },
  { name: 'Beaumont', divisions: [69] },
  { name: 'Bearspaw', divisions: [47] },
  { name: 'Blackfalds', divisions: [68] },
  { name: 'Bonnyville', divisions: [51] },
  { name: 'Brooks', divisions: [52] },
  { name: 'Camrose', divisions: [53] },
  { name: 'Canmore', divisions: [50] },
  { name: 'Chestermere', divisions: [56] },
  { name: 'Coaldale', divisions: [85] },
  { name: 'Cochrane', divisions: [47] },
  { name: 'Cold Lake', divisions: [51] },
  { name: 'Crowsnest Pass', divisions: [73] },
  { name: 'Devon', divisions: [58] },
  { name: 'Drayton Valley', divisions: [58] },
  { name: 'Drumheller', divisions: [59] },
  { name: 'Edson', divisions: [87] },
  { name: 'Fort Saskatchewan', divisions: [62] },
  { name: 'High River', divisions: [73] },
  { name: 'Hinton', divisions: [87] },
  { name: 'Innisfail', divisions: [66] },
  { name: 'Lac La Biche', divisions: [60] },
  { name: 'Lacombe', divisions: [68] },
  { name: 'Leduc', divisions: [69] },
  { name: 'Lloydminster', divisions: [86] },
  { name: 'Morinville', divisions: [75] },
  { name: 'Okotoks', divisions: [65] },
  { name: 'Olds', divisions: [76] },
  { name: 'Peace River', divisions: [77] },
  { name: 'Ponoka', divisions: [68] },
  { name: 'Rocky Mountain House', divisions: [80] },
  { name: 'Slave Lake', divisions: [70] },
  { name: 'Springbank', divisions: [50] },
  { name: 'Strathmore', divisions: [56] },
  { name: 'Sylvan Lake', divisions: [66] },
  { name: 'Taber', divisions: [85] },
  { name: 'Wainwright', divisions: [86] },
  { name: 'Wetaskiwin', divisions: [74] },
  { name: 'Whitecourt', divisions: [87] },

  // Named directly in a division title
  { name: 'Athabasca', divisions: [49] },
  { name: 'Banff', divisions: [50] },
  { name: 'Barrhead', divisions: [49] },
  { name: 'Cardston', divisions: [54] },
  { name: 'Didsbury', divisions: [76] },
  { name: 'Spruce Grove', divisions: [82] },
  { name: 'St Paul', divisions: [51] },
  { name: 'Stettler', divisions: [59] },
  { name: 'Stony Plain', divisions: [82] },
  { name: 'Sundre', divisions: [80] },
  { name: 'Three Hills', divisions: [76] },
  { name: 'Vegreville', divisions: [62] },
  { name: 'Vermilion', divisions: [86] },
  { name: 'Westlock', divisions: [49] },
]

/** Municipalities whose name matches a query, best (shortest) match first. */
export function findMunicipalities(query: string): Municipality[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return MUNICIPALITIES
    .filter(m => m.name.toLowerCase().includes(q))
    .sort((a, b) => a.name.length - b.name.length)
}
