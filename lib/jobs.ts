import { supabase } from './supabase'
import { createSlug } from './utils/slug'
import { Job, JobCity } from './types/job'

/**
 * Read-side data access for the jobs board (anon key + RLS: active/expired only).
 * Writes happen in lib/automation/jobs-sync.ts (service role) and the admin API.
 */

export const JOB_CITIES: JobCity[] = [
  'calgary',
  'edmonton',
  'red-deer',
  'lethbridge',
  'medicine-hat',
  'grande-prairie',
  'fort-mcmurray',
]

export const JOB_CITY_LABELS: Record<JobCity, string> = {
  calgary: 'Calgary',
  edmonton: 'Edmonton',
  'red-deer': 'Red Deer',
  lethbridge: 'Lethbridge',
  'medicine-hat': 'Medicine Hat',
  'grande-prairie': 'Grande Prairie',
  'fort-mcmurray': 'Fort McMurray',
}

/**
 * Minimum postings carrying a full description before a city page is published.
 *
 * The gate is about substance, not volume. It started as a raw count of five,
 * which was the wrong measure: a page holding one complete job description plus
 * city-specific context is not the same animal as the aggregator pages Google
 * refused to crawl, which carried a 250-character snippet duplicated across
 * every site running the same feed.
 *
 * So the test is "does this page say anything a crawler can't get elsewhere",
 * and one genuine posting clears it. A city with nothing but empty state still
 * doesn't.
 */
export const CITY_PAGE_MIN_INDEXABLE_JOBS = 1

export function isJobCity(value: string): value is JobCity {
  return (JOB_CITIES as string[]).includes(value)
}

/**
 * Slug for a new job posting: title + company + short unique suffix.
 * Generated ONCE at insert and never regenerated — slug churn resets SEO.
 */
export function buildJobSlug(title: string, company: string): string {
  const base = `${createSlug(title)}-${createSlug(company)}`.slice(0, 80).replace(/-+$/, '')
  const suffix = crypto.randomUUID().slice(0, 8)
  return `${base}-${suffix}`
}

/**
 * Whether a posting is original content worth submitting to Google.
 *
 * Aggregator rows carry a ~250-character snippet that is byte-identical to the
 * same snippet on every other site running the feed, so Google declines to
 * crawl them — 219 of the 223 URLs in the 2026-08-02 "Discovered, currently not
 * indexed" export were exactly these pages. Only postings we own (an employer
 * wrote the full description for us) are unique enough to index, and only they
 * can carry valid JobPosting markup, which requires a full description.
 *
 * Single source of truth for sitemap inclusion, the robots meta tag and the
 * structured data, so the three can never drift apart.
 */
export function isIndexableJob(
  job: Pick<Job, 'source' | 'description_html' | 'status' | 'valid_through'> &
    Partial<Pick<Job, 'ats_provider'>>
): boolean {
  // The test is "do we hold a full description we're entitled to publish", not
  // who typed it. Manual postings are ours; ATS rows come from the employer's
  // own public board and carry their full text. Aggregator rows have neither.
  if (job.source !== 'manual' && job.source !== 'ats') return false
  if (!job.description_html) return false
  // Cadient boards are rolling candidate pools, not vacancies: no requisition,
  // no posting date, no deadline, and one entry standing in for every store
  // that will take an application. They are worth browsing and they are honest
  // about what they are, but a pool is not a job opening — JobPosting markup on
  // one would misrepresent it to Google. Browsable, not indexable.
  if (job.ats_provider === 'cadient') return false
  if (job.status !== 'active') return false
  if (job.valid_through && new Date(job.valid_through).getTime() < Date.now()) return false
  return true
}

/**
 * Every active job row, in pages.
 *
 * PostgREST answers with at most 1,000 rows however large a `.limit()` you ask
 * for, and says nothing about the truncation. Four callers here asked for
 * `.limit(5000)`, read like they wanted the lot, and quietly saw the first
 * thousand of 1,397 — which is why five employers were missing from the
 * sitemap and their pages came back empty. Anything that must see every
 * posting pages through this instead.
 *
 * Ordered by id because `range()` needs a stable sort to page over; posted_at
 * is nullable and would shuffle rows between pages.
 */
const ROW_PAGE_SIZE = 1000

