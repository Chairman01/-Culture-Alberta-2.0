import { Resend } from 'resend'
import { getServiceClient } from '@/lib/supabase-admin'
import { makeUnsubscribeToken } from '@/lib/newsletter/send-newsletter'
import { buildJobsEmails, type JobsEmailRecipient } from './build'
import { generateJobsEmailHtml, jobsEmailSubject, type JobsEmailLinks } from './template'

/**
 * Sends the jobs email to everyone who is due one.
 *
 * ── READ THIS BEFORE TOUCHING IT ─────────────────────────────────────────────
 *
 * This mails real people on a schedule. It is safe because of four things, and
 * each of them is load-bearing:
 *
 *  1. It only runs when armed (see jobsEmailArmed). Deploying it sends nothing.
 *  2. Recipients come only from subscribers whose topics include 'jobs' — the
 *     consent record. A culture-newsletter reader is never on this list.
 *  3. Each send is claimed first by inserting a jobs_email_log row whose
 *     (subscription, Mountain-time day) is unique. Two overlapping runs cannot
 *     both mail one person, and nobody gets two jobs emails in a day.
 *  4. A person with nothing new is skipped, not mailed an empty email.
 *
 * Never call the route that wraps this to "check it works" — see
 * app/api/cron/jobs-email/route.ts. Use the admin preview instead.
 */

const FROM = 'Culture Alberta Jobs <news@culturemedia.ca>'
const SITE_URL = 'https://www.culturealberta.com'
const BATCH_SIZE = 50

let _resend: Resend | null = null
function getResend(): Resend {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY)
  return _resend
}

/**
 * CASL requires a postal address in every commercial email. The same variable
 * the partnerships mailer uses; one address, one place to set it.
 */
export function jobsEmailMailingAddress(): string | null {
  return process.env.CRM_MAILING_ADDRESS?.trim() || null
}

/** Set JOBS_EMAIL_SENDS=true in Vercel to let this mail people. */
export function jobsEmailArmed(): { armed: boolean; reason?: string } {
  if (process.env.JOBS_EMAIL_SENDS !== 'true') {
    return { armed: false, reason: 'JOBS_EMAIL_SENDS is not set to true' }
  }
  if (!jobsEmailMailingAddress()) {
    return { armed: false, reason: 'CRM_MAILING_ADDRESS is not set (required in every email)' }
  }
  if (!process.env.RESEND_API_KEY) {
    return { armed: false, reason: 'RESEND_API_KEY is not set' }
  }
  return { armed: true }
}

export function jobsEmailLinks(recipient: Pick<JobsEmailRecipient, 'subscriptionId' | 'email'>): JobsEmailLinks {
  const token = encodeURIComponent(makeUnsubscribeToken(recipient.subscriptionId, recipient.email))
  return {
    stopJobsUrl: `${SITE_URL}/api/newsletter/unsubscribe?token=${token}&topic=jobs`,
    unsubscribeAllUrl: `${SITE_URL}/api/newsletter/unsubscribe?token=${token}`,
    settingsUrl: `${SITE_URL}/jobs/email?token=${token}`,
  }
}

/** Calendar day in Alberta, which is what "once a day" means to a reader. */
function mountainDate(now: Date): string {
  return now.toLocaleDateString('en-CA', { timeZone: 'America/Edmonton' })
}

export interface JobsEmailRunResult {
  armed: boolean
  reason?: string
  subscribers: number
  due: number
  nothingNew: number
  wouldSend: number
  sent: number
  failed: number
  errors: string[]
}

export async function runJobsEmail(now: Date = new Date()): Promise<JobsEmailRunResult> {
  const { armed, reason } = jobsEmailArmed()
  const plan = await buildJobsEmails({ now })

  const result: JobsEmailRunResult = {
    armed, reason,
    subscribers: plan.subscribers,
    due: plan.due,
    nothingNew: plan.nothingNew,
    wouldSend: plan.recipients.length,
    sent: 0, failed: 0, errors: [],
  }
  if (!armed || plan.recipients.length === 0) return result

  const supabase = getServiceClient()
  const mailingAddress = jobsEmailMailingAddress()!
  const sendDate = mountainDate(now)

  for (let i = 0; i < plan.recipients.length; i += BATCH_SIZE) {
    const batch = plan.recipients.slice(i, i + BATCH_SIZE)

    // Claim before sending. A row that fails to insert means this person was
    // already claimed today by another run, so they are dropped from the batch.
    const claimed: JobsEmailRecipient[] = []
    for (const recipient of batch) {
      const { error } = await supabase.from('jobs_email_log').insert({
        subscription_id: recipient.subscriptionId,
        send_date: sendDate,
        frequency: recipient.frequency,
        job_ids: recipient.jobs.map(j => j.id),
        subject: jobsEmailSubject(recipient),
      })
      if (!error) claimed.push(recipient)
    }
    if (claimed.length === 0) continue

    const payloads = claimed.map(recipient => {
      const links = jobsEmailLinks(recipient)
      return {
        from: FROM,
        to: recipient.email,
        subject: jobsEmailSubject(recipient),
        html: generateJobsEmailHtml(recipient, links, mailingAddress),
        headers: {
          // One-click (RFC 8058): stops the jobs emails only, which is the list
          // this message belongs to.
          'List-Unsubscribe': `<${links.stopJobsUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      }
    })

    let failure: string | null = null
    try {
      const { error } = await getResend().batch.send(payloads)
      if (error) failure = error.message
    } catch (err) {
      failure = err instanceof Error ? err.message : 'Unknown error'
    }

    if (failure) {
      // Nothing went out, so release the claims: these readers are due again
      // on the next run instead of silently losing a day.
      await supabase
        .from('jobs_email_log')
        .delete()
        .eq('send_date', sendDate)
        .in('subscription_id', claimed.map(r => r.subscriptionId))
      result.failed += claimed.length
      result.errors.push(`Batch failed: ${failure}`)
    } else {
      result.sent += claimed.length
    }

    if (i + BATCH_SIZE < plan.recipients.length) {
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }

  return result
}
