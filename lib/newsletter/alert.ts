import { Resend } from 'resend'
import { getServiceClient } from '@/lib/supabase-admin'
import { makeUnsubscribeToken } from './send-newsletter'
import { escapeHtml, mailingAddressLine } from './template'
import { MAX_MORE } from './alert-shared'

export { MAX_MORE }

/**
 * Alert emails: one article, sent once, to every newsletter subscriber.
 *
 * Built for AMBER Alerts, where the daily editions are the wrong shape: an
 * edition is per city and rate-limited to one per 20 hours, while an alert is
 * province-wide and can't wait for tomorrow's brief. So this is its own path
 * rather than a flag on sendCityNewsletter, and it never touches a city's
 * last_sent_at, so sending an alert doesn't block the next regular edition.
 *
 * The email is deliberately short and points at the article. An email can't be
 * corrected after it lands and AMBER Alerts change fast (new vehicle, then
 * cancelled), so the article is the one place the current facts live.
 *
 * Safeguards, all load-bearing — this mails ~1,400 real inboxes:
 * - Admin-only, checked in the server action, not by the page.
 * - The caller must pass back the exact recipient count, typed by a human,
 *   so a stale tab or a misclick can't send.
 * - A newsletter_alert_sends row is claimed BEFORE sending; its unique
 *   (article_id, kind) index makes a second send of the same alert impossible.
 * - Only published articles can be sent.
 */

const supabase = getServiceClient()

let _resend: Resend | null = null
function getResend(): Resend {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY)
  return _resend
}

const FROM_EMAIL = 'news@culturemedia.ca'
const FROM_NAME = 'Culture Alberta'
const SITE_URL = 'https://www.culturealberta.com'
const BATCH_SIZE = 100 // Resend's batch maximum; keeps a full-list send well inside the function timeout

/**
 * 'alert'  — the first urgent email (red).
 * 'update' — the follow-up when an alert ends (grey).
 * 'story'  — a regular, non-urgent story sent to everyone (the daily
 *            edition's look: dark banner, blue accents, no warning copy).
 */
export type AlertKind = 'alert' | 'update' | 'story'

const KIND_STYLE: Record<AlertKind, {
  banner: string
  accent: string
  tag: string
  button: string
  footnote: string | null
  reason: string
}> = {
  alert: {
    banner: '#b91c1c',
    accent: '#b91c1c',
    tag: 'Urgent',
    button: 'Get the latest details',
    footnote: 'Alerts can change quickly. Our article is updated as police release information, so go by it rather than this email.',
    reason: "You're receiving this urgent alert because you subscribed to the Culture Alberta newsletter.",
  },
  update: {
    banner: '#334155',
    accent: '#334155',
    tag: 'Update',
    button: 'Read the update',
    footnote: 'This is a follow-up to an alert we emailed earlier.',
    reason: "You're receiving this update because you subscribed to the Culture Alberta newsletter.",
  },
  story: {
    banner: '#0a0a0a',
    accent: '#1a6fc4',
    tag: 'Top Story',
    button: 'Read the full story &rarr;',
    footnote: null,
    reason: "You're receiving this because you subscribed to the Culture Alberta newsletter.",
  },
}

export interface AlertArticle {
  id: string
  slug: string
  title: string
  excerpt: string
  imageUrl: string | null
  url: string
}

export interface AlertEmailInput {
  kind: AlertKind
  /** The banner and subject prefix, e.g. "AMBER Alert" or "Alert cancelled". */
  label: string
  /** Optional short line under the summary, e.g. "If you see them, call 911." */
  note?: string
  /** Extra stories listed under the main one, in order. Capped at MAX_MORE. */
  moreArticleIds?: string[]
}


export interface AlertSendResult {
  sent: number
  failed: number
  skipped: number
  errors: string[]
}

// ── Article lookup ────────────────────────────────────────────────────────────

