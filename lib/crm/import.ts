/**
 * Turning parsed rows into leads.
 *
 * Shared by the CSV paste, the Google Sheets sync and the daily cron, so all
 * three qualify, dedupe and record consent identically. When the sheet sync
 * and the CSV import disagree about whether a row is a link seller, the bug is
 * not in either caller.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { ImportRow } from './csv'
import { guessConsentBasis, qualifyLead } from './qualify'

export type ImportOutcome = {
  company: string
  email: string | null
  action: 'import' | 'duplicate' | 'decline' | 'no_consent'
  tier: string
  reason: string
}

export type ImportSummary = {
  parsed: number
  willImport: number
  needConsent: number
  declined: number
  duplicates: number
}

export type ImportResult = {
  summary: ImportSummary
  outcomes: ImportOutcome[]
  inserted: number
}

/**
 * `dryRun` writes nothing and is what the preview uses. Always run it before
 * the real thing: an import that guesses wrong about 400 rows is not something
 * to discover afterwards.
 */
export async function importRows(
  supabase: SupabaseClient,
  rows: ImportRow[],
  options: { source: string; actor: string; dryRun: boolean },
): Promise<ImportResult> {
  // One read of existing addresses beats a per-row existence check; the unique
  // index on lower(email) is still the real guard behind it.
  const { data: existing } = await supabase.from('leads').select('email').not('email', 'is', null)
  const seen = new Set((existing ?? []).map(row => (row.email || '').toLowerCase()))

  const outcomes: ImportOutcome[] = []
  const toInsert: Record<string, unknown>[] = []
  const today = new Date().toISOString().slice(0, 10)

  for (const row of rows) {
    const email = row.email ? row.email.toLowerCase().trim() : null

    // Catches rows already in the database and the same address twice in one file.
    if (email && seen.has(email)) {
      outcomes.push({
        company: row.company,
        email,
        action: 'duplicate',
        tier: '—',
        reason: 'Already in the pipeline',
      })
      continue
    }
    if (email) seen.add(email)

    const qualified = qualifyLead({
      company: row.company,
      email,
      website: row.website,
      notes: row.notes,
    })
    const consent = guessConsentBasis({ source: options.source, email, website: row.website })
    const declined = qualified.sequenceKey === null

    outcomes.push({
      company: row.company,
      email,
      action: qualified.tier === 'decline' ? 'decline' : consent.basis ? 'import' : 'no_consent',
      tier: qualified.tier,
      reason: qualified.reason,
    })

    toInsert.push({
      company: row.company,
      contact_name: row.contact_name,
      email,
      phone: row.phone,
      website: row.website,
      city: row.city,
      category: row.category,
      notes: row.notes,
      source: options.source,
      tier: qualified.tier,
      stage: qualified.tier === 'decline' ? 'declined' : 'new',
      sequence_key: declined ? null : qualified.sequenceKey,
      sequence_step: 0,
      // No established consent basis means imported but never scheduled. It
      // shows in the UI flagged and starts moving the moment someone sets it.
      // Inventing consent at import time is how a compliance problem gets
      // manufactured 400 rows at a time.
      next_action_on: declined || !consent.basis ? null : today,
      consent_basis: consent.basis,
      consent_note: consent.note,
    })
  }

  const summary: ImportSummary = {
    parsed: rows.length,
    willImport: outcomes.filter(o => o.action === 'import').length,
    needConsent: outcomes.filter(o => o.action === 'no_consent').length,
    declined: outcomes.filter(o => o.action === 'decline').length,
    duplicates: outcomes.filter(o => o.action === 'duplicate').length,
  }

  if (options.dryRun || toInsert.length === 0) {
    return { summary, outcomes, inserted: 0 }
  }

  const { data: inserted, error } = await supabase.from('leads').insert(toInsert).select('id, company')
  if (error) throw new Error(error.message)

  await supabase.from('lead_events').insert(
    (inserted ?? []).map(lead => ({
      lead_id: lead.id,
      type: 'created',
      body: `Imported from ${options.source} by ${options.actor}.`,
    })),
  )

  return { summary, outcomes, inserted: inserted?.length ?? 0 }
}
