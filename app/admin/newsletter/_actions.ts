'use server'

import { sendCityNewsletter, sendAllNewsletters, sendCityNewsletterToEmail, type SendResult } from '@/lib/newsletter/send-newsletter'
import type { NewsletterCity } from '@/lib/newsletter/template'
import { assertAdminAction } from '@/lib/admin-auth'

/**
 * The three actions in this file put mail in front of ~1,200 real people and
 * cannot be taken back once they run.
 *
 * Every one of them checks for an admin session ITSELF. Being declared inside
 * an admin page is not protection: a Server Action is a POST endpoint, and
 * middleware only gates the path, so anyone who can open /admin/newsletter can
 * invoke everything declared in it. Writers were given access to this page to
 * prepare editions -- choosing and ordering the stories -- which means the send
 * path is now reachable by a role that must never be able to use it. These
 * checks, not the buttons the UI happens to render, are what stops that.
 */

/**
 * `force` skips the minimum-interval guard in sendCityNewsletter.
 *
 * The guard exists to stop a city being mailed twice in quick succession, but
 * it has to be overridable by a deliberate human action — otherwise a genuine
 * resend (a broken link, a correction, or simply choosing to send early) is
 * impossible for up to 20 hours. The admin UI asks for confirmation before
 * passing it, so forcing is always an explicit choice rather than a default.
 */
export async function triggerCityNewsletter(
  city: NewsletterCity,
  customNote?: string,
  force = false,
): Promise<SendResult> {
  await assertAdminAction('triggerCityNewsletter')
  return sendCityNewsletter(city, { customNote, force })
}

export async function triggerAllNewsletters(): Promise<SendResult[]> {
  await assertAdminAction('triggerAllNewsletters')
  return sendAllNewsletters()
}

export async function sendTestNewsletter(city: NewsletterCity, toEmail: string, customNote?: string): Promise<SendResult> {
  await assertAdminAction('sendTestNewsletter')
  return sendCityNewsletterToEmail(city, toEmail, { customNote })
}
