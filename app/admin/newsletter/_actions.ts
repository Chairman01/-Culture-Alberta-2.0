'use server'

import { sendCityNewsletter, sendAllNewsletters, sendCityNewsletterToEmail, type SendResult } from '@/lib/newsletter/send-newsletter'
import type { NewsletterCity } from '@/lib/newsletter/template'

export async function triggerCityNewsletter(city: NewsletterCity, customNote?: string): Promise<SendResult> {
  return sendCityNewsletter(city, { customNote })
}

export async function triggerAllNewsletters(): Promise<SendResult[]> {
  return sendAllNewsletters()
}

export async function sendTestNewsletter(city: NewsletterCity, toEmail: string, customNote?: string): Promise<SendResult> {
  return sendCityNewsletterToEmail(city, toEmail, { customNote })
}
