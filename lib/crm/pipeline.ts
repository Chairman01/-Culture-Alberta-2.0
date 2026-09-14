/**
 * The pipeline engine — everything that happens to a lead without anyone
 * clicking anything.
 *
 * Deliberately split from the routes so the daily cron, the admin UI and the
 * (future) Zoho reply poller all advance a lead the same way. A lead's state
 * is only ever changed through these functions, which is what keeps the
 * lead_events audit trail complete.
 *
 * The one rule the whole design rests on: a reply cancels everything. Nothing
 * is more damaging to a live conversation than the day-8 bump arriving after
 * someone already answered, so recordReply() clears the schedule and voids
 * pending drafts before it does anything else.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { isLastStep, renderStep, stepDelay } from './sequences'

/** Stages that are finished — never sequenced, never chased. */
const TERMINAL_STAGES = ['won', 'lost', 'declined']
/** Tiers we never send commercial email to. */
const UNSEQUENCED_TIERS = ['decline', 'no_budget']

export type LeadRow = {
  id: string
  company: string
  contact_name: string | null
  email: string | null
  city: string | null
  category: string | null
  tier: string
  stage: string
  sequence_key: string | null
  sequence_step: number
  next_action_on: string | null
  consent_basis: string | null
  unsubscribed_at: string | null
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function addDays(days: number): string {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

async function logEvent(
  supabase: SupabaseClient,
  leadId: string,
  type: string,
  body: string,
  meta?: Record<string, unknown>,
) {
  await supabase.from('lead_events').insert({ lead_id: leadId, type, body, meta: meta ?? null })
}

/**
 * Finds every lead due today and queues one drafted email each.
 *
 * Idempotent by construction: lead_drafts has a unique partial index on
 * (lead_id) where status = 'pending', so a second run in the same day inserts
 * nothing rather than stacking duplicates. Running it twice is safe.
 */
export async function generateDueDrafts(
  supabase: SupabaseClient,
  options: { dryRun?: boolean } = {},
): Promise<{ queued: number; skipped: Array<{ company: string; reason: string }> }> {
  const { data: leads, error } = await supabase
    .from('leads')
    .select(
      'id, company, contact_name, email, city, category, tier, stage, sequence_key, sequence_step, next_action_on, consent_basis, unsubscribed_at',
    )
    .lte('next_action_on', today())
    .not('sequence_key', 'is', null)
    .not('stage', 'in', `(${TERMINAL_STAGES.join(',')})`)
    .order('next_action_on', { ascending: true })
    .limit(100)

  if (error) throw new Error(`loading due leads: ${error.message}`)

  const skipped: Array<{ company: string; reason: string }> = []
  let queued = 0

  for (const lead of (leads ?? []) as LeadRow[]) {
    if (lead.unsubscribed_at) {
      skipped.push({ company: lead.company, reason: 'Unsubscribed' })
      continue
    }
    if (UNSEQUENCED_TIERS.includes(lead.tier)) {
      skipped.push({ company: lead.company, reason: `Tier "${lead.tier}" is never emailed` })
      continue
    }
    if (!lead.email) {
      skipped.push({ company: lead.company, reason: 'No email address' })
      continue
    }
    // CASL: an unestablished basis is a hard stop, not a warning. The admin
    // sets it once in the UI and the lead flows from the next run.
    if (!lead.consent_basis) {
      skipped.push({ company: lead.company, reason: 'No consent basis recorded' })
      continue
    }

    const rendered = renderStep(lead.sequence_key!, lead.sequence_step, {
      id: lead.id,
      company: lead.company,
      contactName: lead.contact_name,
      city: lead.city,
      category: lead.category,
    })

    // Sequence exhausted. Park the lead rather than leaving it due forever.
    if (!rendered) {
      if (!options.dryRun) {
        await supabase
          .from('leads')
          .update({ next_action_on: null, updated_at: new Date().toISOString() })
          .eq('id', lead.id)
      }
      skipped.push({ company: lead.company, reason: 'Sequence complete' })
      continue
    }

    if (options.dryRun) {
      queued += 1
      continue
    }

    const { error: insertError } = await supabase.from('lead_drafts').insert({
      lead_id: lead.id,
      sequence_key: lead.sequence_key,
      step: lead.sequence_step,
      subject: rendered.subject,
      body: rendered.body,
      status: 'pending',
    })

    if (insertError) {
      // 23505 is the one-pending-draft guard doing its job on a re-run.
      if (insertError.code === '23505') {
        skipped.push({ company: lead.company, reason: 'Already has a draft waiting' })
        continue
      }
      throw new Error(`queueing draft for ${lead.company}: ${insertError.message}`)
    }

    queued += 1
  }

  return { queued, skipped }
}

/**
 * Moves a lead onto the next step of its cadence and schedules it.
 *
 * Separate from recordSent because skipping a step has to advance the lead
 * too: leave the step where it was and the generator rebuilds the same email
 * tomorrow, and the same one gets skipped again the day after, forever.
 *
 * `touched` is false for a skip — nothing was actually sent, so
 * last_contacted_at and the stage must not move.
 */
export async function advanceSequence(
  supabase: SupabaseClient,
  lead: { id: string; sequence_key: string; step: number },
  options: { touched: boolean },
): Promise<void> {
  const now = new Date().toISOString()
  const nextStep = lead.step + 1
  const finished = isLastStep(lead.sequence_key, lead.step)
  const delay = finished ? null : stepDelay(lead.sequence_key, nextStep)

  await supabase
    .from('leads')
    .update({
      sequence_step: nextStep,
      // A finished sequence leaves the lead in the pipeline but off the
      // schedule — it shows in the digest as awaiting a decision, not as due.
      next_action_on: delay === null ? null : addDays(delay),
      ...(options.touched ? { last_contacted_at: now, stage: 'contacted' } : {}),
      updated_at: now,
    })
    .eq('id', lead.id)
}

/**
 * Called after a draft has actually left the mail server. Advances the lead to
 * the next step and schedules it; if that was the last step the lead stops
 * being due and waits for a human.
 */
export async function recordSent(
  supabase: SupabaseClient,
  draftId: string,
  meta: { zohoMessageId?: string } = {},
): Promise<void> {
  const { data: draft, error } = await supabase
    .from('lead_drafts')
    .select('id, lead_id, sequence_key, step, subject')
    .eq('id', draftId)
    .single()

  if (error || !draft) throw new Error(`draft ${draftId} not found`)

  const now = new Date().toISOString()
  await supabase
    .from('lead_drafts')
    .update({ status: 'sent', sent_at: now, zoho_message_id: meta.zohoMessageId ?? null })
    .eq('id', draftId)

  await advanceSequence(
    supabase,
    { id: draft.lead_id, sequence_key: draft.sequence_key, step: draft.step },
    { touched: true },
  )

  await logEvent(supabase, draft.lead_id, 'email_sent', draft.subject, {
    step: draft.step,
    sequence: draft.sequence_key,
  })
}

/**
 * A reply landed. Stops the machine immediately.
 *
 * Voiding pending drafts matters as much as clearing the schedule: a draft
 * already sitting in the approval queue would otherwise be approved by hand
 * the next morning and sent into a live conversation.
 */
export async function recordReply(
  supabase: SupabaseClient,
  leadId: string,
  summary: string,
  meta: Record<string, unknown> = {},
): Promise<void> {
  const now = new Date().toISOString()

  await supabase
    .from('lead_drafts')
    .update({ status: 'skipped', send_error: 'Cancelled — lead replied' })
    .eq('lead_id', leadId)
    .eq('status', 'pending')

  const { data: lead } = await supabase.from('leads').select('stage').eq('id', leadId).single()
  // Never drag a lead backwards: someone already at proposal or won stays there.
  const stage = lead && ['proposal', 'won', 'lost', 'declined'].includes(lead.stage) ? lead.stage : 'engaged'

  await supabase
    .from('leads')
    .update({ last_reply_at: now, next_action_on: null, stage, updated_at: now })
    .eq('id', leadId)

  await logEvent(supabase, leadId, 'reply_received', summary, meta)
}

export type Digest = {
  due: Array<{ id: string; company: string; subject: string; step: number; draftId: string }>
  replied: Array<{ id: string; company: string; when: string }>
  awaiting: Array<{ id: string; company: string; stage: string; days: number }>
  blocked: Array<{ company: string; reason: string }>
}

/**
 * Everything the 7am email needs, in one place so the cron and the admin page
 * cannot drift apart on what "due" means.
 */
export async function buildDigest(supabase: SupabaseClient): Promise<Digest> {
  const [{ data: drafts }, { data: replied }, { data: stalled }] = await Promise.all([
    supabase
      .from('lead_drafts')
      .select('id, lead_id, subject, step, leads(company)')
      .eq('status', 'pending')
      .order('created_at', { ascending: true }),
    supabase
      .from('leads')
      .select('id, company, last_reply_at')
      .not('last_reply_at', 'is', null)
      .gte('last_reply_at', new Date(Date.now() - 3 * 864e5).toISOString())
      .order('last_reply_at', { ascending: false }),
    // In play, on nobody's schedule, untouched for a fortnight. These are the
    // deals that quietly die, so they get their own section.
    supabase
      .from('leads')
      .select('id, company, stage, updated_at')
      .in('stage', ['contacted', 'engaged', 'proposal'])
      .is('next_action_on', null)
      .lt('updated_at', new Date(Date.now() - 14 * 864e5).toISOString())
      .order('updated_at', { ascending: true })
      .limit(20),
  ])

  return {
    due: (drafts ?? []).map((draft: any) => ({
      draftId: draft.id,
      id: draft.lead_id,
      company: draft.leads?.company ?? 'Unknown',
      subject: draft.subject,
      step: draft.step,
    })),
    replied: (replied ?? []).map((lead: any) => ({
      id: lead.id,
      company: lead.company,
      when: lead.last_reply_at,
    })),
    awaiting: (stalled ?? []).map((lead: any) => ({
      id: lead.id,
      company: lead.company,
      stage: lead.stage,
      days: Math.floor((Date.now() - new Date(lead.updated_at).getTime()) / 864e5),
    })),
    blocked: [],
  }
}
