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
  atsBoard: string | null
}

/** Employers with at least one open role, most jobs first. */
export async function getCompaniesWithJobs(): Promise<CompanySummary[]> {
  try {
    const { data, error } = await supabase
      .from('jobs')
      .select('company, city, ats_board')
      .eq('status', 'active')
      .limit(5000)
    if (error) {
      console.error('[jobs] getCompaniesWithJobs failed:', error.message)
      return []
    }

    const byCompany = new Map<string, CompanySummary>()
    for (const row of data ?? []) {
      const company = row.company as string
      const existing = byCompany.get(company)
      if (existing) {
        existing.jobCount++
        if (!existing.cities.includes(row.city as JobCity)) existing.cities.push(row.city as JobCity)
      } else {
        byCompany.set(company, {
          company,
          slug: companySlug(company),
          jobCount: 1,
          cities: [row.city as JobCity],
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
 * Matched in memory rather than by a WHERE clause: the slug is derived from the
 * display name, so there is no column to filter on. Fine at this scale, and it
 * keeps the slug and the name from ever drifting apart.
 */
export async function getJobsByCompanySlug(slug: string): Promise<Job[]> {
  try {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('status', 'active')
      .order('posted_at', { ascending: false })
      .limit(5000)
    if (error) {
      console.error('[jobs] getJobsByCompanySlug failed:', error.message)
      return []
    }
    return ((data ?? []) as Job[]).filter(j => companySlug(j.company) === slug)
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
    const { data, error } = await supabase
      .from('jobs')
      .select('city, source, description_html, status, valid_through, ats_provider')
      .eq('status', 'active')
      .limit(5000)
    if (error) {
      console.error('[jobs] getJobCountsByCity failed:', error.message)
      return {}
    }
    const counts: Partial<Record<JobCity, number>> = {}
    for (const row of data ?? []) {
      if (!isIndexableJob(row as Pick<Job, 'source' | 'description_html' | 'status' | 'valid_through' | 'ats_provider'>)) continue
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
 */
export async function getActiveJobSlugs(): Promise<Array<{ slug: string; updated_at: string }>> {
  try {
    const { data, error } = await supabase
      .from('jobs')
      .select('slug, updated_at, valid_through, is_manual, description_html, status')
      .eq('status', 'active')
      .eq('is_manual', true)
      .limit(1000)
    if (error) {
      console.error('[jobs] getActiveJobSlugs failed:', error.message)
      return []
    }
    return (data ?? [])
      .filter(isIndexableJob)
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
