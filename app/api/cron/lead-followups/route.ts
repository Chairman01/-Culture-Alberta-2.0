/**
 * The daily pipeline run — 7am, every day.
 *
 * Three things, in order:
 *   1. Read the Zoho inbox and mark any lead who replied. Runs FIRST so a
 *      reply that landed overnight cancels today's follow-up before it is ever
 *      drafted. Getting this order wrong is how you bump someone who already
 *      answered you.
 *   2. Queue one drafted email for every lead due today.
 *   3. Mail the digest: what is waiting for approval, who replied, what has
 *      gone quiet.
 *
 * This job never sends outreach. It writes drafts and stops; the only path to
 * a lead's inbox is a human clicking Approve in /admin/leads.
 *
 *   ?dryRun=1   report what it would do, write nothing
 *
 * Auth: Bearer {CRON_SECRET} (or AUTOMATION_CRON_SECRET) — see lib/cron-auth.
 */

import { NextRequest, NextResponse } from 'next/server'
import { isCronAuthorized } from '@/lib/cron-auth'
import { getServiceClient } from '@/lib/supabase-admin'
import { buildDigest, generateDueDrafts, recordReply } from '@/lib/crm/pipeline'
import { recentInbox, zohoConfigured, zohoMissingVars } from '@/lib/crm/zoho'
import { importRows } from '@/lib/crm/import'
import { readLeadSheet } from '@/lib/crm/sheets'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.culturealberta.com'

type ReplyScan = { status: 'ok'; matched: number } | { status: 'skipped'; reason: string } | { status: 'error'; error: string }

/**
 * Matches recent inbox senders against lead addresses. Only counts a message
 * as a reply when it arrived after we last contacted that lead, so an old
 * thread in the inbox does not re-trigger every morning.
 */
async function scanForReplies(supabase: ReturnType<typeof getServiceClient>): Promise<ReplyScan> {
    if (!zohoConfigured()) {
        return { status: 'skipped', reason: `Zoho not connected (missing ${zohoMissingVars().join(', ')})` }
    }

    try {
        const inbox = await recentInbox(75)
        if (!inbox.configured) return { status: 'skipped', reason: 'Zoho not connected' }
        if (inbox.messages.length === 0) return { status: 'ok', matched: 0 }

        const senders = Array.from(new Set(inbox.messages.map(message => message.fromAddress).filter(Boolean)))
        if (senders.length === 0) return { status: 'ok', matched: 0 }

        const { data: leads } = await supabase
            .from('leads')
            .select('id, company, email, last_contacted_at, last_reply_at')
            .in('email', senders)

        let matched = 0
        for (const lead of leads ?? []) {
            const message = inbox.messages.find(m => m.fromAddress === (lead.email || '').toLowerCase())
            if (!message) continue

            const receivedAt = Number(message.receivedAt) || Date.parse(message.receivedAt)
            if (!receivedAt) continue

            // Only a message newer than both our last send and the last reply
            // we already recorded counts as new.
            const lastContact = lead.last_contacted_at ? Date.parse(lead.last_contacted_at) : 0
            const lastReply = lead.last_reply_at ? Date.parse(lead.last_reply_at) : 0
            if (receivedAt <= Math.max(lastContact, lastReply)) continue

            await recordReply(supabase, lead.id, message.subject || 'Replied', {
                zohoMessageId: message.messageId,
                from: message.fromAddress,
            })
            matched += 1
        }

        return { status: 'ok', matched }
    } catch (error) {
        return { status: 'error', error: error instanceof Error ? error.message : String(error) }
    }
}

