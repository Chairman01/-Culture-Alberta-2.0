export type JobCity = 'calgary' | 'edmonton'

export type JobSource = 'adzuna' | 'manual' | 'jobbank'

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
