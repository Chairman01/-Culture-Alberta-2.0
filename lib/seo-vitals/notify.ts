/**
 * Alert delivery. One email per cron run, listing every alert that is new
 * today (the seo_alerts unique key on (day, rule) is what makes "new" mean
 * something — a rule that stays tripped all week mails once a day, not once a
 * minute).
 *
 * Env: ALERT_EMAIL_TO — the single inbox alerts go to. Unset means no email;
 * alerts are still written to seo_alerts and returned by the route. This is a
 * deliberate default: nothing on this site sends mail unless it has been
 * pointed at an address on purpose.
 */

import { Resend } from 'resend'
import type { SeoAlert } from './rules'

// The same verified sender lib/reply-email.ts and lib/welcome-email.ts use.
const FROM = 'Culture Alberta <news@culturemedia.ca>'

export type NotifyResult = 'sent' | 'skipped:no-alerts' | 'skipped:no-recipient' | 'skipped:no-api-key'

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export async function sendAlertEmail(alerts: SeoAlert[], runDay: string): Promise<NotifyResult> {
  if (alerts.length === 0) return 'skipped:no-alerts'
  const to = process.env.ALERT_EMAIL_TO
  if (!to) return 'skipped:no-recipient'
  if (!process.env.RESEND_API_KEY) return 'skipped:no-api-key'

  const warnings = alerts.filter((a) => a.severity === 'warning').length
  const subject = warnings > 0
    ? `[Culture Alberta] ${warnings} SEO warning${warnings === 1 ? '' : 's'} — ${runDay}`
    : `[Culture Alberta] SEO notes — ${runDay}`

  const text = alerts
    .map((a) => `${a.severity === 'warning' ? '⚠' : 'ℹ'} ${a.rule}\n${a.message}`)
    .join('\n\n')

  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:640px;line-height:1.45">
      <h2 style="margin:0 0 12px">SEO vitals — ${escapeHtml(runDay)}</h2>
      ${alerts.map((a) => `
        <div style="border-left:4px solid ${a.severity === 'warning' ? '#d97706' : '#6b7280'};padding:8px 12px;margin:0 0 12px;background:#fafafa">
          <div style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.04em">${a.severity} · ${escapeHtml(a.rule)}</div>
          <div>${escapeHtml(a.message)}</div>
        </div>`).join('')}
      <p style="font-size:12px;color:#6b7280">Daily series in the <code>seo_daily</code> table; this run's alerts in <code>seo_alerts</code>.</p>
    </div>`

  const resend = new Resend(process.env.RESEND_API_KEY)
  const { error } = await resend.emails.send({ from: FROM, to, subject, text, html })
  if (error) throw new Error(`Resend: ${error.message}`)
  return 'sent'
}
