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

export type SavedJobStatus = 'saved' | 'applied' | 'interviewing' | 'offer' | 'rejected'

export interface SavedJob {
  id: string
  user_id: string
  job_id: string
  status: SavedJobStatus
  notes: string | null
  created_at: string
  updated_at: string
}
