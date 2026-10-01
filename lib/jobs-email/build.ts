import { getServiceClient } from '@/lib/supabase-admin'
import { scoreJob, hasAnswers, type JobPreferences } from '@/lib/job-matching'
import { JOB_CITIES, JOB_CITY_LABELS, formatSalary, formatClosingDate } from '@/lib/jobs'
import { extractPay, inferEmploymentType } from '@/lib/job-attributes'
import { employmentLabel } from '@/app/jobs/shared'
import type { Job, JobCity } from '@/lib/types/job'

/**
 * Works out who is due a jobs email and what would be in it.
 *
 * Nothing here sends. lib/jobs-email/send.ts does that, and only when armed.
 *
 * Who: active subscribers whose `topics` include 'jobs'. That column is the
 * consent record — each topic is its own CASL express consent — so it is the
 * only thing that puts someone on this list. Saved preferences sharpen what a
 * person is sent; they never add a person.
 *
 * What: postings that reached the board since that person's last jobs email.
 * `created_at` is when our sync first saw the posting, which is the honest
 * meaning of "new" here — `posted_at` is the employer's date and can be weeks
 * old on a posting we only just picked up. Nobody is sent the same job twice,
 * and a person with nothing new is sent nothing.
 */

export type JobsFrequency = 'daily' | 'weekly'

export interface EmailJob {
  id: string
  slug: string
  title: string
  company: string
  city: string
  salaryText: string | null
  /** "New today", "Posted 2 days ago" — the employer's date, relative. */
  ageLabel: string | null
  /** "October 21" when the posting states a deadline. */
  closesLabel: string | null
  /** Why it matched their saved answers; empty when they have none. */
  reasons: string[]
}

export interface JobsEmailRecipient {
  subscriptionId: string
  email: string
  frequency: JobsFrequency
  /** "Edmonton", or "Alberta" when they follow no single city. */
  areaLabel: string
  /** Board path for "see all" — a city page, or the whole board. */
  boardPath: string
  jobs: EmailJob[]
  /** New postings in their area beyond the ones listed. */
  moreCount: number
  /** True when the list was ranked by their saved answers. */
  personalised: boolean
}

export interface JobsEmailPlan {
  recipients: JobsEmailRecipient[]
  subscribers: number
  due: number
  nothingNew: number
  jobsConsidered: number
}

const MAX_JOBS_PER_EMAIL = 10
const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

/** A daily reader is due once 20 hours have passed, weekly once ~7 days have. */
const MIN_GAP_MS: Record<JobsFrequency, number> = {
  daily: 20 * HOUR_MS,
  weekly: 7 * DAY_MS - 4 * HOUR_MS,
}

/** How far back a first email reaches, before there is a last send to count from. */
const FIRST_WINDOW_MS: Record<JobsFrequency, number> = {
  daily: 2 * DAY_MS,
  weekly: 7 * DAY_MS,
}

/** Never reach further back than this, however long someone has gone unmailed. */
const MAX_WINDOW_MS = 14 * DAY_MS

function ageLabel(postedAt: string | null, now: number): string | null {
  if (!postedAt) return null
  const days = Math.floor((now - new Date(postedAt).getTime()) / DAY_MS)
  if (!Number.isFinite(days) || days < 0) return null
  if (days === 0) return 'New today'
  if (days === 1) return 'Posted yesterday'
  if (days <= 30) return `Posted ${days} days ago`
  return null
}

function isJobCity(value: string | null | undefined): value is JobCity {
  return !!value && (JOB_CITIES as string[]).includes(value)
}

