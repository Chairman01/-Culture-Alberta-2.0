'use server'

import { assertAdminAction } from '@/lib/admin-auth'
import { searchArticlesForPicker } from '@/lib/newsletter/config'
import {
  resolveAlertArticle,
  loadMoreArticles,
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
  const article = await resolveAlertArticle(articleInput)
  if (!article) return { error: 'No published article matches that link or slug.' }
  const [recipients, history] = await Promise.all([getAlertRecipients(), getAlertHistory(article.id)])
  return { article, recipientCount: recipients.length, history }
}

export async function previewAlert(
  articleInput: string,
  input: AlertEmailInput,
): Promise<{ subject: string; html: string } | { error: string }> {
  await assertAdminAction('previewAlert')
  const article = await resolveAlertArticle(articleInput)
  if (!article) return { error: 'No published article matches that link or slug.' }
  return {
    subject: getAlertSubject(article, input),
    html: generateAlertHtml(article, input, '#', await loadMoreArticles(article.id, input.moreArticleIds)),
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

/** How many people an everyone-send reaches right now (deduplicated). */
export async function getEveryoneCount(): Promise<number> {
  await assertAdminAction('getEveryoneCount')
  return (await getAlertRecipients()).length
}

/** Look up one article to add as an extra story (link, slug or id). */
export async function findAlertArticle(linkOrId: string): Promise<AlertArticle | { error: string }> {
  await assertAdminAction('findAlertArticle')
  return (await resolveAlertArticle(linkOrId)) ?? { error: 'No published article matches that link.' }
}

/** Published articles matching a search, newest first. */
export async function searchEveryoneArticles(query: string) {
  await assertAdminAction('searchEveryoneArticles')
  const items = await searchArticlesForPicker(query)
  return items.slice(0, 8).map(a => ({ id: a.id, title: a.title, imageUrl: a.image_url, createdAt: a.created_at }))
}
