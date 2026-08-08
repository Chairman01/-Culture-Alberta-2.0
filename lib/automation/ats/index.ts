/**
 * Tier-2 ingest: read employers' own ATS boards, keep the Alberta postings.
 *
 * What makes these different from the aggregator feed they replace:
 *   - full descriptions, so the pages are original content Google will index
 *   - apply_url points at the employer's own application form, not a rival
 *     job board that re-captures the candidate
 *   - the board is the employer's complete list, so a posting's absence is
 *     proof it closed. Aggregator absence proved nothing (we only ever saw the
 *     first 150 results), which is why that sync needed a 3-day grace period.
 */

import { JobCity, JobUpsertRow } from '@/lib/types/job'
import { ATS_BOARDS, AtsBoard } from './boards'
import { fetchBoard, RawPosting } from './providers'
import { matchJobCities } from './location'
import { extractClosingDate, extractPay } from '@/lib/job-attributes'

export interface AtsFetchResult {
  rows: JobUpsertRow[]
  /** Per-board counts, so a silently-dead board is visible in the sync report. */
  boards: Array<{ board: string; provider: string; fetched: number; alberta: number; error?: string }>
}

/**
 * Cities a posting belongs to, honouring any site-name aliases the board
 * declares.
 *
 * Aliases are a last resort, in this order:
 *   1. the location text itself, which is what nearly every board states
 *   2. a city named in the job title — NAIT posts a Calgary-based contract
 *      role against "Main Campus", and the title is the only thing that says so
 *   3. the board's own site-name aliases
 */
function resolveCities(board: AtsBoard, location: string, title = ''): JobCity[] {
  const direct = matchJobCities(location)
  if (direct.length > 0) return direct
  if (!board.locationAliases?.length) return []

  const fromTitle = matchJobCities(title)
  if (fromTitle.length > 0) return fromTitle

  for (const { pattern, city } of board.locationAliases) {
    if (pattern.test(location)) return [city]
  }
  return []
}

/** Cheap pre-filter for the providers that pay a detail request per candidate row. */
function looksAlberta(board: AtsBoard): (location: string) => boolean {
  return location => resolveCities(board, location).length > 0
}

/** Plain-text lead-in for cards and meta descriptions. */
function toSnippet(html: string, max = 280): string | null {
  const text = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
  if (!text) return null
  return text.length <= max ? text : `${text.slice(0, max).replace(/\s+\S*$/, '')}…`
}

function toRows(posting: RawPosting, board: AtsBoard, city: JobCity): JobUpsertRow {
  return {
    source: 'ats',
    // Unique across every provider and board — all ATS rows share source='ats',
    // and two providers can easily hand out the same numeric id. The city is
    // part of the key because one posting can serve several of our cities and
    // becomes one row per city, which would otherwise collide on (source, source_id).
    source_id: `${board.provider}:${board.token}:${posting.id}:${city}`,
    title: posting.title,
    company: board.company,
    city,
    location_raw: posting.location || null,
    category: null,
    description_snippet: toSnippet(posting.descriptionHtml),
    description_html: posting.descriptionHtml || null,
    salary_min: null,
    salary_max: null,
    // Provider-supplied pay first; otherwise read the labelled figure out of the
    // description. Without this, employers who state pay in the body (the City
    // of Edmonton states it on most postings) rendered a rate on the page but
    // stayed invisible to the "Pay listed" filter.
    salary_label: posting.salaryLabel ?? extractPay(posting.descriptionHtml),
    employment_type: posting.employmentType,
    apply_url: posting.applyUrl,
    source_url: posting.applyUrl,
    posted_at: posting.postedAt,
    // Most ATS feeds carry no expiry — the board itself is the source of truth,
    // and sync expires anything that leaves it. Two sources beat that default:
    // a real field where the provider returns one (Oracle Recruiting Cloud),
    // then a closing date printed in the body (the Government of Alberta does
    // this on every posting). Either makes the posting drop out on its real
    // deadline and gives the JobPosting markup a genuine validThrough.
    valid_through: posting.validThrough ?? extractClosingDate(posting.descriptionHtml),
    ats_provider: board.provider,
    ats_board: board.token,
  }
}

/**
 * Fetch every configured board. Boards are independent: one failing employer
 * must not stop the rest, and a board that errors is reported rather than
 * treated as "this employer has no openings" — that distinction decides
 * whether the sync is allowed to expire their existing rows.
 */
export async function fetchAtsJobs(boards: AtsBoard[] = ATS_BOARDS): Promise<AtsFetchResult> {
  const rows: JobUpsertRow[] = []
  const report: AtsFetchResult['boards'] = []

  for (const board of boards) {
    try {
      const postings = await fetchBoard(board, looksAlberta(board))
      let alberta = 0

      for (const posting of postings) {
        if (!posting.title || !posting.applyUrl) continue
        // A description is the entire value of tier 2 — a row without one is
        // just an aggregator listing wearing a better apply link.
        if (!posting.descriptionHtml.trim()) continue

        // One posting can legitimately serve several cities.
        for (const city of resolveCities(board, posting.location, posting.title)) {
          rows.push(toRows(posting, board, city))
          alberta++
        }
      }

      report.push({ board: board.token, provider: board.provider, fetched: postings.length, alberta })
    } catch (err) {
      report.push({
        board: board.token,
        provider: board.provider,
        fetched: 0,
        alberta: 0,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  return { rows, boards: report }
}

export { ATS_BOARDS } from './boards'
export type { AtsBoard } from './boards'
