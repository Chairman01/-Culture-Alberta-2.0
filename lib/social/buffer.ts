// ---------------------------------------------------------------------------
// Buffer GraphQL client — the route Culture Alberta uses to post to X.
//
// Why Buffer and not X's own API: since April 2026 X charges $0.20 for every
// post or reply that contains a link (about $28/month at our volume). Buffer
// Essentials is a flat ~$5-6/month per channel with API access included, and
// its API takes images as public URLs and posts X threads, which is exactly
// what an image card + bullets + link reply needs.
// Research: reports/X autoposting for Culture Alberta.md (2026-10-09).
//
// Env: BUFFER_API_KEY (Buffer → Settings → API) and BUFFER_X_CHANNEL_ID (the
// @Culturealberta channel's id; /api/x/status lists the channels).
// Docs: https://developers.buffer.com
// ---------------------------------------------------------------------------

const ENDPOINT = 'https://api.buffer.com'

interface GraphQLResponse<T> {
  data?: T
  errors?: Array<{ message?: string }>
}

async function gql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const key = process.env.BUFFER_API_KEY
  if (!key) throw new Error('BUFFER_API_KEY is not set')

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  })

  const json = (await res.json().catch(() => ({}))) as GraphQLResponse<T>
  if (!res.ok || json.errors?.length) {
    const detail = json.errors?.map((e) => e.message).join('; ') || JSON.stringify(json).slice(0, 300)
    const hint = res.status === 401 ? ' — the Buffer API key is wrong or was revoked' : ''
    throw new Error(`Buffer API ${res.status}: ${detail}${hint}`)
  }
  if (!json.data) throw new Error('Buffer API returned no data')
  return json.data
}

export interface BufferChannel {
  id: string
  name: string
  service: string
}

/** Every channel on the account, across organizations. Read-only. */
export async function listBufferChannels(): Promise<BufferChannel[]> {
  const { account } = await gql<{ account: { organizations: Array<{ id: string }> } }>(
    'query Organizations { account { organizations { id } } }'
  )

  const channels: BufferChannel[] = []
  for (const org of account.organizations) {
    const { channels: found } = await gql<{ channels: BufferChannel[] }>(
      'query Channels($org: OrganizationId!) { channels(input: { organizationId: $org }) { id name service } }',
      { org: org.id }
    )
    channels.push(...found)
  }
  return channels
}

export interface XThreadPart {
  text: string
  imageUrl?: string
}

/**
 * Publish to X right now. One part is a single post; more parts become a
 * thread, each replying to the one before. Buffer publishes the thread as a
 * single unit, so a failure can't leave a lone first post behind and a retry
 * can't duplicate it.
 */
export async function publishToX(channelId: string, parts: XThreadPart[]): Promise<string> {
  if (parts.length === 0) throw new Error('Nothing to post')

  const toAssets = (p: XThreadPart) => (p.imageUrl ? [{ image: { url: p.imageUrl } }] : [])

  const input: Record<string, unknown> = {
    channelId,
    schedulingType: 'automatic',
    mode: 'shareNow',
    // For a thread Buffer requires the top-level text to match the first item.
    text: parts[0].text,
    assets: toAssets(parts[0]),
  }
  if (parts.length > 1) {
    input.metadata = {
      twitter: { thread: parts.map((p) => ({ text: p.text, assets: toAssets(p) })) },
    }
  }

  const { createPost } = await gql<{
    createPost: { post?: { id: string }; message?: string }
  }>(
    `mutation CreatePost($input: CreatePostInput!) {
      createPost(input: $input) {
        ... on PostActionSuccess { post { id } }
        ... on MutationError { message }
      }
    }`,
    { input }
  )

  if (!createPost.post?.id) {
    throw new Error(`Buffer refused the post: ${createPost.message ?? 'no reason given'}`)
  }
  return createPost.post.id
}
