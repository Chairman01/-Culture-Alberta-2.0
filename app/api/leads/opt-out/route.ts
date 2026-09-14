/**
 * CASL unsubscribe for outreach mail.
 *
 * Public by necessity — the link is in an email, so there is no session. The
 * lead id is a UUID, which is the only thing protecting it; the worst a guessed
 * id can do is stop us emailing someone, so that trade is fine.
 *
 * GET renders a confirmation page. POST performs the opt-out.
 *
 * The split matters: mail clients, link scanners and security appliances
 * prefetch URLs found in email. A GET that mutated would let a scanner
 * unsubscribe a lead who never clicked anything — the same class of bug as the
 * routine HEAD request that once mailed the entire newsletter list. HEAD and
 * GET here are side-effect free, and CASL is satisfied by the mechanism being
 * one click from the message.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

function page(title: string, message: string): NextResponse {
    return new NextResponse(
        `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">` +
            `<title>${title}</title>` +
            `<div style="max-width:34rem;margin:12vh auto;padding:0 1.5rem;font:16px/1.6 system-ui,sans-serif;color:#14181f">` +
            `<h1 style="font-size:1.5rem;margin:0 0 .6rem">${title}</h1>` +
            `<p style="color:#4a5462;margin:0">${message}</p></div>`,
        { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } },
    )
}

export async function GET(request: NextRequest) {
    const id = request.nextUrl.searchParams.get('id')
    if (!id) return page('Link not recognised', 'This unsubscribe link is missing its reference.')

    const supabase = getServiceClient()
    const { data: lead } = await supabase.from('leads').select('id, company, unsubscribed_at').eq('id', id).single()

    if (!lead) return page('Link not recognised', 'We could not find anything matching this link.')
    if (lead.unsubscribed_at) {
        return page('Already unsubscribed', `We are not sending any further email to ${lead.company}.`)
    }

    return new NextResponse(
        `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">` +
            `<title>Unsubscribe</title>` +
            `<div style="max-width:34rem;margin:12vh auto;padding:0 1.5rem;font:16px/1.6 system-ui,sans-serif;color:#14181f">` +
            `<h1 style="font-size:1.5rem;margin:0 0 .6rem">Unsubscribe</h1>` +
            `<p style="color:#4a5462">Confirm and we will stop sending email to ${lead.company}. This takes effect immediately.</p>` +
            `<form method="post"><button type="submit" style="background:#1d4e89;color:#fff;border:0;border-radius:4px;` +
            `font:600 15px system-ui,sans-serif;padding:11px 20px;cursor:pointer">Unsubscribe me</button></form></div>`,
        { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } },
    )
}

export async function POST(request: NextRequest) {
    const id = request.nextUrl.searchParams.get('id')
    if (!id) return page('Link not recognised', 'This unsubscribe link is missing its reference.')

    const supabase = getServiceClient()
    const now = new Date().toISOString()

    const { data: lead, error } = await supabase
        .from('leads')
        .update({ unsubscribed_at: now, next_action_on: null, stage: 'declined', updated_at: now })
        .eq('id', id)
        .select('company')
        .single()

    if (error || !lead) return page('Something went wrong', 'We could not process that. Please reply to the email instead.')

    // Anything already queued has to go too, or tomorrow's approval queue
    // still offers a send to someone who just opted out.
    await supabase
        .from('lead_drafts')
        .update({ status: 'skipped', send_error: 'Lead unsubscribed' })
        .eq('lead_id', id)
        .eq('status', 'pending')

    await supabase.from('lead_events').insert({
        lead_id: id,
        type: 'note',
        body: 'Unsubscribed via the link in an outreach email.',
    })

    return page('Unsubscribed', `We have stopped sending email to ${lead.company}. Sorry for the interruption.`)
}
