/**
 * Google Sheets sync.
 *
 * GET   what state the connection is in, and which address to share the sheet
 *       with. The admin page renders this as instructions.
 * POST  { dryRun } read the sheet and import new rows. dryRun writes nothing.
 *
 * Additive only: rows already in the pipeline are reported as duplicates and
 * skipped. Deleting a row from the sheet does not delete the lead — the sheet
 * is an inbox, not the source of truth. Once a lead is in the pipeline its
 * stage, notes and history live in the database, and letting a spreadsheet
 * edit overwrite those would lose work no one meant to discard.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { getServiceClient } from '@/lib/supabase-admin'
import { importRows } from '@/lib/crm/import'
import { readLeadSheet, sheetStatus } from '@/lib/crm/sheets'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: NextRequest) {
    const auth = requireAdmin(request)
    if (!auth.ok) return auth.response
    return NextResponse.json(sheetStatus())
}

export async function POST(request: NextRequest) {
    const auth = requireAdmin(request)
    if (!auth.ok) return auth.response

    try {
        const { dryRun } = await request.json().catch(() => ({ dryRun: true }))
        const sheet = await readLeadSheet()

        if (!sheet.ok) {
            if (sheet.reason === 'not_configured') {
                return NextResponse.json(
                    { error: `Not connected yet. Missing: ${sheet.missing.join(', ')}`, missing: sheet.missing },
                    { status: 409 },
                )
            }
            if (sheet.reason === 'share_required') {
                return NextResponse.json(
                    {
                        error:
                            `The sheet is not shared with this service account. Open the sheet, click Share, ` +
                            `and give Viewer access to ${sheet.serviceAccountEmail}`,
                        serviceAccountEmail: sheet.serviceAccountEmail,
                    },
                    { status: 403 },
                )
            }
            return NextResponse.json({ error: sheet.error }, { status: 502 })
        }

        if (sheet.parsed.rows.length === 0) {
            return NextResponse.json(
                {
                    error:
                        `Read the "${sheet.tab}" tab but found no usable rows. The first row must be a header ` +
                        `with a company column (company, business, organisation or name).`,
                    rejected: sheet.parsed.rejected.slice(0, 10),
                },
                { status: 400 },
            )
        }

        const result = await importRows(getServiceClient(), sheet.parsed.rows, {
            source: 'sheet',
            actor: auth.name,
            dryRun: dryRun !== false,
        })

        return NextResponse.json({
            dryRun: dryRun !== false,
            tab: sheet.tab,
            summary: {
                ...result.summary,
                unmappedHeaders: sheet.parsed.unmappedHeaders,
                rejectedRows: sheet.parsed.rejected.slice(0, 10),
            },
            preview: result.outcomes.slice(0, 50),
            inserted: result.inserted,
        })
    } catch (error) {
        console.error('[admin leads sync-sheet]', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Sheet sync failed' },
            { status: 500 },
        )
    }
}
