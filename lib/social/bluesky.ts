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

// Post bodies cap at 300 graphemes. Five hashtags is enough to carry the city
// and the story's subject without the post reading as tag spam.
const MAX_POST_GRAPHEMES = 300
const MAX_HASHTAGS = 5

interface TagFacet {
  index: { byteStart: number; byteEnd: number }
  features: Array<{ $type: 'app.bsky.richtext.facet#tag'; tag: string }>
}

/**
 * "grande prairie" → "GrandePrairie". Bluesky tags can't hold spaces or
 * punctuation, and it rejects a tag with no letter in it.
 */
export function toHashtag(raw: string): string | null {
  const words = raw
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .split(' ')
    .filter(Boolean)
  if (words.length === 0) return null

  const tag = words.map((w) => w[0].toUpperCase() + w.slice(1)).join('')
  if (tag.length > 64 || !/\p{L}/u.test(tag)) return null
  return tag
}

/** City first — it's the tag a local reader is most likely to follow. */
function collectHashtags(article: SocialArticle): string[] {
  const tags: string[] = []
  const seen = new Set<string>()

  for (const raw of [article.category, ...(article.tags ?? [])]) {
    if (tags.length >= MAX_HASHTAGS) break
    if (!raw) continue

    const tag = toHashtag(raw)
    if (!tag) continue

    // The category is usually repeated in the tag list — keep the first only.
    const key = tag.toLowerCase()
    if (seen.has(key)) continue

    seen.add(key)
    tags.push(tag)
  }

  return tags
}

/**
 * Headline first, then a line of hashtags.
 *
 * A "#tag" typed into the body is inert on Bluesky — it only becomes a real,
 * followable tag if the record carries a matching facet. The facet's byte range
 * covers the whole "#tag" token including the hash, while the tag value itself
 * must not include it, and the offsets are UTF-8 bytes rather than characters.
 */
export function buildPost(article: SocialArticle): { text: string; facets: TagFacet[] } {
  const hashtags = collectHashtags(article)
  const suffix = hashtags.map((t) => `#${t}`).join(' ')
  // +2 for the blank line between the headline and the tags.
  const suffixLength = suffix ? [...suffix].length + 2 : 0

  // Counting code points rather than graphemes can only over-estimate the
  // length, which trims a little early instead of getting the post rejected.
  let title = article.title.trim()
  if ([...title].length + suffixLength > MAX_POST_GRAPHEMES) {
    const room = Math.max(0, MAX_POST_GRAPHEMES - suffixLength - 1) // -1 for the ellipsis
    title = [...title].slice(0, room).join('').trimEnd() + '…'
  }

  const text = suffix ? `${title}\n\n${suffix}` : title

  const facets: TagFacet[] = []
  let cursor = Buffer.byteLength(title, 'utf8') + (suffix ? 2 : 0)
  for (const tag of hashtags) {
    const byteStart = cursor
    const byteEnd = byteStart + Buffer.byteLength(`#${tag}`, 'utf8')
    facets.push({
      index: { byteStart, byteEnd },
      features: [{ $type: 'app.bsky.richtext.facet#tag', tag }],
    })
    cursor = byteEnd + 1 // the single space separating tags
  }

  return { text, facets }
}

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

  const { text, facets } = buildPost(article)

  const record: Record<string, unknown> = {
    $type: 'app.bsky.feed.post',
    text,
    ...(facets.length > 0 ? { facets } : {}),
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
