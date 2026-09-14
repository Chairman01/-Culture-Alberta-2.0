/**
 * Bulk lead import from a CSV paste or file.
 *
 * POST { csv, dryRun }. Always call it with dryRun first: the admin UI shows
 * the summary and the user presses Import to run it for real. Nothing is
 * written on a dry run.
 *
 * The row-to-lead work lives in lib/crm/import so this and the Google Sheets
 * sync cannot drift apart on qualifying, deduping or consent.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { getServiceClient } from '@/lib/supabase-admin'
import { parseLeadCsv } from '@/lib/crm/csv'
import { importRows } from '@/lib/crm/import'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/** Guard against someone pasting a 50MB export into a serverless function. */
const MAX_CSV_BYTES = 2_000_000
const MAX_ROWS = 2000

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

        const result = await importRows(getServiceClient(), parsed.rows, {
            source: 'sheet',
            actor: auth.name,
            dryRun: Boolean(dryRun),
        })

        const summary = {
            ...result.summary,
            unmappedHeaders: parsed.unmappedHeaders,
            rejectedRows: parsed.rejected.slice(0, 10),
        }

        return dryRun
            ? NextResponse.json({ dryRun: true, summary, preview: result.outcomes.slice(0, 50) })
            : NextResponse.json({ dryRun: false, summary, inserted: result.inserted })
    } catch (error) {
        console.error('[admin leads import]', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Import failed' },
            { status: 500 },
        )
    }
}