/** Accepts a full article URL or a bare slug. */
export function slugFromInput(input: string): string {
  const trimmed = input.trim()
  try {
    const url = new URL(trimmed)
    const parts = url.pathname.split('/').filter(Boolean)
    return parts[parts.length - 1] || ''
  } catch {
    return trimmed.replace(/^\/+|\/+$/g, '').split('/').pop() || ''
  }
}

export async function loadAlertArticle(input: string): Promise<AlertArticle | null> {
  const slug = slugFromInput(input)
  if (!slug) return null
  const { data } = await supabase
    .from('articles')
    .select('id, slug, title, seo_title, excerpt, image_url, status')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()
  if (!data) return null
  return {
    id: data.id,
    slug: data.slug,
    title: data.title || '',
    excerpt: data.excerpt || '',
    imageUrl: data.image_url && String(data.image_url).startsWith('http') ? data.image_url : null,
    url: `${SITE_URL}/articles/${data.slug}`,
  }
}

export async function loadArticleById(id: string): Promise<AlertArticle | null> {
  const { data } = await supabase
    .from('articles')
    .select('slug')
    .eq('id', id)
    .eq('status', 'published')
    .maybeSingle()
  return data?.slug ? loadAlertArticle(data.slug) : null
}

/** A pasted link, a slug, or an article id. */
export async function resolveAlertArticle(linkOrId: string): Promise<AlertArticle | null> {
  return (await loadAlertArticle(linkOrId)) ?? (linkOrId.trim() ? loadArticleById(linkOrId.trim()) : null)
}

/** The extra stories, published only, in the order given, without the main one. */
export async function loadMoreArticles(mainId: string, ids: string[] = []): Promise<AlertArticle[]> {
  const unique = [...new Set(ids)].filter(id => id && id !== mainId).slice(0, MAX_MORE)
  const loaded = await Promise.all(unique.map(loadArticleById))
  return loaded.filter((a): a is AlertArticle => !!a)
}

// ── Recipients ────────────────────────────────────────────────────────────────

function isValidEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return /^[^@\s]+@[^@\s]+\.[a-zA-Z]{2,}$/.test(email.trim())
}

/**
 * Every active culture subscriber, across all editions, one row per address.
 *
 * Culture topic only: the jobs list is a separate consent and doesn't get this.
 * Deduplicated because a few people are on two city lists, and they should get
 * one alert, not two.
 */