async function selectAllActiveJobs<T>(
  columns: string,
  refine?: (q: any) => any
): Promise<T[]> {
  const out: T[] = []
  for (let page = 0; ; page++) {
    let query = supabase
      .from('jobs')
      .select(columns)
      .eq('status', 'active')
      .order('id', { ascending: true })
      .range(page * ROW_PAGE_SIZE, (page + 1) * ROW_PAGE_SIZE - 1)
    if (refine) query = refine(query)

    const { data, error } = await query
    if (error) {
      console.error('[jobs] selectAllActiveJobs failed:', error.message)
      break
    }
    if (!data || data.length === 0) break
    out.push(...(data as T[]))
    if (data.length < ROW_PAGE_SIZE) break
  }
  return out
}

/**
 * The columns isIndexableJob reads, minus the description itself.
 *
 * Descriptions average 7.5KB and the whole board is over 10MB of them. The
 * indexability test only asks whether one is present, so presence is settled in
 * SQL and the bytes are never transferred — a count of eligible city postings
 * has no reason to download every job ad in Alberta.
 */
type IndexableCheckRow = Pick<Job, 'source' | 'ats_provider' | 'status' | 'valid_through'>

const hasDescription = (q: any) => q.not('description_html', 'is', null)

/** Re-attaches what the SQL filter already proved, so isIndexableJob stays the
 *  single place the rules live. */
const withDescription = <T extends IndexableCheckRow>(row: T) =>
  ({ ...row, description_html: 'present' })

/** Active jobs, featured/manual first, newest first. */
export async function getActiveJobs(opts: { city?: JobCity; limit?: number } = {}): Promise<Job[]> {
  try {
    let query = supabase
      .from('jobs')
      .select('*')
      .eq('status', 'active')
      .order('is_featured', { ascending: false })
      .order('posted_at', { ascending: false, nullsFirst: false })
      .limit(opts.limit ?? 500)

    if (opts.city) query = query.eq('city', opts.city)

    const { data, error } = await query
    if (error) {
      console.error('[jobs] getActiveJobs failed:', error.message)
      return []
    }
    return (data as Job[]) ?? []
  } catch (err) {
    console.error('[jobs] getActiveJobs error:', err)
    return []
  }
}

/** Single job by slug — returns expired jobs too (page decides banner/noindex). */
export async function getJobBySlug(slug: string): Promise<Job | null> {
  try {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('slug', slug)
      .maybeSingle()
    if (error) {
      console.error('[jobs] getJobBySlug failed:', error.message)
      return null
    }
    return (data as Job) ?? null
  } catch (err) {
    console.error('[jobs] getJobBySlug error:', err)
    return null
  }
}

/**
 * URL slug for an employer. Derived rather than stored: company names arrive
 * from the ATS feeds and can be corrected in the board registry, and a stored
 * slug would then disagree with the name on screen.
 */
export function companySlug(company: string): string {
  return createSlug(company)
}

export interface CompanySummary {
  company: string
  slug: string
  jobCount: number
  cities: JobCity[]
  /**
   * Open roles per city. `jobCount` is the province-wide total, which reads as
   * a lie once the directory is filtered to one city — Costco's 128 openings
   * are spread over six of them. The directory shows this count instead
   * whenever a city is selected.
   */
  cityCounts: Partial<Record<JobCity, number>>
  atsBoard: string | null
}

/** Employers with at least one open role, most jobs first. */
export async function getCompaniesWithJobs(): Promise<CompanySummary[]> {
  try {
    const data = await selectAllActiveJobs<{ company: string; city: string; ats_board: string | null }>(
      'company, city, ats_board'
    )

    const byCompany = new Map<string, CompanySummary>()
    for (const row of data ?? []) {
      const company = row.company as string
      const city = row.city as JobCity
      const existing = byCompany.get(company)
      if (existing) {
        existing.jobCount++
        existing.cityCounts[city] = (existing.cityCounts[city] ?? 0) + 1
        if (!existing.cities.includes(city)) existing.cities.push(city)
      } else {
        byCompany.set(company, {
          company,
          slug: companySlug(company),
          jobCount: 1,
          cities: [city],
          cityCounts: { [city]: 1 },
          atsBoard: (row.ats_board as string) ?? null,
        })
      }
    }
    return [...byCompany.values()].sort((a, b) => b.jobCount - a.jobCount)
  } catch (err) {
    console.error('[jobs] getCompaniesWithJobs error:', err)
    return []
  }
}

/**
 * All open roles at one employer, looked up by slug.
 *
 * The slug is derived from the display name, so there is no column to filter
 * on directly. Resolving the name first and then querying for it keeps that
 * property while reading two small results instead of every active row —
 * pulling `*` for the whole board meant ~10MB of description HTML on every
 * company page render, and, capped at 1,000 rows, an empty page for any
 * employer whose postings fell outside the first thousand.
 */
