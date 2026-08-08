/**
 * Employers whose public ATS board we read.
 *
 * Every entry here was verified live before being added — a guessed token
 * silently returns nothing, which looks identical to "this employer has no
 * openings right now". Confirmed 2026-08-02.
 *
 * Adding an employer is a two-minute job and needs no permission: open their
 * careers page and the provider, token and (for Workday) datacenter and site
 * name are all visible in the URL.
 *
 *   Greenhouse  job-boards.greenhouse.io/{token}
 *   Lever       jobs.lever.co/{token}
 *   Ashby       jobs.ashbyhq.com/{token}
 *   Workday     {token}.{datacenter}.myworkdayjobs.com/{site}
 *
 * Boards with no Alberta postings today are kept rather than removed — they
 * cost one request per sync and start producing the moment they hire locally.
 */

import { AtsProvider, JobCity } from '@/lib/types/job'

export interface AtsBoard {
  provider: AtsProvider
  /** Board token, or Workday tenant. */
  token: string
  /** Display name — ATS feeds are inconsistent about company naming. */
  company: string
  /**
   * Company website, used only to resolve a logo. None of the ATS APIs return
   * one, so it's curated here alongside the token. Omit and the card falls back
   * to a lettered tile rather than showing a broken image.
   */
  domain?: string
  /**
   * Overrides `domain` for logo lookup only. Needed where `domain` is the board
   * origin rather than the corporate site — jobpostings.alberta.ca has no
   * recognisable mark, alberta.ca does.
   */
  logoDomain?: string
  /** Workday only: datacenter subdomain, e.g. "wd3". */
  datacenter?: string
  /** Workday and Oracle: career site name, e.g. "Careers" or "UOA-Careers". */
  site?: string
  /**
   * Oracle only: the tenant's API hostname. Kept separate from `domain` because
   * it's an opaque vendor host (`iaejup.fa.ocs.oraclecloud.com`) that would be
   * useless as a logo source — `domain` stays the employer's own site.
   */
  host?: string
  /**
   * Site names this board uses in place of a city, mapped onto the city they're
   * actually in.
   *
   * Most boards state a municipality. A few state an internal site instead:
   * NAIT posts every role against "Main Campus" / "Souch Campus" / "Patricia
   * Campus", which named no city, so 24 of its 25 openings were silently
   * dropped by the Alberta filter — only "Spruce Grove Campus" got through, on
   * the accident of containing a town name.
   *
   * Applied only when the location text matches no city on its own, so a board
   * that usually states a real city is unaffected.
   */
  locationAliases?: Array<{ pattern: RegExp; city: JobCity }>
}

