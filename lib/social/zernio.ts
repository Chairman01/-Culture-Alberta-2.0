// ---------------------------------------------------------------------------
// Zernio API client — the default TikTok route, in draft mode.
//
// Draft mode sends each carousel to the TikTok app's inbox instead of
// publishing it. The editor opens TikTok, reviews the slides, adds any sound
// (including trending ones, which no API can attach) and taps Post. Zernio is
// free for the first two connected accounts.
//
// Limits (Zernio/TikTok): 5 pending drafts per account per 24h — a sixth
// fails until drafts are posted or discarded in the app; TikTok app 31.8+.
//
// Env: ZERNIO_API_KEY and ZERNIO_TIKTOK_ACCOUNT_ID
// (/api/admin/tiktok/status lists the account ids).
// Docs: https://docs.zernio.com/platforms/tiktok
// ---------------------------------------------------------------------------

const BASE = 'https://zernio.com/api/v1'

function apiKey(): string {
  const key = process.env.ZERNIO_API_KEY
  if (!key) throw new Error('ZERNIO_API_KEY is not set')
  return key
}

async function call<T>(path: string, init: RequestInit = {}): Promise<{ status: number; body: T }> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${apiKey()}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  })
  const text = await res.text()
  let body: unknown = null
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    /* non-JSON body */
  }
  if (!res.ok) {
    const hint = res.status === 401 ? ' — the Zernio API key is wrong or was revoked' : ''
    throw new Error(`Zernio ${init.method ?? 'GET'} ${path} failed: ${res.status} ${JSON.stringify(body ?? text).slice(0, 400)}${hint}`)
  }
  return { status: res.status, body: body as T }
}

export interface ZernioAccount {
  _id: string
  platform: string
  username?: string
  displayName?: string
  isActive?: boolean
  needsReconnection?: boolean
}

export async function listZernioAccounts(): Promise<ZernioAccount[]> {
  const { body } = await call<{ accounts?: ZernioAccount[] }>('/accounts')
  return body?.accounts ?? []
}

export interface ZernioTikTokPost {
  accountId: string
  /** 2–35 public JPEG URLs, in slide order. */
  imageUrls: string[]
  /** Bold photo title (90 chars; Zernio strips hashtags and links from it). */
  title: string
  /** Full caption with hashtags (4,000 chars). */
  caption: string
  /** true: send to the TikTok inbox to finish in the app. */
  draft: boolean
  /** Only on direct posts: let TikTok add recommended music. */
  autoMusic: boolean
}

interface ZernioPostResponse {
  post?: {
    _id?: string
    status?: string
    platforms?: Array<{ platform?: string; status?: string; errorMessage?: string; platformPostUrl?: string | null }>
  }
}

/** Create the TikTok carousel (draft or direct). Returns Zernio's post id. */
export async function publishTikTokViaZernio(p: ZernioTikTokPost): Promise<{ id: string; url?: string }> {
  const { status, body } = await call<ZernioPostResponse>('/posts', {
    method: 'POST',
    body: JSON.stringify({
      content: p.title.slice(0, 90),
      mediaItems: p.imageUrls.slice(0, 35).map((url) => ({ type: 'image', url })),
      platforms: [{ platform: 'tiktok', accountId: p.accountId }],
      tiktokSettings: {
        media_type: 'photo',
        photo_cover_index: 0,
        description: p.caption.slice(0, 4000),
        privacy_level: 'PUBLIC_TO_EVERYONE',
        allow_comment: true,
        content_preview_confirmed: true,
        express_consent_given: true,
        draft: p.draft,
        ...(p.draft ? {} : { auto_add_music: p.autoMusic }),
      },
      publishNow: true,
    }),
  })

  // 207 is a 2xx "partial": TikTok refused it. Treat as a failure.
  const tiktok = body?.post?.platforms?.find((x) => x.platform === 'tiktok')
  if (status === 207 || tiktok?.status === 'failed' || body?.post?.status === 'failed') {
    throw new Error(`TikTok refused the post via Zernio: ${tiktok?.errorMessage ?? JSON.stringify(body).slice(0, 300)}`)
  }
  const id = body?.post?._id
  if (!id) throw new Error(`Zernio returned no post id: ${JSON.stringify(body).slice(0, 200)}`)
  return { id, url: tiktok?.platformPostUrl ?? undefined }
}
