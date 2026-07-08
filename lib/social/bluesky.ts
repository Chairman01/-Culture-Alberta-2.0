import type { SocialArticle } from './index'

// ---------------------------------------------------------------------------
// Bluesky — link post with a rich link card (external embed), matching the
// manual posting format that already performs well for Culture Alberta.
// Auth: app password (Settings → Privacy & Security → App Passwords).
// Env: BLUESKY_HANDLE (e.g. culturealberta.com), BLUESKY_APP_PASSWORD
// ---------------------------------------------------------------------------

const PDS = 'https://bsky.social'
// Bluesky rejects blobs over 1MB — skip the thumbnail rather than fail the post
const MAX_THUMB_BYTES = 950_000

interface BskySession {
  accessJwt: string
  did: string
  handle: string
}

async function createSession(): Promise<BskySession> {
  const res = await fetch(`${PDS}/xrpc/com.atproto.server.createSession`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: process.env.BLUESKY_HANDLE,
      password: process.env.BLUESKY_APP_PASSWORD,
    }),
  })
  if (!res.ok) throw new Error(`Bluesky login failed: ${res.status} ${await res.text()}`)
  return res.json()
}

async function uploadThumb(session: BskySession, imageUrl: string): Promise<unknown | undefined> {
  try {
    const imgRes = await fetch(imageUrl)
    if (!imgRes.ok) return undefined
    const contentType = imgRes.headers.get('content-type') || 'image/jpeg'
    const bytes = await imgRes.arrayBuffer()
    if (bytes.byteLength > MAX_THUMB_BYTES) return undefined

    const upRes = await fetch(`${PDS}/xrpc/com.atproto.repo.uploadBlob`, {
      method: 'POST',
      headers: {
        'Content-Type': contentType,
        Authorization: `Bearer ${session.accessJwt}`,
      },
      body: bytes,
    })
    if (!upRes.ok) return undefined
    const json = await upRes.json()
    return json.blob
  } catch {
    return undefined // a missing thumbnail should never block the post
  }
}

export async function postToBluesky(
  article: SocialArticle,
  articleUrl: string
): Promise<string | undefined> {
  const session = await createSession()

  const thumb = article.imageUrl ? await uploadThumb(session, article.imageUrl) : undefined

  const record: Record<string, unknown> = {
    $type: 'app.bsky.feed.post',
    text: article.title.slice(0, 300),
    createdAt: new Date().toISOString(),
    langs: ['en'],
    embed: {
      $type: 'app.bsky.embed.external',
      external: {
        uri: articleUrl,
        title: article.title.slice(0, 300),
        description: (article.excerpt || '').slice(0, 300),
        ...(thumb ? { thumb } : {}),
      },
    },
  }

  const res = await fetch(`${PDS}/xrpc/com.atproto.repo.createRecord`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.accessJwt}`,
    },
    body: JSON.stringify({
      repo: session.did,
      collection: 'app.bsky.feed.post',
      record,
    }),
  })
  if (!res.ok) throw new Error(`Bluesky post failed: ${res.status} ${await res.text()}`)

  const json = await res.json()
  // uri format: at://did:plc:xxx/app.bsky.feed.post/rkey → public URL
  const rkey = String(json.uri || '').split('/').pop()
  return rkey ? `https://bsky.app/profile/${session.handle}/post/${rkey}` : undefined
}