export async function getJobsByCompanySlug(slug: string): Promise<Job[]> {
  try {
    const names = await selectAllActiveJobs<{ company: string }>('company')
    const match = names.find(r => companySlug(r.company) === slug)
    if (!match) return []

    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('status', 'active')
      .eq('company', match.company)
      .order('posted_at', { ascending: false, nullsFirst: false })
      .limit(ROW_PAGE_SIZE)
    if (error) {
      console.error('[jobs] getJobsByCompanySlug failed:', error.message)
      return []
    }
    return (data ?? []) as Job[]
  } catch (err) {
    console.error('[jobs] getJobsByCompanySlug error:', err)
    return []
  }
}

/**
 * Other open roles at the same employer. Someone reading one posting is the
 * likeliest applicant for the rest, and it keeps them on the board instead of
 * leaving to search the employer's own careers site.
 */
export async function getMoreJobsAtCompany(
  company: string,
  excludeId: string,
  limit = 5
): Promise<Job[]> {
  try {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('company', company)
      .eq('status', 'active')
      .neq('id', excludeId)
      .order('posted_at', { ascending: false })
      .limit(limit)
    if (error) {
      console.error('[jobs] getMoreJobsAtCompany failed:', error.message)
      return []
    }
    return (data ?? []) as Job[]
  } catch (err) {
    console.error('[jobs] getMoreJobsAtCompany error:', err)
    return []
  }
}

/**
 * Per-city count of postings that carry a full description — the measure that
 * decides whether a city page is offered to Google. See CITY_PAGE_MIN_INDEXABLE_JOBS.
 */
export async function getJobCountsByCity(): Promise<Partial<Record<JobCity, number>>> {
  try {
    const rows = await selectAllActiveJobs<IndexableCheckRow & { city: string }>(
      'city, source, ats_provider, status, valid_through',
      hasDescription
    )
    const counts: Partial<Record<JobCity, number>> = {}
    for (const row of rows) {
      if (!isIndexableJob(withDescription(row))) continue
      const city = row.city as JobCity
      counts[city] = (counts[city] ?? 0) + 1
    }
    return counts
  } catch (err) {
    console.error('[jobs] getJobCountsByCity error:', err)
    return {}
  }
}

/**
 * Slugs for the sitemap: non-expired postings we own.
 *
 * Aggregator postings are deliberately excluded — see isIndexableJob. They stay
 * live and browsable on /jobs, they just aren't offered to Google.
 *
 * This returned nothing at all for as long as it has existed, so the sitemap
 * carried zero job postings against 1,269 eligible ones. Two faults stacked:
 * the select omitted `source`, so isIndexableJob's first test — is this manual
 * or ATS — read `undefined` and rejected every row; and `.eq('is_manual', true)`
 * predates ATS ingestion and would have thrown away the other 1,250 postings
 * even if the rows had been complete. isIndexableJob is the policy; this query
 * has no business restating a stricter version of it.
 */
export async function getActiveJobSlugs(): Promise<Array<{ slug: string; updated_at: string }>> {
  try {
    const rows = await selectAllActiveJobs<
      IndexableCheckRow & { slug: string; updated_at: string }
    >('slug, updated_at, source, ats_provider, status, valid_through', hasDescription)

    return rows
      .filter(r => isIndexableJob(withDescription(r)))
      .map(j => ({ slug: j.slug, updated_at: j.updated_at }))
  } catch (err) {
    console.error('[jobs] getActiveJobSlugs error:', err)
    return []
  }
}

/** Human salary label, e.g. "$65,000–$80,000 a year" or the source's own label. */
export function formatSalary(job: Pick<Job, 'salary_min' | 'salary_max' | 'salary_label'>): string | null {
  if (job.salary_label) return job.salary_label
  const fmt = (n: number) =>
    n >= 1000
      ? `$${Math.round(n).toLocaleString('en-CA')}`
      : `$${n.toFixed(2)}`
  if (job.salary_min && job.salary_max && job.salary_min !== job.salary_max) {
    const unit = job.salary_max < 200 ? ' an hour' : ' a year'
    return `${fmt(job.salary_min)}–${fmt(job.salary_max)}${unit}`
  }
  const single = job.salary_min || job.salary_max
  if (single) {
    const unit = single < 200 ? ' an hour' : ' a year'
    return `${fmt(single)}${unit}`
  }
  return null
}

/** True when the job is past its valid_through date or marked expired. */
export function isJobExpired(job: Pick<Job, 'status' | 'valid_through'>): boolean {
  if (job.status === 'expired') return true
  if (job.valid_through && new Date(job.valid_through).getTime() < Date.now()) return true
  return false
}
