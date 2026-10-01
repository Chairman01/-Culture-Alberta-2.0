import type { EmailJob, JobsEmailRecipient, TrackerSummary } from './build'

/**
 * The jobs email: a short list of what is new, each row a link to the posting.
 *
 * Built like the alerts people already get from the big boards — title,
 * employer, place, pay when stated, how new it is, when it closes — because
 * that is the format a job seeker reads fastest. No images beyond none at all:
 * it has to survive image blocking and read in a phone's preview pane.
 */

const SITE_URL = 'https://www.culturealberta.com'

export interface JobsEmailLinks {
  /** Stops the jobs emails only. Also the one-click List-Unsubscribe target. */
  stopJobsUrl: string
  /** Stops every Culture Alberta email. */
  unsubscribeAllUrl: string
  /** Daily / weekly / stop, on a page — never a link that changes things itself. */
  settingsUrl: string
}

function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Tagged so GA4 files these visits under Email instead of Direct. */
function tracked(path: string, frequency: string): string {
  const join = path.includes('?') ? '&' : '?'
  return `${SITE_URL}${path}${join}utm_source=jobs-email&utm_medium=email&utm_campaign=jobs-${frequency}`
}

export function jobsEmailSubject(recipient: JobsEmailRecipient): string {
  const total = recipient.jobs.length + recipient.moreCount
  const first = recipient.jobs[0]
  // No new postings: this email exists because a job they saved is closing.
  if (!first) {
    const closing = recipient.tracker?.closingSoon[0]
    return closing
      ? `Closing ${closing.closesLabel ?? 'soon'}: ${closing.title} at ${closing.company}`
      : 'Your job tracker'
  }
  const where = recipient.areaLabel === 'Alberta' ? 'Alberta' : recipient.areaLabel
  if (total === 1) return `New ${where} job: ${first.title} at ${first.company}`
  return `${total} new ${where} jobs: ${first.title} at ${first.company} and more`
}

function jobRow(job: EmailJob, frequency: string): string {
  const facts = [job.salaryText, job.ageLabel, job.closesLabel ? `Closes ${job.closesLabel}` : null]
    .filter((v): v is string => !!v)
  return `
  <tr><td style="padding:16px 0;border-bottom:1px solid #ececec;">
    <a href="${esc(tracked(`/jobs/posting/${job.slug}`, frequency))}" style="font-size:17px;font-weight:700;color:#0b57d0;text-decoration:none;line-height:1.35;">${esc(job.title)}</a>
    <p style="margin:4px 0 0 0;font-size:14px;color:#333;line-height:1.5;">${esc(job.company)} &middot; ${esc(job.city)}</p>
    ${facts.length ? `<p style="margin:4px 0 0 0;font-size:13px;color:#666;line-height:1.5;">${facts.map(esc).join(' &middot; ')}</p>` : ''}
    ${job.reasons.length ? `<p style="margin:4px 0 0 0;font-size:12px;color:#0b57d0;line-height:1.5;">Fits what you told us: ${esc(job.reasons.join(' · '))}</p>` : ''}
  </td></tr>`
}

/**
 * Their own tracker, above the new postings: the part of the email that is
 * about them. A deadline or a half-finished application is a reason to come
 * back that a list of new jobs is not.
 */