export async function getAlertRecipients(): Promise<{ id: string; email: string }[]> {
  const rows: { id: string; email: string }[] = []
  const PAGE = 1000
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('newsletter_subscriptions')
      .select('id, email')
      .eq('status', 'active')
      .contains('topics', ['culture'])
      .order('created_at', { ascending: true })
      .range(from, from + PAGE - 1)
    if (error) throw new Error(`Could not load subscribers: ${error.message}`)
    rows.push(...((data ?? []) as { id: string; email: string }[]))
    if (!data || data.length < PAGE) break
  }

  const seen = new Set<string>()
  return rows.filter((row) => {
    if (!isValidEmail(row.email)) return false
    const key = row.email.trim().toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export async function getAlertHistory(articleId: string) {
  const { data } = await supabase
    .from('newsletter_alert_sends')
    .select('kind, label, status, sent, failed, recipients, created_at, sent_by')
    .eq('article_id', articleId)
    .order('created_at', { ascending: true })
  return data ?? []
}

// ── Template ──────────────────────────────────────────────────────────────────

export function getAlertSubject(article: AlertArticle, input: AlertEmailInput): string {
  // A regular story reads like any newsletter: the headline is the subject.
  if (input.kind === 'story') return article.title
  return `${input.label.trim()}: ${article.title}`
}

function trackedUrl(article: AlertArticle, kind: AlertKind): string {
  const params = new URLSearchParams({
    utm_source: 'newsletter',
    utm_medium: 'email',
    utm_campaign: `${kind}-${article.slug}`.slice(0, 100),
  })
  return `${article.url}?${params.toString()}`
}

export function generateAlertHtml(
  article: AlertArticle,
  input: AlertEmailInput,
  unsubscribeUrl: string,
  more: AlertArticle[] = [],
): string {
  const style = KIND_STYLE[input.kind]
  const label = input.label.trim()
  const link = trackedUrl(article, input.kind)
  const sentAt = new Date().toLocaleString('en-CA', {
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/Edmonton',
  })
  const note = input.note?.trim()

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>${escapeHtml(getAlertSubject(article, input))}</title>
</head>
<body style="margin:0;padding:0;background-color:#e8e8e8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;font-size:1px;color:#e8e8e8;">
    ${escapeHtml(article.excerpt.substring(0, 140))}
  </div>
  <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="background-color:#e8e8e8;">
    <tr><td align="center" style="padding:24px 12px;">
      <table width="600" cellpadding="0" cellspacing="0" border="0" role="presentation"
        style="max-width:600px;width:100%;background-color:#ffffff;border-radius:10px;overflow:hidden;">

        <tr><td style="background-color:${style.banner};padding:18px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="font-size:20px;font-weight:900;color:#ffffff;letter-spacing:0.5px;${input.kind === 'story' ? '' : 'text-transform:uppercase;'}">
                ${escapeHtml(label)}
              </td>
              ${input.kind === 'story' ? '' : `<td align="right" style="font-size:11px;font-weight:700;color:#ffffff;opacity:0.85;letter-spacing:1.2px;text-transform:uppercase;">
                Culture Alberta
              </td>`}
            </tr>
          </table>
        </td></tr>

        <!-- Same layout as the daily edition's top story (heroSection in
             template.ts), so the alert reads as a Culture Alberta story card. -->
        ${article.imageUrl ? `
        <tr><td style="padding:0;">
          <a href="${escapeHtml(link)}" style="display:block;line-height:0;">
            <img src="${escapeHtml(article.imageUrl)}" alt="${escapeHtml(article.title)}" width="600"
              style="display:block;width:100%;max-width:600px;height:auto;border:0;" />
          </a>
        </td></tr>` : ''}

        <tr><td style="padding:28px 32px 8px 32px;">
          <div style="display:inline-block;background-color:${style.accent};border-radius:4px;padding:4px 10px;margin-bottom:14px;">
            <span style="font-size:10px;font-weight:800;letter-spacing:2px;color:#ffffff;text-transform:uppercase;">${style.tag}</span>
          </div>
          <h1 style="margin:0 0 14px 0;font-size:26px;font-weight:900;line-height:1.25;color:#0a0a0a;letter-spacing:-0.5px;">
            <a href="${escapeHtml(link)}" style="color:#0a0a0a;text-decoration:none;">${escapeHtml(article.title)}</a>
          </h1>
          <p style="margin:0;font-size:16px;line-height:1.7;color:#3a3a3a;">${escapeHtml(article.excerpt)}</p>
        </td></tr>

        ${note ? `
        <tr><td style="padding:16px 32px 0 32px;">
          <div style="border-left:4px solid ${style.accent};background-color:#fafafa;padding:12px 16px;font-size:16px;font-weight:700;line-height:1.5;color:#0a0a0a;">
            ${escapeHtml(note)}
          </div>
        </td></tr>` : ''}

        <tr><td align="center" style="padding:24px 32px 8px 32px;">
          <a href="${escapeHtml(link)}"
            style="display:inline-block;background-color:${style.accent};color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:6px;">
            ${style.button}
          </a>
        </td></tr>

        ${style.footnote ? `
        <tr><td style="padding:12px 32px 26px 32px;">
          <p style="margin:0;font-size:13px;line-height:1.6;color:#666;text-align:center;">
            ${style.footnote}
            <br />Sent ${escapeHtml(sentAt)} MT.
          </p>
        </td></tr>` : '<tr><td style="padding:0 0 26px 0;"></td></tr>'}

        ${moreStoriesSection(more, input.kind, style.accent)}

        <tr><td style="background-color:#f9f9f9;padding:22px 28px;border-top:1px solid #e8e8e8;text-align:center;">
          <p style="margin:0;font-size:12px;color:#999;line-height:1.7;">
            ${style.reason}
          </p>
          <p style="margin:8px 0 0 0;font-size:12px;">
            <a href="${escapeHtml(unsubscribeUrl)}" style="color:#999;text-decoration:underline;">Unsubscribe</a>
            &nbsp;&middot;&nbsp;
            <a href="${SITE_URL}" style="color:#999;text-decoration:underline;">culturealberta.com</a>
          </p>
          <p style="margin:8px 0 0 0;font-size:11px;color:#bbb;">
            &copy; ${new Date().getFullYear()} Culture Media &middot; Sent by Culture Alberta${mailingAddressLine()}
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

/** Same row layout as the daily edition's "More from" list (template.ts). */
function moreStoriesSection(articles: AlertArticle[], kind: AlertKind, accent: string): string {
  if (articles.length === 0) return ''
  const rows = articles.map((a, i) => {
    const link = trackedUrl(a, kind)
    return `
        <tr><td>
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              ${a.imageUrl ? `
              <td width="88" style="padding:16px 14px 16px 32px;vertical-align:top;">
                <a href="${escapeHtml(link)}" style="display:block;line-height:0;">
                  <img src="${escapeHtml(a.imageUrl)}" alt="" width="88" height="66"
                    style="display:block;width:88px;height:66px;object-fit:cover;border-radius:6px;border:0;" />
                </a>
              </td>` : '<td width="32" style="padding:16px 0 16px 32px;"></td>'}
              <td style="padding:16px 32px 16px 0;vertical-align:top;">
                <h3 style="margin:0 0 6px 0;font-size:15px;font-weight:700;line-height:1.35;color:#0a0a0a;">
                  <a href="${escapeHtml(link)}" style="color:#0a0a0a;text-decoration:none;">${escapeHtml(a.title)}</a>
                </h3>
                <p style="margin:0 0 8px 0;font-size:13px;line-height:1.55;color:#555;">${escapeHtml(a.excerpt.substring(0, 120))}${a.excerpt.length > 120 ? '…' : ''}</p>
                <a href="${escapeHtml(link)}" style="font-size:12px;font-weight:700;color:${accent};text-decoration:none;">Read more &rarr;</a>
              </td>
            </tr>
          </table>
          ${i < articles.length - 1 ? '<table width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:0 32px;"><div style="border-top:1px solid #f2f2f2;"></div></td></tr></table>' : ''}
        </td></tr>`
  }).join('')

  return `
        <tr><td style="padding:0 32px;"><div style="border-top:1px solid #e8e8e8;"></div></td></tr>
        <tr><td style="padding:24px 32px 4px 32px;">
          <div style="font-size:10px;font-weight:800;letter-spacing:2.5px;color:${accent};text-transform:uppercase;">More from Culture Alberta</div>
        </td></tr>
        ${rows}
        <tr><td style="padding:0 0 18px 0;"></td></tr>`
}

// ── Sending ───────────────────────────────────────────────────────────────────

export async function sendAlertTest(
  articleInput: string,
  input: AlertEmailInput,
  toEmail: string,
): Promise<AlertSendResult> {
  const result: AlertSendResult = { sent: 0, failed: 0, skipped: 0, errors: [] }
  const article = await resolveAlertArticle(articleInput)
  if (!article) {
    result.errors.push('Article not found, or not published yet.')
    return result
  }
  const more = await loadMoreArticles(article.id, input.moreArticleIds)
  if (!isValidEmail(toEmail)) {
    result.errors.push('Enter a valid test address.')
    return result
  }
  try {
    const { error } = await getResend().emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: toEmail.trim(),
      subject: `[TEST] ${getAlertSubject(article, input)}`,
      html: generateAlertHtml(article, input, `${SITE_URL}/unsubscribe`, more),
    })
    if (error) {
      result.failed = 1
      result.errors.push(error.message)
    } else {
      result.sent = 1
    }
  } catch (err) {
    result.failed = 1
    result.errors.push(err instanceof Error ? err.message : 'Unknown error')
  }
  return result
}

