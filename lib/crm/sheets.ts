/**
 * Google Sheets as the lead inbox.
 *
 * Reuses GOOGLE_ANALYTICS_CREDENTIALS — the one read-only service account the
 * SEO collectors already authenticate with — rather than introducing a second
 * Google credential. Connecting a sheet is therefore not a credentials job at
 * all: you share the sheet with that account's email, the same way you would
 * share it with a colleague, and the sync can read it.
 *
 * Env:
 *   GOOGLE_ANALYTICS_CREDENTIALS  base64 service-account JSON (shared)
 *   CRM_SHEET_ID                  the long id from the sheet's URL
 *   CRM_SHEET_TAB                 optional: tab name, or the gid from the URL.
 *                                 Defaults to the first tab.
 *
 * Read-only by design: the scope is spreadsheets.readonly, so a bug here can
 * never write to or clear the user's sheet.
 */

import { JWT } from 'google-auth-library'
import { loadServiceAccount } from '@/lib/seo-vitals/google-credentials'
import { mapTable, type ParsedImport } from './csv'

const SCOPE = 'https://www.googleapis.com/auth/spreadsheets.readonly'

export type SheetStatus = {
  configured: boolean
  /** Who the sheet has to be shared with. Shown in the admin UI. */
  serviceAccountEmail: string | null
  sheetId: string | null
  tab: string | null
  missing: string[]
}

export function sheetStatus(): SheetStatus {
  const key = loadServiceAccount()
  const sheetId = process.env.CRM_SHEET_ID || null
  const missing: string[] = []
  if (!key) missing.push('GOOGLE_ANALYTICS_CREDENTIALS')
  if (!sheetId) missing.push('CRM_SHEET_ID')

  return {
    configured: missing.length === 0,
    serviceAccountEmail: key?.client_email ?? null,
    sheetId,
    tab: process.env.CRM_SHEET_TAB || null,
    missing,
  }
}

async function accessToken(key: { client_email: string; private_key: string }): Promise<string> {
  const jwt = new JWT({ email: key.client_email, key: key.private_key, scopes: [SCOPE] })
  const { token } = await jwt.getAccessToken()
  if (!token) throw new Error('Sheets: could not obtain an access token')
  return token
}

/**
 * Resolves CRM_SHEET_TAB to a real tab title.
 *
 * The value people paste is usually the gid out of the sheet URL, because that
 * is what is on screen when they copy the link — but the values API addresses
 * tabs by title, never by gid. So a numeric setting is looked up in the
 * spreadsheet metadata and translated. A non-numeric value is taken as a title
 * as-is, and an empty one means the first tab.
 */
async function resolveTabTitle(sheetId: string, token: string, tab: string | null): Promise<string> {
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId)}?fields=sheets.properties`,
    { headers: { Authorization: `Bearer ${token}` } },
  )

  if (response.status === 403) {
    throw new Error('SHARE_REQUIRED')
  }
  if (response.status === 404) {
    throw new Error('Sheet not found — check CRM_SHEET_ID is the long id from the sheet URL.')
  }
  if (!response.ok) {
    throw new Error(`Sheets metadata failed: HTTP ${response.status}`)
  }

  const payload = (await response.json()) as {
    sheets?: Array<{ properties?: { title?: string; sheetId?: number } }>
  }
  const tabs = (payload.sheets ?? []).map(s => s.properties).filter(Boolean) as Array<{
    title: string
    sheetId: number
  }>

  if (tabs.length === 0) throw new Error('That spreadsheet has no tabs.')
  if (!tab) return tabs[0].title

  if (/^\d+$/.test(tab)) {
    const match = tabs.find(t => String(t.sheetId) === tab)
    if (!match) {
      throw new Error(
        `No tab with gid ${tab}. Available: ${tabs.map(t => `${t.title} (gid ${t.sheetId})`).join(', ')}`,
      )
    }
    return match.title
  }

  const byTitle = tabs.find(t => t.title === tab)
  if (!byTitle) {
    throw new Error(`No tab named "${tab}". Available: ${tabs.map(t => t.title).join(', ')}`)
  }
  return byTitle.title
}

export type SheetReadResult =
  | { ok: false; reason: 'not_configured'; missing: string[] }
  | { ok: false; reason: 'share_required'; serviceAccountEmail: string }
  | { ok: false; reason: 'error'; error: string }
  | { ok: true; tab: string; parsed: ParsedImport; rowCount: number }

/**
 * Reads the configured sheet and maps it to leads. Never throws for an
 * expected condition — an unshared sheet and a missing env var are both
 * results the caller renders as instructions, not stack traces.
 */
export async function readLeadSheet(): Promise<SheetReadResult> {
  const status = sheetStatus()
  if (!status.configured) return { ok: false, reason: 'not_configured', missing: status.missing }

  const key = loadServiceAccount()!
  try {
    const token = await accessToken(key)
    const title = await resolveTabTitle(status.sheetId!, token, status.tab)

    // A1 notation without a row bound reads the whole tab. UNFORMATTED_VALUE
    // keeps a phone number typed as digits from arriving as 7.8091e+9.
    const range = encodeURIComponent(`${title}!A:Z`)
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(status.sheetId!)}/values/${range}` +
        `?valueRenderOption=UNFORMATTED_VALUE&majorDimension=ROWS`,
      { headers: { Authorization: `Bearer ${token}` } },
    )

    if (response.status === 403) {
      return { ok: false, reason: 'share_required', serviceAccountEmail: key.client_email }
    }
    if (!response.ok) {
      return { ok: false, reason: 'error', error: `Sheets read failed: HTTP ${response.status}` }
    }

    const payload = (await response.json()) as { values?: unknown[][] }
    // Sheets omits trailing empty cells, so rows arrive ragged; everything
    // downstream indexes by column, so normalise to strings and equal width.
    const raw = payload.values ?? []
    const width = raw.reduce((max, row) => Math.max(max, row.length), 0)
    const table = raw.map(row => {
      const cells = row.map(cell => (cell === null || cell === undefined ? '' : String(cell)))
      while (cells.length < width) cells.push('')
      return cells
    })

    return { ok: true, tab: title, parsed: mapTable(table), rowCount: Math.max(0, table.length - 1) }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (message === 'SHARE_REQUIRED') {
      return { ok: false, reason: 'share_required', serviceAccountEmail: key.client_email }
    }
    return { ok: false, reason: 'error', error: message }
  }
}
