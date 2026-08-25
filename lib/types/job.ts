export type JobCity =
  | 'calgary'
  | 'edmonton'
  | 'red-deer'
  | 'lethbridge'
  | 'medicine-hat'
  | 'grande-prairie'
  | 'fort-mcmurray'

export type JobSource = 'adzuna' | 'manual' | 'jobbank' | 'ats'

/** Applicant tracking systems whose public boards we read. */
export type AtsProvider =
  | 'greenhouse' | 'lever' | 'ashby' | 'workable' | 'workday'
  | 'successfactors' | 'phenom' | 'oracle' | 'otss'
  | 'peopleadmin' | 'cadient' | 'hrsmart' | 'avanti' | 'talentbrew' | 'rss' | 'mhc'

export type JobStatus = 'active' | 'expired' | 'draft'

export interface Job {
  id: string
  source: JobSource
  source_id: string | null
  title: string
  slug: string
  company: string
  city: JobCity
  location_raw: string | null
  category: string | null
  description_snippet: string | null
  description_html: string | null
  salary_min: number | null
  salary_max: number | null
  salary_label: string | null
  employment_type: string | null
  apply_url: string
  source_url: string | null
  posted_at: string | null
  valid_through: string | null
  last_seen_at: string | null
  status: JobStatus
  is_manual: boolean
  is_featured: boolean
  /** Which ATS this came from; null for aggregator and manual rows. */
  ats_provider: AtsProvider | null
  /** Board token it was ingested from, e.g. "cenovus". */
  ats_board: string | null
  created_at: string
  updated_at: string
}

/** Row shape for inserts/upserts from the sync pipeline (id/slug generated separately). */
export interface JobUpsertRow {
  source: JobSource
  source_id: string
  title: string
  company: string
  city: JobCity
  location_raw?: string | null
  category?: string | null
  description_snippet?: string | null
  /** Full description. ATS and manual rows only — this is what makes a page indexable. */
  description_html?: string | null
  ats_provider?: AtsProvider | null
  ats_board?: string | null
  salary_min?: number | null
  salary_max?: number | null
  salary_label?: string | null
  employment_type?: string | null
  apply_url: string
  source_url?: string | null
  posted_at?: string | null
  valid_through?: string | null
}

/**
 * Where a tracked job sits in the user's own pipeline.
 *
 * 'started' is what clicking Apply actually proves: the employer's form opened
 * in a new tab. We never see whether it was submitted, so the posting page asks
 * on the next visit and only then promotes the row to 'applied'. Statuses past
 * 'applied' are set by the user on /account.
 */
export type SavedJobStatus =
  | 'saved' | 'started' | 'applied' | 'interviewing' | 'offer' | 'rejected'

/**
 * Ranked so a status is never silently downgraded — clicking Apply again on a
 * job already marked 'interviewing' must not knock it back to 'started'.
 */
export const SAVED_JOB_STATUS_RANK: Record<SavedJobStatus, number> = {
  saved: 0,
  started: 1,
  applied: 2,
  interviewing: 3,
  offer: 4,
  rejected: 5,
}

export interface SavedJob {
  id: string
  user_id: string
  job_id: string
  status: SavedJobStatus
  notes: string | null
  created_at: string
  updated_at: string
}
