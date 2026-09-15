/**
 * Scheduled newsletter sends.
 *
 * A row in `newsletter_schedules` is one edition queued for one moment.
 * /api/cron/newsletter-scheduled claims due rows and sends them.
 *
 * This puts mail in front of ~1,200 real people without a human present at the
 * moment it goes, so the safeguards here are the whole point of the file:
 *
 *  - The cron NEVER passes `force`. sendCityNewsletter keeps its own 20-hour
 *    minimum-interval guard, and it stays the last line of defence: a schedule
 *    landing too soon after a manual send is recorded as skipped, not mailed.
 *  - Claiming is an atomic status flip, so two overlapping cron ticks cannot
 *    both send the same row. This is the mechanism that the 2026-08-03 incident
 *    (one stray request, 1,032 emails) argues for.
 *  - One pending schedule per edition, enforced by a unique partial index.
 *    A second queued send for the same city is a double-click, not an intent.
 *  - Every outcome is written back to the row, so the admin panel can say what
 *    actually happened rather than assuming it worked.
 */

import { getServiceClient } from '@/lib/supabase-admin'
import { sendCityNewsletter, type SendResult } from '@/lib/newsletter/send-newsletter'
import type { NewsletterCity } from '@/lib/newsletter/template'

export const SCHEDULABLE_CITIES: NewsletterCity[] = [
  'edmonton', 'calgary', 'lethbridge', 'medicine-hat',
  'red-deer', 'grande-prairie', 'fort-mcmurray', 'alberta',
]

/**
 * How far ahead a send may be queued.
 *
 * Purely a typo guard: a mistyped year would otherwise sit in the table
 * indefinitely and fire in 2126.
 */
const MAX_HORIZON_DAYS = 60

/** A schedule must be at least this far out, so "schedule" never means "now". */
const MIN_LEAD_MINUTES = 2

export type ScheduleStatus = 'pending' | 'claimed' | 'sent' | 'cancelled' | 'failed'

export interface NewsletterSchedule {
  id: string
  city: NewsletterCity
  sendAt: string
  customNote: string | null
  status: ScheduleStatus
  createdBy: string | null
  createdAt: string
  sentAt: string | null
  result: SendResult | null
  error: string | null
}

interface ScheduleRow {
  id: string
  city: string
  send_at: string
  custom_note: string | null
  status: string
  created_by: string | null
  created_at: string
  sent_at: string | null
  result: SendResult | null
  error: string | null
}

function toSchedule(row: ScheduleRow): NewsletterSchedule {
  return {
    id: row.id,
    city: row.city as NewsletterCity,
    sendAt: row.send_at,
    customNote: row.custom_note,
    status: row.status as ScheduleStatus,
    createdBy: row.created_by,
    createdAt: row.created_at,
    sentAt: row.sent_at,
    result: row.result,
    error: row.error,
  }
}

const COLUMNS = 'id, city, send_at, custom_note, status, created_by, created_at, sent_at, result, error'

/** Everything queued, plus recent history so the panel can show what happened. */
export async function listSchedules(historyLimit = 20): Promise<{
  pending: NewsletterSchedule[]
  recent: NewsletterSchedule[]
}> {
  const supabase = getServiceClient()

  const [{ data: pending }, { data: recent }] = await Promise.all([
    supabase
      .from('newsletter_schedules')
      .select(COLUMNS)
      .in('status', ['pending', 'claimed'])
      .order('send_at', { ascending: true }),
    supabase
      .from('newsletter_schedules')
      .select(COLUMNS)
      .in('status', ['sent', 'cancelled', 'failed'])
      .order('created_at', { ascending: false })
      .limit(historyLimit),
  ])

  return {
    pending: ((pending || []) as ScheduleRow[]).map(toSchedule),
    recent: ((recent || []) as ScheduleRow[]).map(toSchedule),
  }
}

export type CreateScheduleOutcome =
  | { ok: true; schedule: NewsletterSchedule; replaced: boolean }
  | { ok: false; error: string }

/**
 * Queue a send.
 *
 * Replacing an existing pending schedule for the same city is allowed but
 * deliberate — the caller has to pass `replace`, so the unique index turns a
 * double-click into a visible error instead of a second email.
 */
export async function createSchedule(params: {
  city: string
  sendAt: string
  customNote?: string | null
  createdBy?: string | null
  replace?: boolean
}): Promise<CreateScheduleOutcome> {
  const { city, sendAt, customNote, createdBy, replace } = params

  if (!SCHEDULABLE_CITIES.includes(city as NewsletterCity)) {
    return { ok: false, error: `Not a sendable edition: ${city}` }
  }

  const when = new Date(sendAt)
  if (Number.isNaN(when.getTime())) {
    return { ok: false, error: 'That is not a valid date and time' }
  }

  const minutesOut = (when.getTime() - Date.now()) / 60_000
  if (minutesOut < MIN_LEAD_MINUTES) {
    return {
      ok: false,
      error: `Pick a time at least ${MIN_LEAD_MINUTES} minutes from now — to send right away, use Send.`,
    }
  }
  if (minutesOut > MAX_HORIZON_DAYS * 24 * 60) {
    return { ok: false, error: `That is more than ${MAX_HORIZON_DAYS} days out — check the date.` }
  }

  const supabase = getServiceClient()

  if (replace) {
    // Cancelled rather than deleted: the trail of what was queued and called
    // off is worth more than a tidy table.
    await supabase
      .from('newsletter_schedules')
      .update({ status: 'cancelled', error: 'Replaced by a new schedule' })
      .eq('city', city)
      .eq('status', 'pending')
  }

  const { data, error } = await supabase
    .from('newsletter_schedules')
    .insert({
      city,
      send_at: when.toISOString(),
      custom_note: customNote?.trim() ? customNote.trim() : null,
      created_by: createdBy || null,
      status: 'pending',
    })
    .select(COLUMNS)
    .single()

  if (error) {
    // 23505 is the unique partial index: this city already has one queued.
    if (error.code === '23505') {
      return {
        ok: false,
        error: 'That edition already has a send queued. Cancel it first, or use Reschedule to replace it.',
      }
    }
    console.error('[newsletter-schedule] insert failed:', error.message)
    return { ok: false, error: 'Could not queue that send' }
  }

  return { ok: true, schedule: toSchedule(data as ScheduleRow), replaced: !!replace }
}