export async function buildJobsEmails(
  opts: { now?: Date; onlyEmail?: string; ignoreSchedule?: boolean } = {}
): Promise<JobsEmailPlan> {
  const now = (opts.now ?? new Date()).getTime()
  const supabase = getServiceClient()

  // 1. Who consented.
  let subQuery = supabase
    .from('newsletter_subscriptions')
    .select('id, email, city, jobs_frequency')
    .eq('status', 'active')
    .contains('topics', ['jobs'])
  if (opts.onlyEmail) subQuery = subQuery.ilike('email', opts.onlyEmail)
  const { data: subs, error: subErr } = await subQuery
  if (subErr) throw new Error(`subscriber read failed: ${subErr.message}`)

  const plan: JobsEmailPlan = {
    recipients: [], subscribers: subs?.length ?? 0, due: 0, nothingNew: 0, jobsConsidered: 0,
  }
  if (!subs || subs.length === 0) return plan

  // 2. When each was last mailed.
  const lastSent = new Map<string, number>()
  const { data: logRows, error: logErr } = await supabase
    .from('jobs_email_log')
    .select('subscription_id, sent_at')
    .in('subscription_id', subs.map(s => s.id))
    .order('sent_at', { ascending: false })
  if (logErr) throw new Error(`send log read failed: ${logErr.message}`)
  for (const row of logRows ?? []) {
    if (!lastSent.has(row.subscription_id)) {
      lastSent.set(row.subscription_id, new Date(row.sent_at).getTime())
    }
  }

  const due = subs.filter(s => {
    if (opts.ignoreSchedule) return true
    const last = lastSent.get(s.id)
    const frequency: JobsFrequency = s.jobs_frequency === 'daily' ? 'daily' : 'weekly'
    return last === undefined || now - last >= MIN_GAP_MS[frequency]
  })
  plan.due = due.length
  if (due.length === 0) return plan

  // 3. Everything new enough to matter to anyone, read once.
  const { data: jobRows, error: jobErr } = await supabase
    .from('jobs')
    .select('*')
    .eq('status', 'active')
    .gte('created_at', new Date(now - MAX_WINDOW_MS).toISOString())
    .order('created_at', { ascending: false })
    .limit(3000)
  if (jobErr) throw new Error(`jobs read failed: ${jobErr.message}`)

  const jobs = ((jobRows as Job[]) ?? []).filter(
    j => !j.valid_through || new Date(j.valid_through).getTime() > now
  )
  plan.jobsConsidered = jobs.length

  const shaped = jobs.map(job => {
    const cityLabel = JOB_CITY_LABELS[job.city as JobCity] ?? job.city
    const salaryText = formatSalary(job) || extractPay(job.description_html) || null
    return {
      job,
      seenAt: new Date(job.created_at).getTime(),
      scorable: {
        title: job.title,
        company: job.company,
        city: cityLabel,
        category: job.category || 'Other',
        employmentType: employmentLabel(inferEmploymentType(job.employment_type, job.description_html)) ?? undefined,
        salaryText: salaryText ?? undefined,
      },
      email: {
        id: job.id,
        slug: job.slug,
        title: job.title,
        company: job.company,
        city: cityLabel,
        salaryText,
        ageLabel: ageLabel(job.posted_at, now),
        closesLabel: formatClosingDate(job.valid_through),
        reasons: [] as string[],
      } satisfies EmailJob,
    }
  })

  // 4. Saved answers, for the subscribers who are also members.
  const prefsByEmail = await loadPreferencesByEmail(due.map(s => s.email))

  for (const sub of due) {
    const frequency: JobsFrequency = sub.jobs_frequency === 'daily' ? 'daily' : 'weekly'
    const last = lastSent.get(sub.id)
    const windowStart = Math.max(
      last ?? now - FIRST_WINDOW_MS[frequency],
      now - MAX_WINDOW_MS
    )

    const prefs = prefsByEmail.get(sub.email.trim().toLowerCase()) ?? null
    const personalised = hasAnswers(prefs)

    // Their area: the cities they named in their answers, else the city they
    // signed up with, else the whole province.
    const cities: JobCity[] =
      prefs && prefs.cities.length > 0 ? prefs.cities
      : isJobCity(sub.city) ? [sub.city]
      : []

    const inArea = shaped.filter(
      s => s.seenAt > windowStart && (cities.length === 0 || cities.includes(s.job.city as JobCity))
    )
    if (inArea.length === 0) {
      plan.nothingNew++
      continue
    }

    let ranked: EmailJob[]
    if (personalised && prefs) {
      const scored = inArea.map(s => ({ s, result: scoreJob(s.scorable, prefs) }))
      // Matches first, best first; the rest of what's new in their area fills
      // any room left, so a narrow set of answers doesn't mean an empty email.
      scored.sort((a, b) =>
        Number(b.result.qualifies) - Number(a.result.qualifies) ||
        b.result.score - a.result.score ||
        b.s.seenAt - a.s.seenAt
      )
      ranked = scored.map(({ s, result }) => ({
        ...s.email,
        reasons: result.qualifies ? result.reasons : [],
      }))
    } else {
      // No answers to rank by: postings that state pay first — it is what
      // people most want to know — then newest.
      ranked = [...inArea]
        .sort((a, b) =>
          Number(!!b.email.salaryText) - Number(!!a.email.salaryText) || b.seenAt - a.seenAt
        )
        .map(s => s.email)
    }

    // One employer posting thirty roles in a day shouldn't be the whole email.
    const perCompany = new Map<string, number>()
    const picked: EmailJob[] = []
    for (const job of ranked) {
      const count = perCompany.get(job.company) ?? 0
      if (count >= 3) continue
      perCompany.set(job.company, count + 1)
      picked.push(job)
      if (picked.length === MAX_JOBS_PER_EMAIL) break
    }

    plan.recipients.push({
      subscriptionId: sub.id,
      email: sub.email.trim(),
      frequency,
      areaLabel: cities.length === 1 ? JOB_CITY_LABELS[cities[0]] : 'Alberta',
      boardPath: cities.length === 1 ? `/jobs/${cities[0]}` : '/jobs',
      jobs: picked,
      moreCount: inArea.length - picked.length,
      personalised,
    })
  }

  return plan
}

/**
 * Saved job answers keyed by lower-cased email.
 *
 * job_preferences is keyed by user id and the list by email, so this reads the
 * auth users once to join them. A subscriber with no account simply has none.
 */
async function loadPreferencesByEmail(emails: string[]): Promise<Map<string, JobPreferences>> {
  const out = new Map<string, JobPreferences>()
  const wanted = new Set(emails.map(e => e.trim().toLowerCase()))
  if (wanted.size === 0) return out

  const supabase = getServiceClient()
  const idToEmail = new Map<string, string>()
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw new Error(`auth user read failed: ${error.message}`)
    for (const u of data.users) {
      const email = u.email?.toLowerCase()
      if (email && wanted.has(email)) idToEmail.set(u.id, email)
    }
    if (data.users.length < 1000) break
  }
  if (idToEmail.size === 0) return out

  const { data: rows, error } = await supabase
    .from('job_preferences')
    .select('user_id, cities, categories, employment_types, keywords, salary_min')
    .in('user_id', [...idToEmail.keys()])
  if (error) throw new Error(`job_preferences read failed: ${error.message}`)

  for (const row of rows ?? []) {
    const email = idToEmail.get(row.user_id)
    if (!email) continue
    out.set(email, {
      cities: ((row.cities ?? []) as string[]).filter(isJobCity),
      categories: row.categories ?? [],
      employmentTypes: row.employment_types ?? [],
      keywords: row.keywords ?? [],
      salaryMin: row.salary_min ?? null,
      emailMatches: true,
      dismissedAt: null,
    })
  }
  return out
}
