import type { SocialArticle } from './index'
import { collectHashtags } from './hashtags'
import { getPinterestToken } from './pinterest-tokens'

// ---------------------------------------------------------------------------
// Pinterest — one Pin per article, built from the 1000x1500 card that
// /api/pin/<slug> renders from the article's own photo and headline.
//
// Pinterest is a search engine more than a feed: a Pin keeps sending traffic
// for months, which is why it suits guides, openings, jobs and rankings and
// not crime or missing-person stories. isPinnable() keeps those off the board.
//
// Auth is the OAuth token stored in social_tokens by /api/pinterest/connect —
// see ./pinterest-tokens. Env: PINTEREST_APP_ID, PINTEREST_APP_SECRET and
// PINTEREST_BOARD_ID (the board that takes anything without a city board).
//
// Board routing: a board named exactly after the article's city — "Edmonton",
// "Calgary", "Red Deer" — gets that city's stories; everything else lands on
// PINTEREST_BOARD_ID. Boards are matched by name so a new city needs no
// deploy, just a new board. /api/pinterest/status lists boards and their ids.
// ---------------------------------------------------------------------------

const API = 'https://api.pinterest.com/v5'
const SITE = 'https://www.culturealberta.com'

// Pinterest's own field limits.
const MAX_TITLE = 100
const MAX_DESCRIPTION = 800
const MAX_ALT_TEXT = 500
const MAX_HASHTAGS = 5

// The board list changes rarely; one lookup per lambda per hour is plenty.
const BOARDS_TTL_MS = 60 * 60 * 1000

export interface PinterestBoard {
  id: string
  name: string
  privacy?: string
}

interface PinterestError {
  code?: number
  message?: string
}

/**
 * Stories that have no place on a board people browse for ideas. Pinterest's
 * readers come looking for things to do, places to go and ways to save, and
 * its ranking buries anything grim — so pinning these would only dilute the
 * account. The social pipeline still posts them to Bluesky and Threads.
 */
const NOT_FOR_PINTEREST = [
  /\bmissing\b/i,
  /\bpolice\b/i,
  /\brcmp\b/i,
  /\bcharged\b/i,
  /\barrest/i,
  /\bhomicide\b/i,
  /\bmurder/i,
  /\bstabb/i,
  /\bshooting\b/i,
  /\bshot\b/i,
  /\bkilled\b/i,
  /\bfatal/i,
  /\bdies\b/i,
  /\bdied\b/i,
  /\bdead\b/i,
  /\bdeath\b/i,
  /\bassault/i,
  /\bsexual\b/i,
  /\bcrash\b/i,
  /\bcollision\b/i,
  /\bamber alert\b/i,
  /\bseized?\b/i,
  /\bcontraband\b/i,
  /\bfraud\b/i,
  /\bcourt\b/i,
  /\bsentenced?\b/i,
]

export function isPinnable(article: SocialArticle): boolean {
  const haystack = [article.title, ...(article.tags ?? [])].filter(Boolean).join(' ')
  return !NOT_FOR_PINTEREST.some((re) => re.test(haystack))
}

const truncate = (text: string, max: number): string => {
  const chars = [...text.trim()]
  if (chars.length <= max) return chars.join('')
  return chars.slice(0, max - 1).join('').trimEnd() + '…'
}

/**
 * Title is the headline. The description carries the excerpt — Pinterest
 * indexes it for search, so it should read as a sentence, not a tag dump —
 * followed by the same city-first hashtags the other platforms use.
 */
export function buildPin(article: SocialArticle): {
  title: string
  description: string
  alt_text: string
} {
  const title = truncate(article.title, MAX_TITLE)

  const hashtags = collectHashtags(article, MAX_HASHTAGS)
  const suffix = hashtags.length > 0 ? `\n\n${hashtags.map((t) => `#${t}`).join(' ')}` : ''
  const body = (article.excerpt ?? '').trim() || article.title.trim()
  const room = Math.max(0, MAX_DESCRIPTION - [...suffix].length)
  const description = `${truncate(body, room)}${suffix}`

  return {
    title,
    description,
    alt_text: truncate(`${article.title} — Culture Alberta`, MAX_ALT_TEXT),
  }
}