function digestHtml(digest: Awaited<ReturnType<typeof buildDigest>>, replies: ReplyScan): string {
    const row = (left: string, right: string) =>
        `<tr><td style="padding:8px 0;border-bottom:1px solid #e6e8ec">${left}</td>` +
        `<td style="padding:8px 0;border-bottom:1px solid #e6e8ec;color:#5a6472;text-align:right">${right}</td></tr>`

    const section = (title: string, rows: string[]) =>
        rows.length === 0
            ? ''
            : `<h3 style="font:600 13px/1.4 system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#77828f;margin:28px 0 6px">${title}</h3>` +
              `<table style="width:100%;border-collapse:collapse;font:15px/1.5 system-ui,sans-serif">${rows.join('')}</table>`

    const replyNote =
        replies.status === 'skipped'
            ? `<p style="font:13px system-ui,sans-serif;color:#a06800;background:#fff8e6;padding:10px 12px;border-radius:4px">Reply detection is off — ${replies.reason}.</p>`
            : replies.status === 'error'
              ? `<p style="font:13px system-ui,sans-serif;color:#a11;background:#fdecec;padding:10px 12px;border-radius:4px">Reply check failed: ${replies.error}</p>`
              : ''

    return (
        `<div style="max-width:600px;margin:0 auto;padding:24px;color:#14181f">` +
        `<h1 style="font:700 22px/1.2 system-ui,sans-serif;margin:0 0 4px">Pipeline — ${new Date().toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric' })}</h1>` +
        `<p style="font:15px/1.5 system-ui,sans-serif;color:#5a6472;margin:0 0 20px">` +
        `${digest.due.length} waiting for approval · ${digest.replied.length} replied · ${digest.awaiting.length} gone quiet</p>` +
        replyNote +
        section(
            'Drafted and waiting for you',
            digest.due.map(item => row(`<strong>${item.company}</strong><br><span style="color:#5a6472;font-size:13px">${item.subject}</span>`, `step ${item.step + 1}`)),
        ) +
        section(
            'Replied — pick these up',
            digest.replied.map(item => row(`<strong>${item.company}</strong>`, new Date(item.when).toLocaleDateString('en-CA'))),
        ) +
        section(
            'Gone quiet',
            digest.awaiting.map(item => row(`<strong>${item.company}</strong><br><span style="color:#5a6472;font-size:13px">${item.stage}</span>`, `${item.days}d`)),
        ) +
        `<p style="margin:28px 0 0"><a href="${SITE}/admin/leads" style="display:inline-block;background:#1d4e89;color:#fff;text-decoration:none;font:600 15px system-ui,sans-serif;padding:11px 20px;border-radius:4px">Open the pipeline</a></p>` +
        `</div>`
    )
}

export async function GET(request: NextRequest) {
    if (!isCronAuthorized(request, 'lead-followups')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const dryRun = request.nextUrl.searchParams.get('dryRun') === '1'

    try {
        const supabase = getServiceClient()

        // Replies first — see the header comment. A lead who answered
        // overnight must be off the schedule before drafts are generated.
        const replies = dryRun ? ({ status: 'skipped', reason: 'dry run' } as ReplyScan) : await scanForReplies(supabase)

        // Pull anything new off the leads sheet before working out who is due,
        // so a row added yesterday gets its first email this morning rather
        // than tomorrow's. A sheet that is not connected is not an error: most
        // of the time there simply isn't one.
        let sheet: Record<string, unknown> = { status: 'skipped' }
        try {
            const read = await readLeadSheet()
            if (!read.ok) {
                sheet = { status: read.reason === 'not_configured' ? 'skipped' : 'error', detail: read }
            } else {
                const imported = await importRows(supabase, read.parsed.rows, {
                    source: 'sheet',
                    actor: 'daily sync',
                    dryRun,
                })
                sheet = {
                    status: 'ok',
                    tab: read.tab,
                    rowsInSheet: read.rowCount,
                    imported: imported.inserted,
                    duplicates: imported.summary.duplicates,
                    needConsent: imported.summary.needConsent,
                }
            }
        } catch (error) {
            // A broken sheet must not stop the follow-ups. The digest reports it.
            sheet = { status: 'error', error: error instanceof Error ? error.message : String(error) }
        }

        const generated = await generateDueDrafts(supabase, { dryRun })
        const digest = await buildDigest(supabase)

        let mailed: string | null = null
        const recipient = process.env.CRM_DIGEST_TO || process.env.ALERT_EMAIL_TO
        const hasSomethingToSay = digest.due.length + digest.replied.length + digest.awaiting.length > 0

        if (!dryRun && recipient && process.env.RESEND_API_KEY && hasSomethingToSay) {
            const { Resend } = await import('resend')
            const resend = new Resend(process.env.RESEND_API_KEY)
            const { error } = await resend.emails.send({
                from: process.env.NEWSLETTER_FROM || 'Culture Alberta <hello@culturealberta.com>',
                to: recipient,
                subject: `Pipeline: ${digest.due.length} to approve, ${digest.replied.length} replied`,
                html: digestHtml(digest, replies),
            })
            mailed = error ? `failed: ${error.message}` : recipient
        } else if (!hasSomethingToSay) {
            // Nothing happening is not worth an email. A daily message that is
            // usually empty stops being read within a fortnight.
            mailed = 'skipped — nothing to report'
        } else if (!recipient) {
            mailed = 'skipped — set CRM_DIGEST_TO'
        }

        return NextResponse.json({
            ok: true,
            dryRun,
            replies,
            sheet,
            queued: generated.queued,
            skipped: generated.skipped,
            digest: { due: digest.due.length, replied: digest.replied.length, quiet: digest.awaiting.length },
            mailed,
        })
    } catch (error) {
        console.error('[cron lead-followups]', error)
        return NextResponse.json(
            { ok: false, error: error instanceof Error ? error.message : String(error) },
            { status: 500 },
        )
    }
}