export async function sendAlertToEveryone(
  articleId: string,
  input: AlertEmailInput,
  confirmedCount: number,
  sentBy: string,
): Promise<AlertSendResult> {
  const result: AlertSendResult = { sent: 0, failed: 0, skipped: 0, errors: [] }

  const label = input.label.trim()
  if (!label) {
    result.errors.push('Add a label for the banner, e.g. "AMBER Alert".')
    return result
  }

  const article = await loadArticleById(articleId)
  if (!article) {
    result.errors.push('Article not found, or not published yet.')
    return result
  }

  const more = await loadMoreArticles(article.id, input.moreArticleIds)

  const recipients = await getAlertRecipients()
  if (recipients.length === 0) {
    result.errors.push('No active subscribers.')
    return result
  }

  // The human typed this number after seeing it on screen. If the list moved
  // in between, make them look again rather than guess.
  if (confirmedCount !== recipients.length) {
    result.errors.push(
      `The confirmation number doesn't match. There are ${recipients.length} recipients right now; type that number to send.`
    )
    return result
  }

  const subject = getAlertSubject(article, input)

  // Claim first. The unique index turns a double-click into an error here,
  // before a single email exists.
  const { data: claim, error: claimError } = await supabase
    .from('newsletter_alert_sends')
    .insert({
      article_id: article.id,
      kind: input.kind,
      label,
      subject,
      recipients: recipients.length,
      sent_by: sentBy,
    })
    .select('id')
    .single()

  if (claimError || !claim) {
    result.errors.push(
      claimError?.code === '23505'
        ? `This article has already been sent to everyone as ${input.kind === 'alert' ? 'an alert' : input.kind === 'update' ? 'an update' : 'a regular email'}. Nothing was sent again.`
        : `Could not record the send, so nothing was sent: ${claimError?.message ?? 'unknown error'}`
    )
    return result
  }

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE)
    const payloads = batch.map((sub) => {
      const token = makeUnsubscribeToken(sub.id, sub.email)
      const unsubscribeUrl = `${SITE_URL}/api/newsletter/unsubscribe?token=${encodeURIComponent(token)}`
      return {
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: sub.email.trim(),
        subject,
        html: generateAlertHtml(article, input, unsubscribeUrl, more),
        headers: {
          'List-Unsubscribe': `<${unsubscribeUrl}>, <mailto:${FROM_EMAIL}?subject=unsubscribe>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      }
    })

    try {
      const { error } = await getResend().batch.send(payloads)
      if (error) {
        result.failed += batch.length
        result.errors.push(`Batch error: ${error.message}`)
      } else {
        result.sent += batch.length
      }
    } catch (err) {
      result.failed += batch.length
      result.errors.push(`Batch failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }

    if (i + BATCH_SIZE < recipients.length) {
      await new Promise((resolve) => setTimeout(resolve, 300))
    }
  }

  // Nobody got it, so free the slot and let a retry through. Once even one
  // batch has landed, the row stays and blocks a duplicate.
  if (result.sent === 0) {
    await supabase.from('newsletter_alert_sends').delete().eq('id', claim.id)
    return result
  }

  await supabase
    .from('newsletter_alert_sends')
    .update({
      status: 'sent',
      sent: result.sent,
      failed: result.failed,
      errors: result.errors,
      finished_at: new Date().toISOString(),
    })
    .eq('id', claim.id)

  return result
}
