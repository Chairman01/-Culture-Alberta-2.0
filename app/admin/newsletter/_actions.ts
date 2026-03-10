'use server'

import { sendCityNewsletter, sendAllNewsletters, type SendResult } from '@/lib/newsletter/send-newsletter'
import type { NewsletterCity } from '@/lib/newsletter/template'

export async function triggerCityNewsletter(city: NewsletterCity): Promise<SendResult> {
  return sendCityNewsletter(city)
}

export async function triggerAllNewsletters(): Promise<SendResult[]> {
  return sendAllNewsletters()
}
