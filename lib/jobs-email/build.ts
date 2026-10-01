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

/** A job the member is already tracking that needs something from them. */
export interface TrackerItem {
  jobId: string
  slug: string
  title: string
  company: string
  /** "October 3" — set for closing-soon items. */
  closesLabel: string | null
}

export interface TrackerSummary {
  /** Saved or started, not yet applied, and the posting closes within days. */
  closingSoon: TrackerItem[]
  /** Clicked Apply at least a day ago and never said they finished. */
  unfinished: TrackerItem[]
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
  /** What their own tracker needs from them; null for non-members or nothing due. */
  tracker: TrackerSummary | null
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

/** A tracked job counts as closing soon inside this window. */
const CLOSING_SOON_MS = 3 * DAY_MS
const MAX_TRACKER_ITEMS = 3

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
    .select('subscription_id, sent_at, job_ids')
    .in('subscription_id', subs.map(s => s.id))
    .order('sent_at', { ascending: false })
  if (logErr) throw new Error(`send log read failed: ${logErr.message}`)
  // Every job id a person has already been mailed about, new or reminder, so a
  // closing-soon nudge goes out once and not every morning until the deadline.
  const alreadyMailed = new Map<string, Set<string>>()
  for (const row of logRows ?? []) {
    if (!lastSent.has(row.subscription_id)) {
      lastSent.set(row.subscription_id, new Date(row.sent_at).getTime())
    }
    const seen = alreadyMailed.get(row.subscription_id) ?? new Set<string>()
    for (const id of (row.job_ids ?? []) as string[]) seen.add(id)
    alreadyMailed.set(row.subscription_id, seen)
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
  const { prefsByEmail, userIdByEmail } = await loadMembers(due.map(s => s.email))
  const trackerByUser = await loadTrackers([...userIdByEmail.values()], now)

  for (const sub of due) {
    const frequency: JobsFrequency = sub.jobs_frequency === 'daily' ? 'daily' : 'weekly'
    const last = lastSent.get(sub.id)
    const windowStart = Math.max(
      last ?? now - FIRST_WINDOW_MS[frequency],
      now - MAX_WINDOW_MS
    )

    const emailKey = sub.email.trim().toLowerCase()
    const prefs = prefsByEmail.get(emailKey) ?? null
    const userId = userIdByEmail.get(emailKey)
    const fullTracker = userId ? trackerByUser.get(userId) ?? null : null
    const mailed = alreadyMailed.get(sub.id)
    // A deadline they have not been told about yet is worth an email on its
    // own; an unfinished application only rides along with one.
    const freshDeadlines = (fullTracker?.closingSoon ?? []).filter(t => !mailed?.has(t.jobId))
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
    if (inArea.length === 0 && freshDeadlines.length === 0) {
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
      tracker: fullTracker && (fullTracker.closingSoon.length > 0 || fullTracker.unfinished.length > 0)
        ? fullTracker
        : null,
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
async function loadMembers(emails: string[]): Promise<{
  prefsByEmail: Map<string, JobPreferences>
  userIdByEmail: Map<string, string>
}> {
  const out = new Map<string, JobPreferences>()
  const userIdByEmail = new Map<string, string>()
  const wanted = new Set(emails.map(e => e.trim().toLowerCase()))
  if (wanted.size === 0) return { prefsByEmail: out, userIdByEmail }

  const supabase = getServiceClient()
  const idToEmail = new Map<string, string>()
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw new Error(`auth user read failed: ${error.message}`)
    for (const u of data.users) {
      const email = u.email?.toLowerCase()
      if (email && wanted.has(email)) {
        idToEmail.set(u.id, email)
        userIdByEmail.set(email, u.id)
      }
    }
    if (data.users.length < 1000) break
  }
  if (idToEmail.size === 0) return { prefsByEmail: out, userIdByEmail }

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
  return { prefsByEmail: out, userIdByEmail }
}

/**
 * What each member's own tracker needs from them.
 *
 * This is the reason to open the email even on a day with few new postings: a
 * job they saved is about to close, or they clicked Apply and never came back
 * to say whether they finished.
 */
async function loadTrackers(userIds: string[], now: number): Promise<Map<string, TrackerSummary>> {
  const out = new Map<string, TrackerSummary>()
  if (userIds.length === 0) return out

  const supabase = getServiceClient()
  const { data: saved, error } = await supabase
    .from('saved_jobs')
    .select('user_id, job_id, status, created_at')
    .in('user_id', userIds)
    .in('status', ['saved', 'started'])
  if (error) throw new Error(`saved_jobs read failed: ${error.message}`)
  if (!saved || saved.length === 0) return out

  const { data: jobRows, error: jobErr } = await supabase
    .from('jobs')
    .select('id, slug, title, company, status, valid_through')
    .in('id', [...new Set(saved.map(s => s.job_id))])
  if (jobErr) throw new Error(`tracked jobs read failed: ${jobErr.message}`)
  const jobById = new Map((jobRows ?? []).map(j => [j.id, j]))

  for (const row of saved) {
    const job = jobById.get(row.job_id)
    if (!job || job.status !== 'active') continue
    const closes = job.valid_through ? new Date(job.valid_through).getTime() : null
    if (closes !== null && closes < now) continue

    const summary = out.get(row.user_id) ?? { closingSoon: [], unfinished: [] }
    const item: TrackerItem = {
      jobId: job.id, slug: job.slug, title: job.title, company: job.company,
      closesLabel: formatClosingDate(job.valid_through),
    }
    if (closes !== null && closes - now <= CLOSING_SOON_MS) {
      if (summary.closingSoon.length < MAX_TRACKER_ITEMS) summary.closingSoon.push(item)
    } else if (row.status === 'started' && now - new Date(row.created_at).getTime() >= DAY_MS) {
      if (summary.unfinished.length < MAX_TRACKER_ITEMS) summary.unfinished.push(item)
    }
    out.set(row.user_id, summary)
  }
  return out
}
