import { getServiceClient } from '@/lib/supabase-admin'
import { normalizeEmail, exactEmailPattern } from '@/lib/newsletter/subscriber-email'
import type { JobsFrequency } from './build'

/**
 * One person's jobs-email setting: on or off, and how often.
 *
 * Consent is the 'jobs' entry in newsletter_subscriptions.topics. Everything
 * here is called with an address the caller has already proven is theirs — a
 * signed-in session, or the token from an email sent to that address — so it
 * can only ever change the caller's own subscription.
 */

export interface JobsSubscription {
  id: string
  email: string
  subscribed: boolean
  frequency: JobsFrequency
}

export function isJobsFrequency(value: unknown): value is JobsFrequency {
  return value === 'daily' || value === 'weekly'
}

type Row = { id: string; email: string; status: string; topics: string[] | null; jobs_frequency: string | null }

function toSubscription(row: Row): JobsSubscription {
  return {
    id: row.id,
    email: row.email,
    subscribed: row.status === 'active' && (row.topics ?? []).includes('jobs'),
    frequency: row.jobs_frequency === 'daily' ? 'daily' : 'weekly',
  }
}

const COLUMNS = 'id, email, status, topics, jobs_frequency'

export async function getJobsSubscriptionByEmail(email: string): Promise<JobsSubscription | null> {
  const { data } = await getServiceClient()
    .from('newsletter_subscriptions')
    .select(COLUMNS)
    .ilike('email', exactEmailPattern(email))
    .order('status', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  return data ? toSubscription(data as Row) : null
}

export async function getJobsSubscriptionById(id: string, email: string): Promise<JobsSubscription | null> {
  const { data } = await getServiceClient()
    .from('newsletter_subscriptions')
    .select(COLUMNS)
    .eq('id', id)
    .eq('email', email)
    .maybeSingle()
  return data ? toSubscription(data as Row) : null
}

/**
 * Turn the jobs email on at the given frequency, creating the row if needed.
 *
 * Returns null for an address that has hard-bounced: mailing it again only
 * damages delivery for everyone else, so it is never re-added.
 */
export async function startJobsEmail(opts: {
  email: string
  frequency: JobsFrequency
  city: string
  signupSource?: string
  signupPath?: string
}): Promise<JobsSubscription | null> {
  const supabase = getServiceClient()
  const email = normalizeEmail(opts.email)
  const now = new Date().toISOString()

  const { data: bounced } = await supabase
    .from('newsletter_email_events')
    .select('id')
    .eq('email', email)
    .eq('event_type', 'bounced')
    .limit(1)
    .maybeSingle()
  if (bounced) return null

  const { data: existing } = await supabase
    .from('newsletter_subscriptions')
    .select(COLUMNS)
    .ilike('email', exactEmailPattern(email))
    .order('status', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (existing) {
    const row = existing as Row
    // An unsubscribed row comes back for jobs alone: they left every list, and
    // this is consent to this one, not to the newsletter they dropped.
    const topics = row.status === 'active'
      ? Array.from(new Set([...(row.topics ?? ['culture']), 'jobs']))
      : ['jobs']
    const { data, error } = await supabase
      .from('newsletter_subscriptions')
      .update({ status: 'active', topics, jobs_frequency: opts.frequency, updated_at: now })
      .eq('id', row.id)
      .select(COLUMNS)
      .single()
    if (error) throw new Error(error.message)
    return toSubscription(data as Row)
  }

  const { data, error } = await supabase
    .from('newsletter_subscriptions')
    .insert({
      email,
      city: opts.city,
      status: 'active',
      topics: ['jobs'],
      jobs_frequency: opts.frequency,
      signup_source: opts.signupSource ?? 'jobs',
      signup_path: opts.signupPath ?? null,
      created_at: now,
    })
    .select(COLUMNS)
    .single()
  if (error) throw new Error(error.message)
  return toSubscription(data as Row)
}

/** Change how often, for someone already on the jobs email. */
export async function setJobsFrequency(id: string, frequency: JobsFrequency): Promise<void> {
  const { error } = await getServiceClient()
    .from('newsletter_subscriptions')
    .update({ jobs_frequency: frequency, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

/** Stop the jobs email only. Dropping their last list unsubscribes the row. */
export async function stopJobsEmail(id: string): Promise<void> {
  const supabase = getServiceClient()
  const { data } = await supabase
    .from('newsletter_subscriptions')
    .select('topics')
    .eq('id', id)
    .maybeSingle()
  if (!data) return
  const remaining = ((data.topics ?? []) as string[]).filter(t => t !== 'jobs')
  const now = new Date().toISOString()
  const { error } = await supabase
    .from('newsletter_subscriptions')
    .update(remaining.length > 0 ? { topics: remaining, updated_at: now } : { status: 'unsubscribed', updated_at: now })
    .eq('id', id)
  if (error) throw new Error(error.message)
}
