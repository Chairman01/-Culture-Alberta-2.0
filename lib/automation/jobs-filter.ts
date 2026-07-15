/**
 * Values filter for job listings — jobs-specific counterpart of
 * lib/automation/content-filter.ts (which is tuned for events and blocks
 * music-festival terms that are fine in a jobs context).
 *
 * Blocks roles/employers centred on alcohol, gambling, cannabis, nightlife,
 * or adult entertainment. Ordinary restaurant/retail/hospitality roles pass.
 */

import { JobUpsertRow } from '@/lib/types/job'

// Matched with word boundaries against title + company + category + snippet.
// Multi-word phrases match as phrases.
const JOBS_BLOCKED_KEYWORDS: string[] = [
  // Gambling
  'casino',
  'gambling',
  'betting',
  'sportsbook',
  'lottery',
  'bingo hall',
  'slot machine',
  'poker room',
  // Alcohol-centred businesses & roles
  'bartender',
  'bartending',
  'nightclub',
  'night club',
  'liquor store',
  'liquor depot',
  'brewery',
  'brewing company',
  'distillery',
  'winery',
  'wine bar',
  'cocktail bar',
  'sports bar',
  'pub server',
  'sommelier',
  'brewmaster',
  // Cannabis / vape
  'cannabis',
  'dispensary',
  'marijuana',
  'vape shop',
  'budtender',
  // Adult entertainment
  'adult entertainment',
  'strip club',
  'exotic dancer',
]

// If one of these matches, the job passes even when a blocked keyword hit
// (guards against boundary-adjacent false positives).
const JOBS_ALLOWED_EXCEPTIONS: string[] = [
  'barista',
  'barrister',
  'juice bar',
  'salad bar',
  'snack bar',
  'coffee bar',
]

const blockedPatterns = JOBS_BLOCKED_KEYWORDS.map(
  k => new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
)

export interface JobsFilterResult<T> {
  kept: T[]
  blocked: Array<{ title: string; company: string; matched: string }>
}

export function isJobBlocked(job: Pick<JobUpsertRow, 'title' | 'company' | 'category' | 'description_snippet'>): string | null {
  const text = [job.title, job.company, job.category ?? '', job.description_snippet ?? '']
    .join(' ')
    .toLowerCase()

  // Exceptions only rescue on the job title — an exception phrase buried in a
  // description (e.g. a casino ad mentioning its "snack bar") must not pass.
  const title = job.title.toLowerCase()
  if (JOBS_ALLOWED_EXCEPTIONS.some(ex => title.includes(ex))) return null

  for (let i = 0; i < blockedPatterns.length; i++) {
    if (blockedPatterns[i].test(text)) return JOBS_BLOCKED_KEYWORDS[i]
  }
  return null
}

/** Filters jobs; returns both kept rows and an auditable blocked list. */
export function filterJobs<T extends Pick<JobUpsertRow, 'title' | 'company' | 'category' | 'description_snippet'>>(
  jobs: T[]
): JobsFilterResult<T> {
  const kept: T[] = []
  const blocked: JobsFilterResult<T>['blocked'] = []

  for (const job of jobs) {
    const matched = isJobBlocked(job)
    if (matched) {
      blocked.push({ title: job.title, company: job.company, matched })
    } else {
      kept.push(job)
    }
  }

  if (blocked.length > 0) {
    console.log(`[jobs-filter] Removed ${blocked.length} job(s) from ${jobs.length} total`)
  }
  return { kept, blocked }
}
