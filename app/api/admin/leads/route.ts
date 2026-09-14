/**
 * The lead pipeline API.
 *
 * GET    the board — every lead, its pending draft, and setup warnings
 * POST   create a lead by hand (the sheet sync and inbound capture reuse this shape)
 * PATCH  update one lead — stage, tier, consent, deal value, notes
 *
 * Service-role reads and writes, so every handler checks requireAdmin first:
 * the tables are RLS-closed with no policies, which stops the anon key but does
 * nothing about a route that forgot its own guard.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { getServiceClient } from '@/lib/supabase-admin'
import { guessConsentBasis, qualifyLead } from '@/lib/crm/qualify'
import { listSequences, mailingAddressMissing } from '@/lib/crm/sequences'
import { zohoConfigured, zohoMissingVars } from '@/lib/crm/zoho'

export const dynamic = 'force-dynamic'

/** Fields the PATCH handler will accept. Anything else is ignored outright. */
const EDITABLE = [
    'company',
    'contact_name',
    'email',
    'phone',
    'website',
    'city',
    'category',
    'tier',
    'stage',
    'sequence_key',
    'next_action_on',
    'deal_value',
    'term_months',
    'renewal_on',
    'consent_basis',
    'consent_note',
    'notes',
] as const

export async function GET(request: NextRequest) {
    const auth = requireAdmin(request)
    if (!auth.ok) return auth.response

    try {
        const supabase = getServiceClient()

        // ?count=1 backs the sidebar badge, which renders on every admin page.
        // It must not drag the whole board over the wire to show one number.
        if (request.nextUrl.searchParams.get('count') === '1') {
            const { count } = await supabase
                .from('lead_drafts')
                .select('id', { count: 'exact', head: true })
                .eq('status', 'pending')
            return NextResponse.json({ count: count ?? 0 })
        }

        const [{ data: leads, error: leadsError }, { data: drafts }] = await Promise.all([
            supabase
                .from('leads')
                .select('*')
                .order('next_action_on', { ascending: true, nullsFirst: false })
                .order('updated_at', { ascending: false })
                .limit(500),
            supabase
                .from('lead_drafts')
                .select('id, lead_id, subject, body, step, sequence_key, status, created_at')
                .in('status', ['pending', 'approved', 'failed'])
                .order('created_at', { ascending: true }),
        ])

        if (leadsError) {
            console.error('[admin leads GET]', leadsError)
            return NextResponse.json({ error: 'Failed to load leads' }, { status: 500 })
        }

        const draftByLead = new Map<string, any>()
        for (const draft of drafts ?? []) {
            // Pending beats an older failed row for the same lead.
            if (!draftByLead.has(draft.lead_id) || draft.status === 'pending') {
                draftByLead.set(draft.lead_id, draft)
            }
        }

        return NextResponse.json({
            leads: (leads ?? []).map(lead => ({ ...lead, draft: draftByLead.get(lead.id) ?? null })),
            sequences: listSequences().map(sequence => ({
                key: sequence.key,
                label: sequence.label,
                description: sequence.description,
                steps: sequence.steps.length,
            })),
            // Surfaced in the UI so a half-finished setup is visible rather
            // than silently producing mail that never sends.
            setup: {
                zoho: zohoConfigured() ? null : zohoMissingVars(),
                mailingAddress: mailingAddressMissing(),
            },
        })
    } catch (error) {
        console.error('[admin leads GET]', error)
        return NextResponse.json({ error: 'Failed to load leads' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    const auth = requireAdmin(request)
    if (!auth.ok) return auth.response

    try {
        const input = await request.json()
        if (!input?.company) {
            return NextResponse.json({ error: 'company is required' }, { status: 400 })
        }

        const supabase = getServiceClient()
        const source = input.source || 'manual'
        const qualified = qualifyLead({
            company: input.company,
            email: input.email,
            website: input.website,
            notes: input.notes,
            inbound: source === 'inbound' || source === 'partner_form',
        })
        const consent = guessConsentBasis({ source, email: input.email, website: input.website })

        // A declined lead is stored so it stops arriving as a surprise, but it
        // is never scheduled — that is the whole point of the decline lane.
        const scheduled = qualified.sequenceKey !== null
        const { data: lead, error } = await supabase
            .from('leads')
            .insert({
                company: input.company,
                contact_name: input.contact_name ?? null,
                email: input.email ?? null,
                phone: input.phone ?? null,
                website: input.website ?? null,
                city: input.city ?? null,
                category: input.category ?? null,
                notes: input.notes ?? null,
                source,
                source_ref: input.source_ref ?? null,
                tier: input.tier ?? qualified.tier,
                stage: qualified.tier === 'decline' ? 'declined' : 'new',
                sequence_key: scheduled ? qualified.sequenceKey : null,
                sequence_step: 0,
                next_action_on: scheduled ? new Date().toISOString().slice(0, 10) : null,
                consent_basis: input.consent_basis ?? consent.basis,
                consent_note: input.consent_note ?? consent.note,
            })
            .select()
            .single()

        if (error) {
            if (error.code === '23505') {
                return NextResponse.json({ error: 'A lead with that email already exists' }, { status: 409 })
            }
            console.error('[admin leads POST]', error)
            return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 })
        }

        await supabase.from('lead_events').insert({
            lead_id: lead.id,
            type: 'created',
            body: `Captured from ${source}. ${qualified.reason}.`,
            meta: { tier: qualified.tier, consent: consent.basis },
        })

        return NextResponse.json({ lead, qualified })
    } catch (error) {
        console.error('[admin leads POST]', error)
        return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 })
    }
}

