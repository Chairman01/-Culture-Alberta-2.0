'use server'

import { assertAdminAction } from '@/lib/admin-auth'
import {
  loadAlertArticle,
  getAlertRecipients,
  getAlertHistory,
  generateAlertHtml,
  getAlertSubject,
  sendAlertTest,
  sendAlertToEveryone,
  type AlertArticle,
  type AlertEmailInput,
  type AlertSendResult,
} from '@/lib/newsletter/alert'

/**
 * Every action here checks for an admin session itself. A Server Action is a
 * POST endpoint; living under /admin is not protection. See
 * app/admin/newsletter/_actions.ts.
 */

export interface AlertPreparation {
  article: AlertArticle
  recipientCount: number
  history: Awaited<ReturnType<typeof getAlertHistory>>
}

export async function prepareAlert(articleInput: string): Promise<AlertPreparation | { error: string }> {
  await assertAdminAction('prepareAlert')
  const article = await loadAlertArticle(articleInput)
  if (!article) return { error: 'No published article matches that link or slug.' }
  const [recipients, history] = await Promise.all([getAlertRecipients(), getAlertHistory(article.id)])
  return { article, recipientCount: recipients.length, history }
}

export async function previewAlert(
  articleInput: string,
  input: AlertEmailInput,
): Promise<{ subject: string; html: string } | { error: string }> {
  await assertAdminAction('previewAlert')
  const article = await loadAlertArticle(articleInput)
  if (!article) return { error: 'No published article matches that link or slug.' }
  return {
    subject: getAlertSubject(article, input),
    html: generateAlertHtml(article, input, '#'),
  }
}

export async function sendAlertTestEmail(
  articleInput: string,
  input: AlertEmailInput,
  toEmail: string,
): Promise<AlertSendResult> {
  await assertAdminAction('sendAlertTestEmail')
  return sendAlertTest(articleInput, input, toEmail)
}

export async function sendAlertEmailToEveryone(
  articleId: string,
  input: AlertEmailInput,
  confirmedCount: number,
): Promise<AlertSendResult> {
  const session = await assertAdminAction('sendAlertEmailToEveryone')
  return sendAlertToEveryone(articleId, input, confirmedCount, session.username)
}
