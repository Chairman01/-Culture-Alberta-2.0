import type { SocialArticle } from './index'
import { collectHashtags } from './hashtags'

// ---------------------------------------------------------------------------
// Threads (Meta) — link post with a preview card, matching the Bluesky format
// that already performs for Culture Alberta.
//
// Publishing is a two-step container model: create a container describing the
// post, then publish it by id. A TEXT container with `link_attachment` is what
// produces the rich preview card; putting the URL in the body alone gives a
// plain tappable link.
//
// Credentials are passed in rather than read from the environment here, because
// Culture Alberta runs more than one Threads account and each is routed a
// different slice of the articles — see PLATFORMS in ./index.
//
// Setup: developers.facebook.com → create app → add the Threads use case →
// link the profile → generate a long-lived token with the `threads_basic` and
// `threads_content_publish` scopes. scripts/threads-token.mjs does the exchange.
//
// NOTE: long-lived Threads tokens expire after 60 days, and an expired one
// cannot be refreshed — only replaced by redoing the OAuth flow.
// ---------------------------------------------------------------------------

const API = 'https://graph.threads.net/v1.0'

// Threads caps post bodies at 500 characters.
const MAX_TEXT = 500

export interface ThreadsAccount {
  /** Which account this is, for error messages: "alberta" | "yyc". */
  label: string
  userId: string
  accessToken: string
}

interface ThreadsError {
  message?: string
  type?: string
  code?: number
}

function describeError(status: number, json: { error?: ThreadsError }, account: string): string {
  const err = json?.error
  if (!err) return `${status} ${JSON.stringify(json).slice(0, 300)}`

  // An expired 60-day token is the single most likely failure in production,
  // and the raw Meta message doesn't say to re-generate it — so spell it out,
  // including which account's token it is.
  const expired = err.type === 'OAuthException' || err.code === 190
  const hint = expired
    ? ` — the ${account} Threads token looks expired or revoked; run scripts/threads-token.mjs to issue a new one`
    : ''
  return `${status} ${err.type ?? 'Error'} ${err.code ?? ''}: ${err.message ?? ''}${hint}`.trim()
}

async function callThreads(
  path: string,
  params: Record<string, string>,
  account: ThreadsAccount
): Promise<Record<string, unknown>> {
  const res = await fetch(`${API}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ ...params, access_token: account.accessToken }),
  })

  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(`Threads ${path} failed: ${describeError(res.status, json, account.label)}`)
  }
  return json
}

async function getPermalink(postId: string, account: ThreadsAccount): Promise<string | undefined> {
  try {
    const res = await fetch(
      `${API}/${postId}?fields=permalink&access_token=${encodeURIComponent(account.accessToken)}`
    )
    if (!res.ok) return undefined
    const json = await res.json()
    return typeof json.permalink === 'string' ? json.permalink : undefined
  } catch {
    return undefined // a missing permalink shouldn't mark a successful post failed
  }
}

/**
 * Headline, then the city as a single hashtag.
 *
 * Threads promotes only ONE tag per post to a real topic tag — deliberately,
 * to stop tag stuffing — so unlike Bluesky there's nothing to gain from listing
 * the article's other tags. The city is the one worth spending it on.
 */
export function buildThreadsText(article: SocialArticle): string {
  const [cityTag] = collectHashtags(article, 1)
  const suffix = cityTag ? `\n\n#${cityTag}` : ''

  let title = article.title.trim()
  if ([...title].length + [...suffix].length > MAX_TEXT) {
    const room = Math.max(0, MAX_TEXT - [...suffix].length - 1)
    title = [...title].slice(0, room).join('').trimEnd() + '…'
  }

  return `${title}${suffix}`
}

export async function postToThreads(
  article: SocialArticle,
  articleUrl: string,
  account: ThreadsAccount
): Promise<string | undefined> {
  // The body is the headline plus the city tag; the link rides in
  // link_attachment so Threads renders the preview card rather than a bare URL.
  const container = await callThreads(
    `${account.userId}/threads`,
    {
      media_type: 'TEXT',
      text: buildThreadsText(article),
      link_attachment: articleUrl,
    },
    account
  )

  const creationId = container.id
  if (typeof creationId !== 'string') {
    throw new Error(`Threads container returned no id: ${JSON.stringify(container).slice(0, 200)}`)
  }

  const published = await callThreads(
    `${account.userId}/threads_publish`,
    { creation_id: creationId },
    account
  )

  const postId = published.id
  if (typeof postId !== 'string') {
    throw new Error(`Threads publish returned no id: ${JSON.stringify(published).slice(0, 200)}`)
  }

  return await getPermalink(postId, account)
}
