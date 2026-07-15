import { supabase } from './supabase'
import { createSlug } from './utils/slug'
import { Job, JobCity } from './types/job'

/**
 * Read-side data access for the jobs board (anon key + RLS: active/expired only).
 * Writes happen in lib/automation/jobs-sync.ts (service role) and the admin API.
 */

export const JOB_CITIES: JobCity[] = ['calgary', 'edmonton']

export const JOB_CITY_LABELS: Record<JobCity, string> = {
  calgary: 'Calgary',
  edmonton: 'Edmonton',
}

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

/** Slugs of non-expired jobs for the sitemap. */
export async function getActiveJobSlugs(): Promise<Array<{ slug: string; updated_at: string }>> {
  try {
    const { data, error } = await supabase
      .from('jobs')
      .select('slug, updated_at, valid_through')
      .eq('status', 'active')
      .limit(1000)
    if (error) {
      console.error('[jobs] getActiveJobSlugs failed:', error.message)
      return []
    }
    const now = Date.now()
    return (data ?? [])
      .filter(j => !j.valid_through || new Date(j.valid_through).getTime() > now)
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
