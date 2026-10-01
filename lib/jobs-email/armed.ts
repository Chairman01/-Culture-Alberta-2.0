/**
 * Whether the jobs email is allowed to send. Kept apart from the sender so a
 * page can ask without pulling the mailer into its bundle.
 */

/**
 * CASL requires a postal address in every commercial email. The same variable
 * the partnerships mailer uses; one address, one place to set it.
 */
export function jobsEmailMailingAddress(): string | null {
  return process.env.CRM_MAILING_ADDRESS?.trim() || null
}

/** Set JOBS_EMAIL_SENDS=true in Vercel to let the jobs email mail people. */
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