export async function PATCH(request: NextRequest) {
    const auth = requireAdmin(request)
    if (!auth.ok) return auth.response

    try {
        const { id, ...changes } = await request.json()
        if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

        const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
        for (const field of EDITABLE) {
            if (field in changes) patch[field] = changes[field] === '' ? null : changes[field]
        }

        const supabase = getServiceClient()

        // Changing the sequence restarts it. Leaving the step where it was
        // would drop the lead into the middle of a cadence it never began.
        if ('sequence_key' in patch && patch.sequence_key) {
            patch.sequence_step = 0
            patch.next_action_on = new Date().toISOString().slice(0, 10)
        }

        // Winning a deal schedules its own renewal 45 days before the term
        // ends, which is the step that turns one-off buyers into retainers.
        if (patch.stage === 'won') {
            const { data: existing } = await supabase.from('leads').select('term_months').eq('id', id).single()
            const months = Number(patch.term_months ?? existing?.term_months ?? 0)
            patch.won_at = new Date().toISOString()
            if (months > 0) {
                const renewal = new Date()
                renewal.setMonth(renewal.getMonth() + months)
                renewal.setDate(renewal.getDate() - 45)
                patch.renewal_on = renewal.toISOString().slice(0, 10)
                patch.sequence_key = 'renewal'
                patch.sequence_step = 0
                patch.next_action_on = patch.renewal_on
            } else {
                patch.next_action_on = null
            }
        }

        if (patch.stage === 'lost' || patch.stage === 'declined') {
            patch.next_action_on = null
            await supabase
                .from('lead_drafts')
                .update({ status: 'skipped', send_error: `Lead marked ${patch.stage}` })
                .eq('lead_id', id)
                .eq('status', 'pending')
        }

        const { data: lead, error } = await supabase.from('leads').update(patch).eq('id', id).select().single()
        if (error) {
            console.error('[admin leads PATCH]', error)
            return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 })
        }

        if ('stage' in changes) {
            await supabase.from('lead_events').insert({
                lead_id: id,
                type: 'stage_change',
                body: `Moved to ${changes.stage} by ${auth.name}`,
                meta: { deal_value: patch.deal_value ?? null },
            })
        }

        return NextResponse.json({ lead })
    } catch (error) {
        console.error('[admin leads PATCH]', error)
        return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 })
    }
}
