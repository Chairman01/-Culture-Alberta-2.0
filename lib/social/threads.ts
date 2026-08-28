import type { SocialArticle } from './index'

// ---------------------------------------------------------------------------
// Threads (Meta) — link post with a preview card, matching the Bluesky format
// that already performs for Culture Alberta.
//
// Publishing is a two-step container model: create a container describing the
// post, then publish it by id. A TEXT container with `link_attachment` is what
// produces the rich preview card; putting the URL in the body alone gives a
// plain tappable link.
//
// Setup: developers.facebook.com → create app → add the Threads use case →
// link the @culturealberta Threads profile → generate a long-lived token with
// the `threads_basic` and `threads_content_publish` scopes.
// Env: THREADS_USER_ID, THREADS_ACCESS_TOKEN
//
// NOTE: long-lived Threads tokens expire after 60 days. When that happens every
// post here starts failing with an OAuthException — see refreshHint below.
// ---------------------------------------------------------------------------

const API = 'https://graph.threads.net/v1.0'

// Threads caps post bodies at 500 characters.
const MAX_TEXT = 500

interface ThreadsError {
  message?: string
  type?: string
  code?: number
}

function describeError(status: number, json: { error?: ThreadsError }): string {
  const err = json?.error
  if (!err) return `${status} ${JSON.stringify(json).slice(0, 300)}`

  // An expired 60-day token is the single most likely failure in production,
  // and the raw Meta message doesn't say to re-generate it — so spell it out.
  const expired = err.type === 'OAuthException' || err.code === 190
  const hint = expired
    ? ' — THREADS_ACCESS_TOKEN looks expired or revoked; generate a new long-lived token'
    : ''
  return `${status} ${err.type ?? 'Error'} ${err.code ?? ''}: ${err.message ?? ''}${hint}`.trim()
}

async function callThreads(
  path: string,
  params: Record<string, string>
): Promise<Record<string, unknown>> {
  const res = await fetch(`${API}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      ...params,
      access_token: process.env.THREADS_ACCESS_TOKEN!,
    }),
  })

  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`Threads ${path} failed: ${describeError(res.status, json)}`)
  return json
}

async function getPermalink(postId: string): Promise<string | undefined> {
  try {
    const res = await fetch(
      `${API}/${postId}?fields=permalink&access_token=${encodeURIComponent(
        process.env.THREADS_ACCESS_TOKEN!
      )}`
    )
    if (!res.ok) return undefined
    const json = await res.json()
    return typeof json.permalink === 'string' ? json.permalink : undefined
  } catch {
    return undefined // a missing permalink shouldn't mark a successful post failed
  }
}

export async function postToThreads(
  article: SocialArticle,
  articleUrl: string
): Promise<string | undefined> {
  const userId = process.env.THREADS_USER_ID!

  // The body is the headline; the link rides in link_attachment so Threads
  // renders the preview card rather than a bare URL.
  const container = await callThreads(`${userId}/threads`, {
    media_type: 'TEXT',
    text: article.title.slice(0, MAX_TEXT),
    link_attachment: articleUrl,
  })

  const creationId = container.id
  if (typeof creationId !== 'string') {
    throw new Error(`Threads container returned no id: ${JSON.stringify(container).slice(0, 200)}`)
  }

  const published = await callThreads(`${userId}/threads_publish`, {
    creation_id: creationId,
  })

  const postId = published.id
  if (typeof postId !== 'string') {
    throw new Error(`Threads publish returned no id: ${JSON.stringify(published).slice(0, 200)}`)
  }

  return await getPermalink(postId)
}
