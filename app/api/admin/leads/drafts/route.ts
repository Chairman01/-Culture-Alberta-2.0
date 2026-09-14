/**
 * The approval queue.
 *
 * One POST with an action: approve (send it now), skip (never send this step,
 * move on), or snooze (come back in N days).
 *
 * Approve is the only path in this codebase that sends outreach, and it is
 * reachable only from a human clicking Approve behind requireAdmin. Nothing
 * scheduled calls it — the daily cron writes drafts and stops. That separation
 * is deliberate: an automated job that can send mail on its own is exactly how
 * a routine sweep once mailed the whole newsletter list.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { getServiceClient } from '@/lib/supabase-admin'
import { advanceSequence, recordSent } from '@/lib/crm/pipeline'
import { sendMail } from '@/lib/crm/zoho'
import { mailingAddressMissing } from '@/lib/crm/sequences'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
    const auth = requireAdmin(request)
    if (!auth.ok) return auth.response

    try {
        const { draftId, action, subject, body, days } = await request.json()
        if (!draftId || !action) {
            return NextResponse.json({ error: 'draftId and action are required' }, { status: 400 })
        }

        const supabase = getServiceClient()
        const { data: draft, error } = await supabase
            .from('lead_drafts')
            .select('id, lead_id, status, subject, body, step, sequence_key, leads(company, email, zoho_thread_id)')
            .eq('id', draftId)
            .single()

        if (error || !draft) return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
        if (draft.status !== 'pending' && draft.status !== 'failed') {
            // Guards the double-click: a draft already sent must not go twice.
            return NextResponse.json({ error: `Draft is already ${draft.status}` }, { status: 409 })
        }

        const lead = (draft as any).leads as { company: string; email: string | null; zoho_thread_id: string | null }

        // CASL s.6(2) requires a physical mailing address in every commercial
        // electronic message. Without one configured the footer renders a
        // literal placeholder, so anything that puts a message in front of a
        // lead -- our own send, or handing you the text to send yourself --
        // is refused here rather than warned about. skip and snooze stay
        // available so the queue can still be cleared.
        if ((action === 'approve' || action === 'mark_sent') && mailingAddressMissing()) {
            return NextResponse.json(
                {
                    error:
                        'No mailing address configured, so this would send a footer reading ' +
                        '"[SET CRM_MAILING_ADDRESS IN VERCEL]" and would not meet CASL. ' +
                        'Set CRM_MAILING_ADDRESS in Vercel and redeploy.',
                },
                { status: 409 },
            )
        }

        if (action === 'skip') {
            await supabase
                .from('lead_drafts')
                .update({ status: 'skipped', send_error: `Skipped by ${auth.name}` })
                .eq('id', draftId)
            // Skipping a step still advances the cadence — otherwise the same
            // email is regenerated tomorrow and skipped again forever. Nothing
            // was sent, so the lead's stage and last-contacted stay put.
            await advanceSequence(
                supabase,
                { id: draft.lead_id, sequence_key: draft.sequence_key, step: draft.step },
                { touched: false },
            )
            await supabase.from('lead_events').insert({
                lead_id: draft.lead_id,
                type: 'skipped',
                body: `Step ${draft.step} skipped by ${auth.name}`,
            })
            return NextResponse.json({ ok: true, status: 'skipped' })
        }

        if (action === 'snooze') {
            const wait = Number(days) > 0 ? Number(days) : 3
            const when = new Date()
            when.setUTCDate(when.getUTCDate() + wait)
            await supabase.from('lead_drafts').update({ status: 'skipped', send_error: 'Snoozed' }).eq('id', draftId)
            await supabase
                .from('leads')
                .update({ next_action_on: when.toISOString().slice(0, 10), updated_at: new Date().toISOString() })
                .eq('id', draft.lead_id)
            return NextResponse.json({ ok: true, status: 'snoozed', until: when.toISOString().slice(0, 10) })
        }

        // Sent by hand — copied out of here, or opened in a mail client via the
        // mailto button. The message left from the real mailbox, so the cadence
        // has to advance exactly as if we had sent it; without this the same
        // step is redrafted tomorrow.
        if (action === 'mark_sent') {
            await supabase
                .from('lead_drafts')
                .update({
                    subject: subject ?? draft.subject,
                    body: body ?? draft.body,
                    approved_by: auth.name,
                    approved_at: new Date().toISOString(),
                })
                .eq('id', draftId)

            await recordSent(supabase, draftId)
            await supabase.from('lead_events').insert({
                lead_id: draft.lead_id,
                type: 'note',
                body: `Step ${draft.step + 1} sent manually by ${auth.name} (outside the app).`,
            })
            return NextResponse.json({ ok: true, status: 'sent', company: lead?.company })
        }

        if (action !== 'approve') {
            return NextResponse.json({ error: `Unknown action "${action}"` }, { status: 400 })
        }

        if (!lead?.email) {
            return NextResponse.json({ error: 'Lead has no email address' }, { status: 400 })
        }

        // Whatever is on screen wins — the admin may have rewritten it.
        const finalSubject = (subject ?? draft.subject) as string
        const finalBody = (body ?? draft.body) as string

        const result = await sendMail({
            to: lead.email,
            subject: finalSubject,
            body: finalBody,
            inReplyTo: lead.zoho_thread_id,
        })

        if (!result.configured) {
            // Park it as approved rather than losing the edit. The moment the
            // Zoho vars land, these can be approved again and go straight out.
            await supabase
                .from('lead_drafts')
                .update({
                    status: 'approved',
                    subject: finalSubject,
                    body: finalBody,
                    approved_by: auth.name,
                    approved_at: new Date().toISOString(),
                    send_error: `Zoho not configured — missing ${result.missing.join(', ')}`,
                })
                .eq('id', draftId)
            return NextResponse.json(
                {
                    ok: false,
                    status: 'approved_not_sent',
                    error: `Approved and saved, but Zoho is not connected yet. Missing: ${result.missing.join(', ')}`,
                },
                { status: 200 },
            )
        }

        if (!result.ok) {
            await supabase
                .from('lead_drafts')
                .update({ status: 'failed', subject: finalSubject, body: finalBody, send_error: result.error })
                .eq('id', draftId)
            await supabase.from('lead_events').insert({
                lead_id: draft.lead_id,
                type: 'error',
                body: `Send failed: ${result.error}`,
            })
            return NextResponse.json({ ok: false, error: result.error }, { status: 502 })
        }

        await supabase
            .from('lead_drafts')
            .update({
                subject: finalSubject,
                body: finalBody,
                approved_by: auth.name,
                approved_at: new Date().toISOString(),
            })
            .eq('id', draftId)

        await recordSent(supabase, draftId, { zohoMessageId: result.messageId ?? undefined })

        return NextResponse.json({ ok: true, status: 'sent', company: lead.company })
    } catch (error) {
        console.error('[admin lead drafts POST]', error)
        return NextResponse.json({ error: 'Failed to action draft' }, { status: 500 })
    }
}
