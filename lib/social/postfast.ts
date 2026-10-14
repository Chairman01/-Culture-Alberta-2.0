// ---------------------------------------------------------------------------
// PostFast API client — the TikTok route, because it is the only affordable
// API that lets us choose the exact sound for a photo carousel.
// Research: reports/TikTok autoposting with music.md (2026-10-09).
//
// Env: POSTFAST_API_KEY (PostFast → Settings → API) and
//      POSTFAST_TIKTOK_ACCOUNT_ID (the TikTok account's id; /api/admin/tiktok/status lists them).
// Docs: https://postfa.st/docs
//
// Sounds come from TikTok's Commercial Music Library (business-cleared), via
// GET /social-media/:id/tiktok-sounds. A chosen sound and auto-music can't be
// combined (400 tiktokMusic.conflictAutoAddMusic).
// ---------------------------------------------------------------------------

const BASE = 'https://api.postfa.st'

function apiKey(): string {
  const key = process.env.POSTFAST_API_KEY
  if (!key) throw new Error('POSTFAST_API_KEY is not set')
  return key
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'pf-api-key': apiKey(), 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  })
  const text = await res.text()
  let json: unknown = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    /* non-JSON error body */
  }
  if (!res.ok) {
    const detail = JSON.stringify(json ?? text).slice(0, 400)
    let hint = ''
    if (res.status === 401) hint = ' — the PostFast API key is wrong or was regenerated'
    if (detail.includes('requiresBusinessApi')) hint = ' — reconnect the TikTok account once from the PostFast dashboard (Accounts page)'
    throw new Error(`PostFast ${init.method ?? 'GET'} ${path} failed: ${res.status} ${detail}${hint}`)
  }
  return json as T
}

export interface PostFastAccount {
  id: string
  platform?: string
  displayName?: string
  platformUsername?: string
  connectionStatus?: string
  [k: string]: unknown
}

export async function listPostFastAccounts(): Promise<PostFastAccount[]> {
  const data = await call<PostFastAccount[] | { data?: PostFastAccount[] }>('/social-media/my-social-accounts')
  return Array.isArray(data) ? data : (data?.data ?? [])
}

export interface TikTokSound {
  musicSoundId: string
  name: string
  artist?: string
  duration?: number
  thumbnailUrl?: string
  previewUrl?: string
  rankPosition?: number
  genres?: string[]
}

export interface SoundQuery {
  genre?: string
  countryCode?: string
  dateRange?: '1DAY' | '7DAY' | '30DAY' | '90DAY'
}

// TikTok refreshes the chart about daily and PostFast caches ~6h; a short
// in-memory cache keeps the editor's picker from burning the hourly limit.
const soundCache = new Map<string, { at: number; sounds: TikTokSound[] }>()
const SOUND_TTL_MS = 30 * 60 * 1000

export async function listTikTokSounds(accountId: string, q: SoundQuery = {}): Promise<TikTokSound[]> {
  const params = new URLSearchParams({
    genre: q.genre || 'ALL',
    countryCode: q.countryCode || 'CA',
    dateRange: q.dateRange || '7DAY',
  })
  const cacheKey = `${accountId}?${params}`
  const hit = soundCache.get(cacheKey)
  if (hit && Date.now() - hit.at < SOUND_TTL_MS) return hit.sounds

  const sounds = await call<TikTokSound[]>(`/social-media/${encodeURIComponent(accountId)}/tiktok-sounds?${params}`)
  soundCache.set(cacheKey, { at: Date.now(), sounds: sounds ?? [] })
  return sounds ?? []
}

/**
 * PostFast takes media as its own storage keys, not URLs: ask for signed
 * upload URLs, PUT each image, then reference the keys in the post.
 */
async function uploadJpegs(images: Buffer[]): Promise<string[]> {
  const keys: string[] = []
  // At most 8 images per signed-URL request.
  for (let i = 0; i < images.length; i += 8) {
    const batch = images.slice(i, i + 8)
    const urls = await call<Array<{ key: string; signedUrl: string }>>('/file/get-signed-upload-urls', {
      method: 'POST',
      body: JSON.stringify({ contentType: 'image/jpeg', count: batch.length }),
    })
    await Promise.all(
      batch.map(async (img, j) => {
        const put = await fetch(urls[j].signedUrl, {
          method: 'PUT',
          headers: { 'Content-Type': 'image/jpeg' },
          body: new Uint8Array(img),
        })
        if (!put.ok) throw new Error(`PostFast image upload failed: ${put.status}`)
      })
    )
    keys.push(...urls.map((u) => u.key))
  }
  return keys
}

export interface TikTokCarousel {
  accountId: string
  /** 2–10 JPEG slides, in order. */
  slides: Buffer[]
  /** Description: keywords first, then hashtags (4,000 max). */
  caption: string
  /** Bold title above the caption (90 max). */
  title: string
  /** A Commercial Music Library sound; when absent, autoMusic decides. */
  soundId?: string | null
  soundName?: string | null
  /** Let TikTok pick music when no sound is chosen. */
  autoMusic: boolean
}

/** Publish a TikTok photo carousel. Returns PostFast's post id. */
export async function publishTikTokCarousel(c: TikTokCarousel): Promise<string> {
  if (c.slides.length < 2) throw new Error('A TikTok carousel needs at least 2 slides')
  const keys = await uploadJpegs(c.slides.slice(0, 10))

  // PostFast has no "publish now"; scheduledAt must be in the future, so the
  // post goes out about a minute after the article.
  const scheduledAt = new Date(Date.now() + 90_000).toISOString()

  const controls: Record<string, unknown> = {
    tiktokTitle: c.title.slice(0, 90),
    tiktokPrivacy: 'PUBLIC',
    tiktokAllowComments: true,
  }
  if (c.soundId) {
    controls.tiktokMusicSoundId = c.soundId
    if (c.soundName) controls.tiktokMusicSoundName = c.soundName.slice(0, 256)
  } else if (c.autoMusic) {
    controls.tiktokAutoAddMusic = true
  }

  const res = await call<{ postIds?: string[] }>('/social-posts', {
    method: 'POST',
    body: JSON.stringify({
      posts: [
        {
          socialMediaId: c.accountId,
          content: c.caption.slice(0, 4000),
          mediaItems: keys.map((key, i) => ({ key, type: 'IMAGE', sortOrder: i })),
          scheduledAt,
        },
      ],
      controls,
    }),
  })

  const id = res?.postIds?.[0]
  if (!id) throw new Error(`PostFast returned no post id: ${JSON.stringify(res).slice(0, 200)}`)
  return id
}
