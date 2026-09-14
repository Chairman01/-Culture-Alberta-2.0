/**
 * Bulk lead import from a CSV paste or file.
 *
 * Exists so the pipeline can be loaded without a Google Cloud service account
 * standing in the way — export the sheet to CSV, drop it in, done. The live
 * Sheets sync remains a later upgrade, not a prerequisite.
 *
 * POST { csv, dryRun }. Always call it with dryRun first: the admin UI shows
 * the summary and the user presses Import to run it for real. Nothing is
 * written on a dry run.
 *
 * Every imported lead goes through the same qualifier as a hand-typed one, so
 * link sellers land in the decline lane on the way in rather than being
 * discovered later in an approval queue.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { getServiceClient } from '@/lib/supabase-admin'
import { parseLeadCsv, type ImportRow } from '@/lib/crm/csv'
import { guessConsentBasis, qualifyLead } from '@/lib/crm/qualify'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/** Guard against someone pasting a 50MB export into a serverless function. */
const MAX_CSV_BYTES = 2_000_000
const MAX_ROWS = 2000

type Outcome = {
  company: string
  email: string | null
  action: 'import' | 'duplicate' | 'decline' | 'no_consent'
  tier: string
  reason: string
}

export async function POST(request: NextRequest) {
    const auth = requireAdmin(request)
    if (!auth.ok) return auth.response

    try {
        const { csv, dryRun } = await request.json()
        if (typeof csv !== 'string' || csv.trim() === '') {
            return NextResponse.json({ error: 'Paste some CSV first' }, { status: 400 })
        }
        if (csv.length > MAX_CSV_BYTES) {
            return NextResponse.json(
                { error: `That file is ${(csv.length / 1e6).toFixed(1)}MB. Split it into chunks under 2MB.` },
                { status: 413 },
            )
        }

        const parsed = parseLeadCsv(csv)
        if (parsed.rows.length === 0) {
            return NextResponse.json(
                {
                    error:
                        'No usable rows. The first line must be a header containing a company column ' +
                        '(company, business, organisation or name).',
                    rejected: parsed.rejected.slice(0, 10),
                },
                { status: 400 },
            )
        }
        if (parsed.rows.length > MAX_ROWS) {
            return NextResponse.json(
                { error: `${parsed.rows.length} rows is over the ${MAX_ROWS} limit. Import it in batches.` },
                { status: 413 },
            )
        }

        const supabase = getServiceClient()

        // One read of the existing addresses beats a per-row existence check,
        // and the unique index is still the real guard behind it.
        const { data: existing } = await supabase.from('leads').select('email').not('email', 'is', null)
        const seen = new Set((existing ?? []).map(row => (row.email || '').toLowerCase()))

        const outcomes: Outcome[] = []
        const toInsert: Record<string, unknown>[] = []
        const today = new Date().toISOString().slice(0, 10)

        for (const row of parsed.rows as ImportRow[]) {
            const email = row.email ? row.email.toLowerCase().trim() : null

            // Catches both rows already in the database and the same address
            // appearing twice inside one file.
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
            const consent = guessConsentBasis({ source: 'sheet', email, website: row.website })

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
                source: 'sheet',
                tier: qualified.tier,
                stage: qualified.tier === 'decline' ? 'declined' : 'new',
                sequence_key: declined ? null : qualified.sequenceKey,
                sequence_step: 0,
                // A lead with no established consent basis is imported but not
                // scheduled — it shows in the UI flagged, and starts moving the
                // moment someone sets the basis. Inventing consent here is how
                // a compliance problem gets manufactured at scale.
                next_action_on: declined || !consent.basis ? null : today,
                consent_basis: consent.basis,
                consent_note: consent.note,
            })
        }

        const summary = {
            parsed: parsed.rows.length,
            willImport: outcomes.filter(o => o.action === 'import').length,
            needConsent: outcomes.filter(o => o.action === 'no_consent').length,
            declined: outcomes.filter(o => o.action === 'decline').length,
            duplicates: outcomes.filter(o => o.action === 'duplicate').length,
            unmappedHeaders: parsed.unmappedHeaders,
            rejectedRows: parsed.rejected.slice(0, 10),
        }

        if (dryRun) {
            return NextResponse.json({ dryRun: true, summary, preview: outcomes.slice(0, 50) })
        }

        if (toInsert.length === 0) {
            return NextResponse.json({ dryRun: false, summary, inserted: 0 })
        }

        const { data: inserted, error } = await supabase.from('leads').insert(toInsert).select('id, company')
        if (error) {
            console.error('[admin leads import]', error)
            return NextResponse.json({ error: `Import failed: ${error.message}` }, { status: 500 })
        }

        await supabase.from('lead_events').insert(
            (inserted ?? []).map(lead => ({
                lead_id: lead.id,
                type: 'created',
                body: `Imported from CSV by ${auth.name}.`,
            })),
        )

        return NextResponse.json({ dryRun: false, summary, inserted: inserted?.length ?? 0 })
    } catch (error) {
        console.error('[admin leads import]', error)
        return NextResponse.json({ error: 'Import failed' }, { status: 500 })
    }
}