function describeError(status: number, json: PinterestError): string {
  const base = `${status} ${json.message ?? JSON.stringify(json).slice(0, 300)}`
  if (status === 401) {
    return `${base} — the Pinterest token is expired or revoked; sign in as admin and visit /api/pinterest/connect`
  }
  if (status === 403) {
    return `${base} — the app may still be on Trial access (Pins are sandboxed), or the token lacks pins:write`
  }
  if (status === 429) return `${base} — Pinterest rate limit; the retry sweeper will try again`
  return base
}

async function call<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  })
  const json = (await res.json().catch(() => ({}))) as T & PinterestError
  if (!res.ok) throw new Error(`Pinterest ${path} failed: ${describeError(res.status, json)}`)
  return json
}

let boardsCache: { at: number; boards: PinterestBoard[] } | null = null

/** Every board on the account, following Pinterest's bookmark pagination. */
export async function listBoards(token: string, { fresh = false } = {}): Promise<PinterestBoard[]> {
  if (!fresh && boardsCache && Date.now() - boardsCache.at < BOARDS_TTL_MS) {
    return boardsCache.boards
  }

  const boards: PinterestBoard[] = []
  let bookmark: string | undefined
  do {
    const params = new URLSearchParams({ page_size: '100' })
    if (bookmark) params.set('bookmark', bookmark)
    const page = await call<{ items?: PinterestBoard[]; bookmark?: string | null }>(
      `/boards?${params}`,
      token
    )
    for (const b of page.items ?? []) boards.push({ id: b.id, name: b.name, privacy: b.privacy })
    bookmark = page.bookmark ?? undefined
  } while (bookmark)

  boardsCache = { at: Date.now(), boards }
  return boards
}

/**
 * The city's own board when there is one, else the default. Matched by exact
 * name, case-insensitively, so "Edmonton" routes there and "Edmonton Eats"
 * does not get stories it was never meant to hold.
 */
export async function chooseBoard(article: SocialArticle, token: string): Promise<string> {
  const fallback = process.env.PINTEREST_BOARD_ID
  const city = (article.category ?? '').trim().toLowerCase()

  if (city) {
    try {
      const boards = await listBoards(token)
      const match = boards.find((b) => b.name.trim().toLowerCase() === city)
      if (match) return match.id
    } catch (err) {
      // A board lookup failing should not cost the Pin — the default is fine.
      console.warn('⚠️ Pinterest board lookup failed, using the default board:', err)
    }
  }

  if (!fallback) throw new Error('PINTEREST_BOARD_ID is not set and no city board matched')
  return fallback
}

export function pinImageUrl(slug: string): string {
  return `${SITE}/api/pin/${encodeURIComponent(slug)}`
}

/**
 * Render the card before asking Pinterest for it. Pinterest downloads
 * image_url while it creates the Pin and gives up quickly; the card route is a
 * cold lambda that also has to fetch fonts and the article photo, so the first
 * request can take longer than Pinterest will wait. Taking that hit ourselves
 * leaves Pinterest a warm CDN copy.
 */
async function warmPinImage(url: string): Promise<void> {
  const res = await fetch(url, {
    cache: 'no-store',
    headers: { 'User-Agent': 'CultureAlbertaPinWarmer/1.0' },
  })
  if (!res.ok) throw new Error(`Pin card unavailable: ${res.status} for ${url}`)
  const type = res.headers.get('content-type') ?? ''
  if (!type.startsWith('image/')) {
    throw new Error(`Pin card returned ${type || 'no content type'}, not an image`)
  }
  await res.arrayBuffer() // the CDN only keeps a response that was read in full
}

export async function postToPinterest(
  article: SocialArticle,
  articleUrl: string
): Promise<string | undefined> {
  const token = await getPinterestToken()
  if (!token) {
    throw new Error('Pinterest is not connected — sign in as admin and visit /api/pinterest/connect')
  }

  const imageUrl = pinImageUrl(article.slug)
  await warmPinImage(imageUrl)

  const boardId = await chooseBoard(article, token)
  const { title, description, alt_text } = buildPin(article)

  const pin = await call<{ id?: string }>('/pins', token, {
    method: 'POST',
    body: JSON.stringify({
      board_id: boardId,
      title,
      description,
      alt_text,
      link: articleUrl,
      media_source: { source_type: 'image_url', url: imageUrl },
    }),
  })

  if (!pin.id) throw new Error(`Pinterest returned no Pin id: ${JSON.stringify(pin).slice(0, 200)}`)
  return `https://www.pinterest.com/pin/${pin.id}/`
}