export const ATS_BOARDS: AtsBoard[] = [
  // ── Ashby ──────────────────────────────────────────────────────────────────
  { provider: 'ashby', token: 'neofinancial', company: 'Neo Financial', domain: 'neofinancial.com' },
  { provider: 'ashby', token: 'benevity', company: 'Benevity', domain: 'benevity.com' },
  { provider: 'ashby', token: 'jobber', company: 'Jobber', domain: 'getjobber.com' },
  { provider: 'ashby', token: 'absorblms', company: 'Absorb LMS', domain: 'absorblms.com' },

  // ── Lever ──────────────────────────────────────────────────────────────────
  { provider: 'lever', token: 'sait', company: 'SAIT', domain: 'sait.ca' },
  { provider: 'lever', token: 'trellis', company: 'Trellis' },

  // ── Greenhouse ─────────────────────────────────────────────────────────────
  { provider: 'greenhouse', token: 'stackadapt', company: 'StackAdapt', domain: 'stackadapt.com' },
  { provider: 'greenhouse', token: 'bird', company: 'Bird', domain: 'bird.co' },
  { provider: 'greenhouse', token: 'chata', company: 'Chata', domain: 'chata.ai' },

  // ── Workday ────────────────────────────────────────────────────────────────
  { provider: 'workday', token: 'cenovus', company: 'Cenovus Energy', domain: 'cenovus.com', datacenter: 'wd3', site: 'Careers' },
  { provider: 'workday', token: 'enbridge', company: 'Enbridge', domain: 'enbridge.com', datacenter: 'wd3', site: 'enbridge_careers' },
  { provider: 'workday', token: 'capitalpower', company: 'Capital Power', domain: 'capitalpower.com', datacenter: 'wd10', site: 'External' },
  { provider: 'workday', token: 'enmax', company: 'ENMAX', domain: 'enmax.com', datacenter: 'wd3', site: 'enmaxCareers' },
  {
    provider: 'workday', token: 'nait', company: 'NAIT', domain: 'nait.ca',
    datacenter: 'wd10', site: 'nait_careers',
    // Every NAIT campus is in the Edmonton region. Spruce Grove is listed
    // explicitly rather than left to the catch-all so it lands on its own
    // commuter city the way the location matcher already handles it.
    locationAliases: [
      { pattern: /\bspruce\s*grove\b/i, city: 'edmonton' },
      { pattern: /\bcampus\b/i, city: 'edmonton' },
    ],
  },
  { provider: 'workday', token: 'suncor', company: 'Suncor', domain: 'suncor.com', datacenter: 'wd1', site: 'Suncor_External' },
  { provider: 'workday', token: 'finning', company: 'Finning', domain: 'finning.com', datacenter: 'wd3', site: 'External' },
  { provider: 'workday', token: 'ledcor', company: 'Ledcor', domain: 'ledcor.com', datacenter: 'wd3', site: 'Ledcor_External' },
  { provider: 'workday', token: 'strathconaresources', company: 'Strathcona Resources', domain: 'strathconaresources.com', datacenter: 'wd10', site: 'Careers' },

  // ── Oracle Recruiting Cloud ────────────────────────────────────────────────
  {
    provider: 'oracle',
    token: 'university-of-alberta',
    company: 'University of Alberta',
    domain: 'ualberta.ca',
    host: 'iaejup.fa.ocs.oraclecloud.com',
    site: 'UOA-Careers',
  },
  {
    provider: 'oracle',
    token: 'strathcona-county',
    company: 'Strathcona County',
    domain: 'strathcona.ca',
    host: 'fa-erjf-saasfaprod1.fa.ocs.oraclecloud.com',
    site: 'CX_1',
  },

  // ── SuccessFactors ─────────────────────────────────────────────────────────
  // `domain` doubles as the site origin here, not just a logo hint: the whole
  // board lives on jobpostings.alberta.ca.
  {
    provider: 'successfactors',
    token: 'government-of-alberta',
    company: 'Government of Alberta',
    domain: 'jobpostings.alberta.ca',
    logoDomain: 'alberta.ca',
  },

  // ── Oracle Talent Social Sourcing — DELIBERATELY NOT ENABLED ──────────────
  //
  // Alberta Health Services (992 postings, ~500 in our cities) and Covenant
  // Health (111) both publish here, and the `otss` provider in providers.ts is
  // written and works. They are not in this list on purpose.
  //
  // Their Taleo career sections are decommissioned (the REST endpoint answers
  // `careerSectionUnAvailable: true`) and the branded sites are the real board.
  // On those sites `/jobs/search` — the only path that enumerates postings —
  // returns 403 to any client that doesn't present as a browser. Every other
  // path, including individual job pages and /latest-jobs, serves our real
  // User-Agent fine, so the block is aimed squarely at bulk listing.
  //
  // robots.txt reads "Disallow:" (allow everything), but that is a stated
  // policy, not the enforced one; the 403 is what the operator actually does.
  // Reading the search endpoint therefore needs a spoofed browser User-Agent,
  // which is defeating their bot protection, so we don't.
  //
  // Legitimate routes back in, roughly in order of effort:
  //   - ask AHS Recruitment for the syndication feed they already give Indeed
  //     and Google for Jobs, or to allow our User-Agent
  //   - the federal Job Bank XML feed (access application), which carries AHS
  //   - post individual headline roles by hand via /admin/jobs
  //
  // If a feed is granted, add the boards back here and the provider handles it.

  // ── Phenom People ──────────────────────────────────────────────────────────
  // `domain` is the board origin, as with SuccessFactors above.
  {
    provider: 'phenom',
    token: 'city-of-edmonton',
    company: 'City of Edmonton',
    domain: 'recruitment.edmonton.ca',
    logoDomain: 'edmonton.ca',
  },
]

/** Board token → company website, for logo lookup at render time. */
export const BOARD_DOMAINS: Record<string, string> = Object.fromEntries(
  ATS_BOARDS.filter(b => b.logoDomain || b.domain).map(b => [b.token, (b.logoDomain ?? b.domain)!])
)