function trackerSection(tracker: TrackerSummary | null, frequency: string): string {
  if (!tracker) return ''
  const item = (t: TrackerSummary['closingSoon'][number], note: string) => `
    <p style="margin:8px 0 0 0;font-size:14px;line-height:1.5;color:#333;">
      <a href="${esc(tracked(`/jobs/posting/${t.slug}`, frequency))}" style="color:#0b57d0;font-weight:600;text-decoration:none;">${esc(t.title)}</a>
      at ${esc(t.company)} &middot; ${esc(note)}
    </p>`
  const closing = tracker.closingSoon.map(t => item(t, t.closesLabel ? `closes ${t.closesLabel}` : 'closes soon')).join('')
  const unfinished = tracker.unfinished.map(t => item(t, 'did you finish applying?')).join('')
  return `
        <tr><td style="padding:8px 28px 0 28px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#fff8e6;border:1px solid #f1dca0;border-radius:8px;">
            <tr><td style="padding:14px 16px;">
              <p style="margin:0;font-size:13px;font-weight:700;color:#7a5600;text-transform:uppercase;letter-spacing:0.4px;">Your tracker</p>
              ${closing ? `<p style="margin:8px 0 0 0;font-size:14px;font-weight:600;color:#333;">Closing soon, and you haven't applied yet</p>${closing}` : ''}
              ${unfinished ? `<p style="margin:${closing ? '14' : '8'}px 0 0 0;font-size:14px;font-weight:600;color:#333;">Started but not marked as applied</p>${unfinished}` : ''}
              <p style="margin:12px 0 0 0;font-size:13px;"><a href="${esc(tracked('/account?tab=jobs', frequency))}" style="color:#0b57d0;font-weight:600;">Update your tracker</a></p>
            </td></tr>
          </table>
        </td></tr>`
}

export function generateJobsEmailHtml(
  recipient: JobsEmailRecipient,
  links: JobsEmailLinks,
  mailingAddress: string
): string {
  const { frequency, areaLabel, jobs, moreCount } = recipient
  const total = jobs.length + moreCount
  const heading = total === 0
    ? 'A job you saved closes soon'
    : total === 1 ? `1 new job in ${areaLabel}` : `${total} new jobs in ${areaLabel}`
  const since = frequency === 'daily' ? 'since your last email' : 'this week'
  const boardUrl = tracked(recipient.boardPath, frequency)
  const cadence = frequency === 'daily'
    ? 'You get this at most once a day, and only when there is something new.'
    : 'You get this once a week, and only when there is something new.'

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(heading)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;">${esc(jobs.slice(0, 3).map(j => `${j.title} at ${j.company}`).join(' · '))}</div>
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f4;">
    <tr><td align="center" style="padding:24px 12px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background-color:#ffffff;border-radius:8px;">
        <tr><td style="padding:28px 28px 8px 28px;">
          <a href="${esc(tracked('/jobs', frequency))}" style="text-decoration:none;font-size:14px;font-weight:900;color:#0a0a0a;letter-spacing:-0.2px;">Culture Alberta Jobs</a>
          <h1 style="margin:14px 0 4px 0;font-size:24px;line-height:1.25;color:#0a0a0a;">${esc(heading)}</h1>
          <p style="margin:0;font-size:14px;color:#666;line-height:1.5;">${total === 0
            ? 'Nothing new on the board for you today, but your tracker has a deadline coming up.'
            : `Added to the board ${since}. Every link goes to the posting, and you apply on the employer's own site.`}</p>
        </td></tr>
        ${trackerSection(recipient.tracker, frequency)}
        <tr><td style="padding:0 28px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            ${jobs.map(j => jobRow(j, frequency)).join('')}
          </table>
        </td></tr>
        <tr><td style="padding:22px 28px 6px 28px;">
          <a href="${esc(boardUrl)}" style="display:inline-block;background-color:#0b57d0;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:12px 22px;border-radius:6px;">${moreCount > 0 ? `See all ${total} new jobs` : `Browse ${esc(areaLabel)} jobs`}</a>
        </td></tr>
        <tr><td style="padding:14px 28px 26px 28px;">
          <p style="margin:0;font-size:14px;color:#333;line-height:1.6;">
            ${recipient.tracker ? '' : 'Applied to something? '}<a href="${esc(tracked('/account?tab=jobs', frequency))}" style="color:#0b57d0;">Open your tracker</a>${recipient.tracker ? ' for everything you have saved and applied to.' : " to see what you've started, what you've sent and what closes soon."}
            ${recipient.personalised ? '' : `<br>Want better matches? <a href="${esc(tracked(recipient.boardPath, frequency))}" style="color:#0b57d0;">Tell us what you're looking for</a> on the board and this email will follow it.`}
          </p>
        </td></tr>
        <tr><td style="background-color:#f9f9f9;padding:22px 28px;border-top:1px solid #e8e8e8;border-radius:0 0 8px 8px;">
          <p style="margin:0;font-size:12px;color:#777;line-height:1.7;">
            You're getting this because you asked Culture Alberta to email you new Alberta jobs. ${cadence}
          </p>
          <p style="margin:10px 0 0 0;font-size:12px;line-height:1.7;">
            <a href="${esc(links.settingsUrl)}" style="color:#555;text-decoration:underline;">${frequency === 'daily' ? 'Switch to weekly' : 'Switch to daily'}</a>
            &nbsp;&middot;&nbsp;
            <a href="${esc(links.stopJobsUrl)}" style="color:#555;text-decoration:underline;">Stop jobs emails</a>
            &nbsp;&middot;&nbsp;
            <a href="${esc(links.unsubscribeAllUrl)}" style="color:#555;text-decoration:underline;">Unsubscribe from all Culture Alberta email</a>
          </p>
          <p style="margin:10px 0 0 0;font-size:11px;color:#999;line-height:1.6;">
            Sent by Culture Alberta, a Culture Media publication &middot; ${esc(mailingAddress)} &middot; <a href="mailto:hello@culturemedia.ca" style="color:#999;">hello@culturemedia.ca</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}
