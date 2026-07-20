/**
 * Adzuna job-search API client.
 *
 * Docs: https://developer.adzuna.com/ (country code `ca`)
 * Free tier: 25 hits/min, 250/day — our daily sync uses ~6 calls total.
 *
 * ToS requirements honoured elsewhere in the app:
 *  - "Jobs by Adzuna" attribution badge on pages displaying this data
 *    (components/jobs/adzuna-attribution.tsx)
 *  - apply links always go through Adzuna's redirect_url
 *
 * Env: ADZUNA_APP_ID, ADZUNA_APP_KEY. Without keys the fetcher returns []
 * (sync reports the error); local dev can use the checked-in fixture.
 */

import { JobCity, JobUpsertRow } from '@/lib/types/job'

const ADZUNA_BASE = 'https://api.adzuna.com/v1/api/jobs/ca/search'
const RESULTS_PER_PAGE = 50
const MAX_DAYS_OLD = 30
const FETCH_TIMEOUT_MS = 15_000

interface AdzunaResult {
  id: string | number
  title?: string
  description?: string
  created?: string
  company?: { display_name?: string }
  location?: { display_name?: string; area?: string[] }
  category?: { label?: string; tag?: string }
  salary_min?: number
  salary_max?: number
  salary_is_predicted?: string | number
  redirect_url?: string
  contract_time?: string // full_time | part_time
  contract_type?: string // permanent | contract
}

interface AdzunaResponse {
  results?: AdzunaResult[]
  count?: number
}

const CITY_QUERY: Record<JobCity, string> = {
  calgary: 'Calgary, Alberta',
  edmonton: 'Edmonton, Alberta',
}

/** Strip Adzuna's <strong> keyword-highlight tags and collapse whitespace. */
function cleanText(text: string): string {
  return text.replace(/<\/?strong>/gi, '').replace(/\s+/g, ' ').trim()
}

function mapEmploymentType(r: AdzunaResult): string | null {
  if (r.contract_time === 'full_time') return 'FULL_TIME'
  if (r.contract_time === 'part_time') return 'PART_TIME'
  if (r.contract_type === 'contract') return 'CONTRACT'
  return null
}

export function mapAdzunaToJobRow(r: AdzunaResult, city: JobCity): JobUpsertRow | null {
  const title = r.title ? cleanText(r.title) : ''
  const applyUrl = r.redirect_url || ''
  if (!title || !applyUrl || r.id === undefined || r.id === null) return null

  const postedAt = r.created ? new Date(r.created) : new Date()
  // Adzuna doesn't expose an expiry — assume 30 days from posting
  const validThrough = new Date(postedAt.getTime() + 30 * 24 * 60 * 60 * 1000)

  const predicted = String(r.salary_is_predicted ?? '0') === '1'
  const salaryMin = typeof r.salary_min === 'number' && r.salary_min > 0 ? r.salary_min : null
  const salaryMax = typeof r.salary_max === 'number' && r.salary_max > 0 ? r.salary_max : null

  return {
    source: 'adzuna',
    source_id: String(r.id),
    title,
    company: r.company?.display_name?.trim() || 'Confidential employer',
    city,
    location_raw: r.location?.display_name || null,
    category: r.category?.label?.replace(/\s+Jobs$/i, '') || null,
    description_snippet: r.description ? cleanText(r.description) : null,
    salary_min: salaryMin,
    salary_max: salaryMax,
    // Employer-stated salaries are shown as-is; Adzuna's predictions get an
    // "Est." prefix so readers can tell the two apart.
    salary_label: buildSalaryLabel(salaryMin, salaryMax, predicted),
    employment_type: mapEmploymentType(r),
    apply_url: applyUrl,
    source_url: applyUrl,
    posted_at: postedAt.toISOString(),
    valid_through: validThrough.toISOString(),
  }
}

/**
 * Human-readable pay label. Adzuna returns annualised figures for most postings
 * but hourly rates for some, so treat anything under 200 as an hourly rate —
 * the same heuristic JobPostingStructuredData uses for schema.org unitText.
 * Returns null when there is no salary, so `salary_label IS NOT NULL` stays a
 * reliable "pay listed" test for the board's filter.
 */
function buildSalaryLabel(min: number | null, max: number | null, predicted: boolean): string | null {
  const value = max || min
  if (!value) return null

  const hourly = value < 200
  const fmt = (n: number) =>
    hourly ? `$${n.toFixed(2).replace(/\.00$/, '')}` : `$${Math.round(n).toLocaleString('en-CA')}`
  const unit = hourly ? 'an hour' : 'a year'
  const prefix = predicted ? 'Est. ' : ''

  if (min && max && min !== max) return `${prefix}${fmt(min)}–${fmt(max)} ${unit}`
  return `${prefix}${fmt(value)} ${unit}`
}

/**
 * Fetch recent jobs for one city from Adzuna (up to `pages` × 50 results).
 * Returns [] and logs when keys are missing or the API fails — sync treats
 * a fully-empty fetch as an error and does NOT expire existing rows.
 */
export async function fetchAdzunaJobs(city: JobCity, pages = 3): Promise<JobUpsertRow[]> {
  const appId = process.env.ADZUNA_APP_ID
  const appKey = process.env.ADZUNA_APP_KEY
  if (!appId || !appKey) {
    console.warn('[adzuna] ADZUNA_APP_ID / ADZUNA_APP_KEY not set — skipping fetch')
    return []
  }

  const rows: JobUpsertRow[] = []

  for (let page = 1; page <= pages; page++) {
    const params = new URLSearchParams({
      app_id: appId,
      app_key: appKey,
      where: CITY_QUERY[city],
      results_per_page: String(RESULTS_PER_PAGE),
      max_days_old: String(MAX_DAYS_OLD),
      sort_by: 'date',
    })
    const url = `${ADZUNA_BASE}/${page}?${params}`

    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
      if (!res.ok) {
        console.warn(`[adzuna] ${city} page ${page}: HTTP ${res.status} — stopping`)
        break
      }
      const data: AdzunaResponse = await res.json()
      const results = data.results ?? []
      for (const r of results) {
        const row = mapAdzunaToJobRow(r, city)
        if (row) rows.push(row)
      }
      if (results.length < RESULTS_PER_PAGE) break // last page
    } catch (err) {
      console.warn(`[adzuna] ${city} page ${page} failed:`, err instanceof Error ? err.message : err)
      break
    }
  }

  console.log(`[adzuna] ${city}: fetched ${rows.length} jobs`)
  return rows
}

/**
 * Local-dev fixture (never used in production): realistic sample rows so the
 * pipeline and pages can be built/verified before Adzuna keys exist.
 */
export async function fetchFixtureJobs(city: JobCity): Promise<JobUpsertRow[]> {
  const fixture = (await import('./fixtures/adzuna-sample.json')).default as AdzunaResult[][]
  const [calgaryRows, edmontonRows] = fixture
  const source = city === 'calgary' ? calgaryRows : edmontonRows
  return source
    .map(r => mapAdzunaToJobRow(r, city))
    .filter((r): r is JobUpsertRow => r !== null)
}
