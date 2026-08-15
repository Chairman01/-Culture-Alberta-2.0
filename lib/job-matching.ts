import { JOB_CITY_LABELS } from '@/lib/jobs'
import type { JobCity } from '@/lib/types/job'

/**
 * What a user says they're looking for, and how a posting scores against it.
 *
 * Deliberately free of any Supabase client so both sides can use it: the board
 * scores 500 rows in the browser, and the digest builder scores the same way on
 * the server. One scoring rule, so the email can never disagree with the board
 * about what "fits" means.
 *
 * Cities are slugs, not the labels shown on the board — the server has no
 * reason to reverse a display string.
 */

export interface JobPreferences {
  cities: JobCity[]
  categories: string[]
  employmentTypes: string[]
  keywords: string[]
  salaryMin: number | null
  emailMatches: boolean
  dismissedAt: string | null
}

export const EMPTY_PREFERENCES: JobPreferences = {
  cities: [],
  categories: [],
  employmentTypes: [],
  keywords: [],
  salaryMin: null,
  emailMatches: false,
  dismissedAt: null,
}

/** True when the user has actually said something we can match on. */
export function hasAnswers(p: JobPreferences | null): boolean {
  if (!p) return false
  return (
    p.cities.length > 0 ||
    p.categories.length > 0 ||
    p.employmentTypes.length > 0 ||
    p.keywords.length > 0 ||
    p.salaryMin !== null
  )
}

/** The subset of a posting the scorer reads. */
export interface ScorableJob {
  title: string
  company: string
  /** Display label, as shown on the board. */
  city: string
  category: string
  employmentType?: string
  salaryText?: string
}

export interface MatchResult {
  score: number
  /** Short labels for the "why" line, e.g. ["Edmonton", "Full-time"]. */
  reasons: string[]
  /** Clears every stated hard criterion — what "only show matches" filters on. */
  qualifies: boolean
}

const WEIGHTS = { city: 3, category: 3, employment: 2, keyword: 2, pay: 1 }

/**
 * Best-effort annual figure from a pay string like "$25.00/hour" or
 * "$80,000 - $95,000 a year".
 *
 * Deliberately conservative: it reads the FIRST number, which is the bottom of
 * a range, and returns null the moment it is unsure. Pay is scored, never
 * filtered on, so a misread costs a couple of points of sort order and cannot
 * hide a job from anyone.
 */
export function parseAnnualPay(text: string | undefined): number | null {
  if (!text) return null
  const m = text.replace(/,/g, '').match(/\$?\s*(\d{2,7}(?:\.\d+)?)/)
  if (!m) return null
  const n = Number(m[1])
  if (!Number.isFinite(n) || n <= 0) return null
  const hourly = /hour|hr\b|\/h\b/i.test(text)
  if (hourly) return Math.round(n * 2080)
  // A bare figure under 1,000 in a pay field is an hourly rate that forgot to
  // say so, not a $400 salary.
  if (n < 1000) return Math.round(n * 2080)
  return Math.round(n)
}

export function scoreJob(job: ScorableJob, prefs: JobPreferences): MatchResult {
  const reasons: string[] = []
  let score = 0
  let qualifies = true

  if (prefs.cities.length > 0) {
    const labels = prefs.cities.map(c => JOB_CITY_LABELS[c] ?? c)
    if (labels.includes(job.city)) {
      score += WEIGHTS.city
      reasons.push(job.city)
    } else {
      qualifies = false
    }
  }

  if (prefs.categories.length > 0) {
    if (prefs.categories.includes(job.category)) {
      score += WEIGHTS.category
      reasons.push(job.category)
    } else {
      qualifies = false
    }
  }

  if (prefs.employmentTypes.length > 0) {
    if (job.employmentType && prefs.employmentTypes.includes(job.employmentType)) {
      score += WEIGHTS.employment
      reasons.push(job.employmentType)
    } else {
      qualifies = false
    }
  }

  // Keywords rank, they do not gate.
  //
  // City, category and hours are picked from values the board actually holds,
  // so requiring them is safe. Keywords are free text — "admin", a job title
  // that only appears as "Administrative Assistant", a typo — and ANDing them
  // with the other three is how someone ends up staring at "0 of 500 match
  // what you told us". A keyword miss now costs sort position instead of
  // hiding the job.
  if (prefs.keywords.length > 0) {
    const haystack = `${job.title} ${job.company}`.toLowerCase()
    const hits = prefs.keywords.filter(k => k && haystack.includes(k.toLowerCase()))
    if (hits.length > 0) {
      score += WEIGHTS.keyword * hits.length
      reasons.push(...hits)
    }
  }

  // Pay is a bonus, never a gate — see parseAnnualPay.
  if (prefs.salaryMin !== null) {
    const annual = parseAnnualPay(job.salaryText)
    if (annual !== null && annual >= prefs.salaryMin) {
      score += WEIGHTS.pay
      reasons.push('Pay')
    }
  }

  return { score, reasons, qualifies }
}
