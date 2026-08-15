import { getServiceClient } from '@/lib/supabase-admin'
import { scoreJob, hasAnswers, type JobPreferences } from '@/lib/job-matching'
import { JOB_CITY_LABELS, formatSalary } from '@/lib/jobs'
import { extractPay, inferEmploymentType } from '@/lib/job-attributes'
import { employmentLabel } from '@/app/jobs/shared'
import type { Job, JobCity } from '@/lib/types/job'

/**
 * Works out which new postings each opted-in user would be mailed.
 *
 * This builds the contents only — nothing here sends anything, and nothing
 * calls a send route. Scoring goes through lib/job-matching so a job that
 * shows as a match on the board is the same job that would land in the email;
 * two scoring rules would eventually disagree and the email would be wrong.
 *
 * Service role, because it reads every opted-in user's row rather than one.
 */

export interface DigestJob {
  slug: string
  title: string
  company: string
  city: string
  salaryText: string | null
  postedAt: string | null
  /** Why it matched, for the "because you said" line in the email. */
  reasons: string[]
  score: number
}

export interface DigestRecipient {
  userId: string
  email: string
  jobs: DigestJob[]
}

const DEFAULT_SINCE_DAYS = 7
const DEFAULT_MAX_PER_USER = 10

export async function buildJobsDigest(
  opts: { sinceDays?: number; maxPerUser?: number } = {}
): Promise<{ recipients: DigestRecipient[]; optedIn: number; jobsConsidered: number }> {
  const sinceDays = opts.sinceDays ?? DEFAULT_SINCE_DAYS
  const maxPerUser = opts.maxPerUser ?? DEFAULT_MAX_PER_USER
  const supabase = getServiceClient()

  const { data: prefRows, error: prefErr } = await supabase
    .from('job_preferences')
    .select('user_id, cities, categories, employment_types, keywords, salary_min, email_matches')
    .eq('email_matches', true)

  if (prefErr) throw new Error(`job_preferences read failed: ${prefErr.message}`)
  const optedIn = prefRows?.length ?? 0
  if (optedIn === 0) return { recipients: [], optedIn: 0, jobsConsidered: 0 }

  const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000).toISOString()
  const { data: jobRows, error: jobErr } = await supabase
    .from('jobs')
    .select('*')
    .eq('status', 'active')
    .gte('posted_at', since)
    .order('posted_at', { ascending: false })
    .limit(1000)

  if (jobErr) throw new Error(`jobs read failed: ${jobErr.message}`)
  const jobs = (jobRows as Job[]) ?? []

  // Shape once, not once per user — the board's display fields are what the
  // scorer compares against.
  const scorable = jobs.map(j => ({
    job: j,
    shape: {
      title: j.title,
      company: j.company,
      city: JOB_CITY_LABELS[j.city as JobCity] ?? j.city,
      category: j.category || 'Other',
      employmentType: employmentLabel(inferEmploymentType(j.employment_type, j.description_html)) ?? undefined,
      salaryText: formatSalary(j) || extractPay(j.description_html) || undefined,
    },
  }))

  const recipients: DigestRecipient[] = []

  for (const row of prefRows ?? []) {
    const prefs: JobPreferences = {
      cities: (row.cities ?? []) as JobCity[],
      categories: row.categories ?? [],
      employmentTypes: row.employment_types ?? [],
      keywords: row.keywords ?? [],
      salaryMin: row.salary_min ?? null,
      emailMatches: true,
      dismissedAt: null,
    }
    // Consent without answers would mean "mail me everything", which is not
    // what the box says. No answers, no email.
    if (!hasAnswers(prefs)) continue

    const matched: DigestJob[] = []
    for (const { job, shape } of scorable) {
      const result = scoreJob(shape, prefs)
      if (!result.qualifies) continue
      matched.push({
        slug: job.slug,
        title: job.title,
        company: job.company,
        city: shape.city,
        salaryText: shape.salaryText ?? null,
        postedAt: job.posted_at,
        reasons: result.reasons,
        score: result.score,
      })
    }
    if (matched.length === 0) continue

    matched.sort((a, b) => b.score - a.score || (b.postedAt || '').localeCompare(a.postedAt || ''))

    // The address comes from the auth record rather than being stored a second
    // time on job_preferences — one source of truth for where a user's mail
    // goes, and nothing to keep in sync when they change it.
    const { data: authUser } = await supabase.auth.admin.getUserById(row.user_id)
    const email = authUser?.user?.email
    if (!email) continue

    recipients.push({ userId: row.user_id, email, jobs: matched.slice(0, maxPerUser) })
  }

  return { recipients, optedIn, jobsConsidered: jobs.length }
}
