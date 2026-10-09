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
// Board routing: a board whose name is, or starts with, the article's city —
// "Edmonton" or "Edmonton News and Things to Do" — gets that city's stories;
// everything else lands on PINTEREST_BOARD_ID. Boards are matched by name so a
// new city needs no deploy, just a new board. /api/pinterest/status lists
// boards and their ids; /api/pinterest/preview shows what any article would
// pin as, without posting.
// ---------------------------------------------------------------------------

const API = 'https://api.pinterest.com/v5'
const SITE = 'https://www.culturealberta.com'

// Pinterest's own field limits.
const MAX_TITLE = 100
const MAX_DESCRIPTION = 500
const MAX_ALT_TEXT = 500
const MAX_HASHTAGS = 2

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

/** Why an article stays off Pinterest, or null when it can be pinned. */
export function pinSkipReason(article: SocialArticle): string | null {
  const haystack = [article.title, ...(article.tags ?? [])].filter(Boolean).join(' ')
  for (const re of NOT_FOR_PINTEREST) {
    const hit = haystack.match(re)
    if (hit) return `mentions "${hit[0]}" — crime, tragedy and court stories are not pinned`
  }
  return null
}

export function isPinnable(article: SocialArticle): boolean {
  return pinSkipReason(article) === null
}

const truncate = (text: string, max: number): string => {
  const chars = [...text.trim()]
  if (chars.length <= max) return chars.join('')
  return chars.slice(0, max - 1).join('').trimEnd() + '…'
}

// Categories that are sections of the site rather than places. A Pin about
// one of these is described as Alberta-wide.
const NOT_A_PLACE = new Set(['', 'local', 'culture', 'news', 'alberta'])

/** The place a reader would search for: the city, Canada for National, or Alberta. */
export function pinPlace(article: SocialArticle): string {
  const category = (article.category ?? '').trim()
  if (category.toLowerCase() === 'national') return 'Canada'
  return NOT_A_PLACE.has(category.toLowerCase()) ? 'Alberta' : category
}

/**
 * Pinterest ranks on words, not hashtags. Hashtags stopped being clickable in
 * 2020 and its search now reads the title, the description, the board name and
 * the image. So:
 *
 *   title        the headline — it already leads with the subject and place.
 *   description  the excerpt first, because the opening ~50 characters carry
 *                the most weight, then one plain sentence that names the place
 *                and what Culture Alberta covers. At most two hashtags close it
 *                off, for the readers who still search that way.
 *   alt_text     what the image is, with the headline, for accessibility and
 *                for Pinterest's image understanding.
 *
 * The description is held to 500 characters, the length Pinterest shows in
 * full; its 800 limit only buys text nobody sees.
 */
export function buildPin(article: SocialArticle): {
  title: string
  description: string
  alt_text: string
} {
  const title = truncate(article.title, MAX_TITLE)
  const place = pinPlace(article)

  const closing = `More ${place} news, events and things to do from Culture Alberta.`
  const hashtags = [...new Set([place, 'Alberta'])]
    .map((p) => collectHashtags({ ...article, category: p, tags: [] }, 1)[0])
    .filter(Boolean)
    .slice(0, MAX_HASHTAGS)
  const tagLine = hashtags.map((t) => `#${t}`).join(' ')

  const tail = `\n\n${closing}${tagLine ? `\n${tagLine}` : ''}`
  const body = (article.excerpt ?? '').trim() || article.title.trim()
  const room = Math.max(0, MAX_DESCRIPTION - [...tail].length)
  const description = `${truncate(body, room)}${tail}`

  return {
    title,
    description,
    alt_text: truncate(
      `${article.title}. Culture Alberta story card for ${place}, with a photo from the article.`,
      MAX_ALT_TEXT
    ),
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
 * The board whose name is the place, or starts with it, else the default.
 *
 * Pinterest ranks keyword-rich board names, so a city board is better named
 * "Edmonton News and Things to Do" than plain "Edmonton" — and both match.
 * An exact name wins over a prefix. National stories route to a board starting
 * with "Canada"; "Local", "Alberta" and the like go to the default board.
 *
 * Because any board starting with the city matches, don't give an unrelated
 * board a city-first name (e.g. "Edmonton Recipes") or stories will land there.
 */
export function matchCityBoard(
  article: SocialArticle,
  boards: PinterestBoard[]
): PinterestBoard | undefined {
  const place = pinPlace(article)
  if (place === 'Alberta') return undefined
  const city = place.toLowerCase()

  const named = boards.map((b) => ({ b, name: b.name.trim().toLowerCase() }))
  return (
    named.find((n) => n.name === city)?.b ??
    named.find((n) => n.name.startsWith(`${city} `))?.b
  )
}

export async function chooseBoard(
  article: SocialArticle,
  token: string,
  fallback: string | undefined = process.env.PINTEREST_BOARD_ID
): Promise<string> {

  try {
    const match = matchCityBoard(article, await listBoards(token))
    if (match) return match.id
  } catch (err) {
    // A board lookup failing should not cost the Pin — the default is fine.
    console.warn('⚠️ Pinterest board lookup failed, using the default board:', err)
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

/**
 * Create the Pin. `defaultBoardId` overrides PINTEREST_BOARD_ID, so the admin
 * backfill page can pin to a chosen board before autopinning is switched on.
 * City boards still win over it, exactly as for automatic Pins.
 */
export async function postToPinterest(
  article: SocialArticle,
  articleUrl: string,
  { defaultBoardId }: { defaultBoardId?: string } = {}
): Promise<string | undefined> {
  const token = await getPinterestToken()
  if (!token) {
    throw new Error('Pinterest is not connected — sign in as admin and visit /api/pinterest/connect')
  }

  const imageUrl = pinImageUrl(article.slug)
  await warmPinImage(imageUrl)

  const boardId = await chooseBoard(article, token, defaultBoardId ?? process.env.PINTEREST_BOARD_ID)
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
