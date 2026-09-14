/**
 * Zoho Mail — send follow-ups as the user, and read the inbox to spot replies.
 *
 * Outreach goes through Zoho rather than Resend on purpose. Resend carries the
 * newsletter to 1,259 subscribers, and cold outreach generates the bounces and
 * complaints that wreck a sending domain's reputation. Keeping the two apart
 * means a bad campaign cannot take the newsletter down with it — and 1:1 mail
 * from a real mailbox lands in the inbox far more reliably than bulk ESP mail.
 *
 * Every function is safe to call unconfigured: they return { configured: false }
 * rather than throwing, so the whole CRM deploys and runs before the OAuth
 * credentials exist. The admin UI reads that flag and says what is missing.
 *
 * Setup (once):
 *   1. api-console.zoho.com -> Add Client -> Self Client
 *   2. Scopes: ZohoMail.messages.READ,ZohoMail.messages.CREATE,
 *              ZohoMail.accounts.READ,ZohoMail.folders.READ
 *   3. Generate a code (10 minute expiry), exchange it for a refresh token
 *   4. Set ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN,
 *      ZOHO_ACCOUNT_ID and ZOHO_REGION in Vercel
 *
 * ZOHO_REGION matters and is the usual reason a working setup 400s: the token
 * and API hosts differ per data centre, and a token minted in one region is
 * rejected by every other.
 */

type Region = 'com' | 'ca' | 'eu' | 'in' | 'com.au' | 'jp'

function region(): Region {
  return (process.env.ZOHO_REGION || 'com') as Region
}

function accountsHost(): string {
  const value = region()
  // Zoho's Canadian data centre uses zohocloud.ca, not zoho.ca — a detail that
  // is easy to get wrong and produces an opaque invalid_client error.
  if (value === 'ca') return 'https://accounts.zohocloud.ca'
  return `https://accounts.zoho.${value}`
}

function apiHost(): string {
  const value = region()
  if (value === 'ca') return 'https://mail.zohocloud.ca'
  return `https://mail.zoho.${value}`
}

export function zohoConfigured(): boolean {
  return Boolean(
    process.env.ZOHO_CLIENT_ID &&
      process.env.ZOHO_CLIENT_SECRET &&
      process.env.ZOHO_REFRESH_TOKEN &&
      process.env.ZOHO_ACCOUNT_ID,
  )
}

export function zohoMissingVars(): string[] {
  return (['ZOHO_CLIENT_ID', 'ZOHO_CLIENT_SECRET', 'ZOHO_REFRESH_TOKEN', 'ZOHO_ACCOUNT_ID'] as const).filter(
    name => !process.env[name],
  )
}

/**
 * Access tokens last an hour. Cached in module scope, which on Vercel means
 * per warm lambda — good enough to avoid a refresh on every call without
 * needing anywhere to persist it.
 */
let cachedToken: { value: string; expiresAt: number } | null = null

async function accessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value

  const params = new URLSearchParams({
    refresh_token: process.env.ZOHO_REFRESH_TOKEN!,
    client_id: process.env.ZOHO_CLIENT_ID!,
    client_secret: process.env.ZOHO_CLIENT_SECRET!,
    grant_type: 'refresh_token',
  })

  const response = await fetch(`${accountsHost()}/oauth/v2/token?${params}`, { method: 'POST' })
  const payload = (await response.json()) as { access_token?: string; expires_in?: number; error?: string }

  if (!response.ok || !payload.access_token) {
    throw new Error(
      `Zoho token refresh failed (${response.status}): ${payload.error || 'no access_token'} — ` +
        `check ZOHO_REGION is "${region()}" and matches where the refresh token was minted.`,
    )
  }

  cachedToken = {
    value: payload.access_token,
    expiresAt: Date.now() + (payload.expires_in ?? 3600) * 1000,
  }
  return cachedToken.value
}

export type SendResult =
  | { configured: false; missing: string[] }
  | { configured: true; ok: true; messageId: string | null }
  | { configured: true; ok: false; error: string }

/**
 * Sends one message. Only ever called from the admin approve handler, after a
 * human has read the draft — there is no scheduled path into this function.
 */
export async function sendMail(input: {
  to: string
  subject: string
  body: string
  /** Set when replying into an existing thread so it threads properly. */
  inReplyTo?: string | null
}): Promise<SendResult> {
  if (!zohoConfigured()) return { configured: false, missing: zohoMissingVars() }

  try {
    const token = await accessToken()
    const response = await fetch(`${apiHost()}/api/accounts/${process.env.ZOHO_ACCOUNT_ID}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fromAddress: process.env.CRM_SENDER_EMAIL || 'adamharrison@culturemedia.ca',
        toAddress: input.to,
        subject: input.subject,
        content: input.body.replace(/\n/g, '<br>'),
        mailFormat: 'html',
        ...(input.inReplyTo ? { inReplyTo: input.inReplyTo } : {}),
      }),
    })

    const payload = (await response.json()) as { data?: { messageId?: string }; status?: { description?: string } }
    if (!response.ok) {
      return { configured: true, ok: false, error: payload.status?.description || `HTTP ${response.status}` }
    }
    return { configured: true, ok: true, messageId: payload.data?.messageId ?? null }
  } catch (error) {
    return { configured: true, ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export type InboxMessage = {
  messageId: string
  fromAddress: string
  subject: string
  receivedAt: string
}

/**
 * Recent inbox messages, used to detect replies from leads. Reads only — this
 * never marks anything read or moves it, so it cannot disturb the real mailbox.
 */
export async function recentInbox(
  limit = 50,
): Promise<{ configured: false; missing: string[] } | { configured: true; messages: InboxMessage[] }> {
  if (!zohoConfigured()) return { configured: false, missing: zohoMissingVars() }

  const token = await accessToken()
  const response = await fetch(
    `${apiHost()}/api/accounts/${process.env.ZOHO_ACCOUNT_ID}/messages/view?limit=${limit}&sortBy=date&sortorder=false`,
    { headers: { Authorization: `Zoho-oauthtoken ${token}` } },
  )

  if (!response.ok) throw new Error(`Zoho inbox read failed: HTTP ${response.status}`)

  const payload = (await response.json()) as {
    data?: Array<{ messageId?: string; fromAddress?: string; subject?: string; receivedTime?: string }>
  }

  return {
    configured: true,
    messages: (payload.data ?? []).map(message => ({
      messageId: message.messageId ?? '',
      // Zoho returns "Name <addr@host>" in some views and a bare address in others.
      fromAddress: (message.fromAddress ?? '').replace(/^.*<|>.*$/g, '').toLowerCase().trim(),
      subject: message.subject ?? '',
      receivedAt: message.receivedTime ?? '',
    })),
  }
}
