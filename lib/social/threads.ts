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

// Threads promotes only the FIRST hashtag to a real topic tag — it appears
// beside the account name in the header and is stripped out of the body. The
// rest stay as visible plain-text hashtags, which is still what a reader scans
// for, so carry the same five Bluesky does with the city leading.
const MAX_HASHTAGS = 5

// How long to let Meta finish building the container before publishing.
const CONTAINER_POLL_MS = 2_000
const CONTAINER_MAX_WAIT_MS = 24_000

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

  // Only code 190 actually means the token is gone. Meta reports plenty of
  // transient failures as OAuthException too — notably code -1 "Fatal" — and
  // blaming the token for those sends you off regenerating a working one.
  let hint = ''
  if (err.code === 190) {
    hint = ` — the ${account} Threads token is expired or revoked; run scripts/threads-token.mjs to issue a new one`
  } else if (err.code === -1) {
    hint = ` — Meta's generic transient error, not necessarily the token; verify with scripts/threads-token.mjs check before regenerating anything`
  }
  return `${status} ${err.type ?? 'Error'} ${err.code ?? ''}: ${err.message ?? ''}${hint}`.trim()
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Meta builds the container asynchronously — for a link post it has to go and
 * fetch the article to render the preview card — and publishing before that
 * finishes fails with a generic OAuthException. So wait for FINISHED.
 *
 * Meta suggests polling once a minute for up to five, but that's sized for
 * video; a link preview resolves in seconds and this runs inside a serverless
 * request, so poll faster over a much shorter window.
 */
async function waitForContainer(
  creationId: string,
  account: ThreadsAccount
): Promise<string | undefined> {
  const deadline = Date.now() + CONTAINER_MAX_WAIT_MS

  for (;;) {
    let status: string | undefined
    let errorMessage: string | undefined
    try {
      const res = await fetch(
        `${API}/${creationId}?fields=status,error_message&access_token=${encodeURIComponent(
          account.accessToken
        )}`
      )
      if (res.ok) {
        const json = await res.json()
        status = json.status
        errorMessage = json.error_message
      }
    } catch {
      // A failed status check is not itself fatal — fall through and retry.
    }

    if (status === 'FINISHED' || status === 'PUBLISHED') return status
    if (status === 'ERROR' || status === 'EXPIRED') {
      throw new Error(`Threads container ${status}: ${errorMessage ?? 'no detail given'}`)
    }
    // Publish anyway once the window closes: the status field is undocumented
    // enough that a missing value shouldn't block an otherwise fine post.
    if (Date.now() >= deadline) return status

    await sleep(CONTAINER_POLL_MS)
  }
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
 * Headline, then a line of hashtags with the city first.
 *
 * The city leads because Threads turns the first hashtag into the post's topic
 * tag — the one shown next to the account name — and a local reader is likelier
 * to follow #Calgary than #Arson.
 */
export function buildThreadsText(article: SocialArticle): string {
  const hashtags = collectHashtags(article, MAX_HASHTAGS)
  const suffix = hashtags.length > 0 ? `\n\n${hashtags.map((t) => `#${t}`).join(' ')}` : ''

  let title = article.title.trim()
  if ([...title].length + [...suffix].length > MAX_TEXT) {
    const room = Math.max(0, MAX_TEXT - [...suffix].length - 1)
    title = [...title].slice(0, room).join('').trimEnd() + '…'
  }

  return `${title}${suffix}`
}

/** Build a container and wait for Meta to finish it, retrying once. */
async function prepareContainer(
  article: SocialArticle,
  articleUrl: string,
  account: ThreadsAccount
): Promise<string> {
  // The body is the headline plus hashtags; the link rides in link_attachment
  // so Threads renders the preview card rather than a bare URL.
  const params = {
    media_type: 'TEXT',
    text: buildThreadsText(article),
    link_attachment: articleUrl,
  }

  const container = await callThreads(`${account.userId}/threads`, params, account)
  const creationId = container.id
  if (typeof creationId !== 'string') {
    throw new Error(`Threads container returned no id: ${JSON.stringify(container).slice(0, 200)}`)
  }

  try {
    await waitForContainer(creationId, account)
    return creationId
  } catch (err) {
    // A container can come back ERROR with no explanation and then build fine
    // seconds later on identical input — verified by replaying a rejected post.
    // Treat the first one as noise and build a second; the failed container is
    // never published, so this cannot duplicate anything.
    console.warn('⚠️ Threads container failed, rebuilding once:', err)
    await sleep(CONTAINER_POLL_MS)

    const retry = await callThreads(`${account.userId}/threads`, params, account)
    const retryId = retry.id
    if (typeof retryId !== 'string') throw err

    await waitForContainer(retryId, account)
    return retryId
  }
}

export async function postToThreads(
  article: SocialArticle,
  articleUrl: string,
  account: ThreadsAccount
): Promise<string | undefined> {
  const creationId = await prepareContainer(article, articleUrl, account)

  let published: Record<string, unknown>
  try {
    published = await callThreads(
      `${account.userId}/threads_publish`,
      { creation_id: creationId },
      account
    )
  } catch (err) {
    // One retry: Meta's transient failures here clear in seconds. Re-check the
    // container first — if that flaky response actually landed, publishing
    // again would duplicate the post, so stop and treat it as sent.
    await sleep(CONTAINER_POLL_MS)
    if ((await waitForContainer(creationId, account)) === 'PUBLISHED') return undefined

    published = await callThreads(
      `${account.userId}/threads_publish`,
      { creation_id: creationId },
      account
    ).catch(() => {
      throw err // surface the original failure, not the retry's
    })
  }

  const postId = published.id
  if (typeof postId !== 'string') {
    throw new Error(`Threads publish returned no id: ${JSON.stringify(published).slice(0, 200)}`)
  }

  return await getPermalink(postId, account)
}
