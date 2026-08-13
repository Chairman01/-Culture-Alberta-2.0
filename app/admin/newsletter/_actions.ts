'use server'

import { sendCityNewsletter, sendAllNewsletters, sendCityNewsletterToEmail, type SendResult } from '@/lib/newsletter/send-newsletter'
import type { NewsletterCity } from '@/lib/newsletter/template'

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
  return sendCityNewsletter(city, { customNote, force })
}

export async function triggerAllNewsletters(): Promise<SendResult[]> {
  return sendAllNewsletters()
}

export async function sendTestNewsletter(city: NewsletterCity, toEmail: string, customNote?: string): Promise<SendResult> {
  return sendCityNewsletterToEmail(city, toEmail, { customNote })
}