/** Call off a queued send. Only a row that has not been claimed yet. */
export async function cancelSchedule(id: string, cancelledBy?: string): Promise<
  { ok: true; schedule: NewsletterSchedule } | { ok: false; error: string }
> {
  const supabase = getServiceClient()

  const { data, error } = await supabase
    .from('newsletter_schedules')
    .update({
      status: 'cancelled',
      error: cancelledBy ? `Cancelled by ${cancelledBy}` : 'Cancelled',
    })
    .eq('id', id)
    .eq('status', 'pending')
    .select(COLUMNS)
    .maybeSingle()

  if (error) {
    console.error('[newsletter-schedule] cancel failed:', error.message)
    return { ok: false, error: 'Could not cancel that send' }
  }
  if (!data) {
    // Either already cancelled, or the cron has it in hand. Once claimed, the
    // mail may already be going out and cancelling would be a lie.
    return { ok: false, error: 'Too late — that send is no longer pending' }
  }

  return { ok: true, schedule: toSchedule(data as ScheduleRow) }
}

/**
 * How many schedules are due right now, without claiming any.
 *
 * For the cron to report a backlog while scheduled sending is unarmed, without
 * touching the rows — so arming the flag later still sends them.
 */
export async function countDueSchedules(): Promise<number> {
  const supabase = getServiceClient()

  const { count, error } = await supabase
    .from('newsletter_schedules')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending')
    .lte('send_at', new Date().toISOString())

  if (error) {
    console.error('[newsletter-schedule] due count failed:', error.message)
    return 0
  }
  return count ?? 0
}

/**
 * Claim one due schedule, atomically.
 *
 * The `status = 'pending'` guard in the UPDATE is the claim: a second worker on
 * the same tick matches nothing and gets null back, so a row is sent once.
 */
async function claimNextDue(): Promise<NewsletterSchedule | null> {
  const supabase = getServiceClient()

  const { data: candidate } = await supabase
    .from('newsletter_schedules')
    .select('id')
    .eq('status', 'pending')
    .lte('send_at', new Date().toISOString())
    .order('send_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!candidate) return null

  const { data: claimed } = await supabase
    .from('newsletter_schedules')
    .update({ status: 'claimed', claimed_at: new Date().toISOString() })
    .eq('id', (candidate as { id: string }).id)
    .eq('status', 'pending')
    .select(COLUMNS)
    .maybeSingle()

  return claimed ? toSchedule(claimed as ScheduleRow) : null
}

export interface RunOutcome {
  id: string
  city: NewsletterCity
  status: 'sent' | 'failed'
  sent: number
  failed: number
  skipped: number
  errors: string[]
}

/**
 * Send everything that is due.
 *
 * `budgetMs` stops a run that would outlast the function: if all eight editions
 * come due at once, the ones that do not fit are left pending and the next tick
 * five minutes later takes them. Late mail beats a request killed halfway
 * through a batch.
 */
export async function runDueSchedules(budgetMs = 200_000): Promise<RunOutcome[]> {
  const startedAt = Date.now()
  const outcomes: RunOutcome[] = []
  const supabase = getServiceClient()

  while (Date.now() - startedAt < budgetMs) {
    const schedule = await claimNextDue()
    if (!schedule) break

    let result: SendResult | null = null
    let failure: string | null = null

    try {
      // No `force`. The 20-hour minimum-interval guard inside sendCityNewsletter
      // stays in force for scheduled sends — if this city was mailed by hand an
      // hour ago, the right outcome is a skip recorded on the row, not a second
      // email to the whole list.
      result = await sendCityNewsletter(schedule.city, {
        customNote: schedule.customNote || undefined,
      })
    } catch (err) {
      failure = err instanceof Error ? err.message : 'Unknown error'
      console.error(`[newsletter-schedule] send threw for ${schedule.city}:`, failure)
    }

    const status: 'sent' | 'failed' = failure ? 'failed' : 'sent'

    await supabase
      .from('newsletter_schedules')
      .update({
        status,
        sent_at: new Date().toISOString(),
        result: result as unknown as Record<string, unknown> | null,
        error: failure,
      })
      .eq('id', schedule.id)

    outcomes.push({
      id: schedule.id,
      city: schedule.city,
      status,
      sent: result?.sent ?? 0,
      failed: result?.failed ?? 0,
      skipped: result?.skipped ?? 0,
      errors: failure ? [failure] : (result?.errors ?? []),
    })
  }

  return outcomes
}
