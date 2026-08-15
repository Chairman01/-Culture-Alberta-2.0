'use client'

import { supabaseBrowser } from '@/lib/supabase-browser'
import type { JobPreferences } from '@/lib/job-matching'
import type { JobCity } from '@/lib/types/job'

/**
 * Browser access to public.job_preferences (RLS: own row only).
 *
 * The scoring rules live in lib/job-matching.ts, with no client dependency, so
 * the server-side digest can score exactly the way the board does. Re-exported
 * here so callers have one import.
 */

export {
  EMPTY_PREFERENCES, hasAnswers, scoreJob, parseAnnualPay,
} from '@/lib/job-matching'
export type { JobPreferences, ScorableJob, MatchResult } from '@/lib/job-matching'

export async function getJobPreferences(): Promise<JobPreferences | null> {
  const { data, error } = await supabaseBrowser
    .from('job_preferences')
    .select('cities, categories, employment_types, keywords, salary_min, email_matches, dismissed_at')
    .maybeSingle()

  if (error || !data) return null

  return {
    cities: (data.cities ?? []) as JobCity[],
    categories: data.categories ?? [],
    employmentTypes: data.employment_types ?? [],
    keywords: data.keywords ?? [],
    salaryMin: data.salary_min ?? null,
    emailMatches: !!data.email_matches,
    dismissedAt: data.dismissed_at ?? null,
  }
}

/**
 * Upsert the user's row. Partial: a dismissal writes only dismissed_at and
 * leaves any answers already given alone.
 */
export async function saveJobPreferences(
  userId: string,
  patch: Partial<JobPreferences>
): Promise<void> {
  const row: Record<string, unknown> = { user_id: userId, updated_at: new Date().toISOString() }
  if (patch.cities !== undefined) row.cities = patch.cities
  if (patch.categories !== undefined) row.categories = patch.categories
  if (patch.employmentTypes !== undefined) row.employment_types = patch.employmentTypes
  if (patch.keywords !== undefined) row.keywords = patch.keywords
  if (patch.salaryMin !== undefined) row.salary_min = patch.salaryMin
  if (patch.emailMatches !== undefined) row.email_matches = patch.emailMatches
  if (patch.dismissedAt !== undefined) row.dismissed_at = patch.dismissedAt

  const { error } = await supabaseBrowser
    .from('job_preferences')
    .upsert(row, { onConflict: 'user_id' })
  if (error) throw error
}
