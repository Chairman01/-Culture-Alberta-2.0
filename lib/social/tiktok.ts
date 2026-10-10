import type { SocialArticle } from './index'
import { publishToTikTok } from './buffer'
import { toHashtag } from './hashtags'
import { isPinnable } from './pinterest'
import { publishTikTokCarousel } from './postfast'
import { publishTikTokViaZernio } from './zernio'
import { encodeSlideText, signSlide } from './slide-signing'
import { resolveSound, type SoundChoice } from './tiktok-sounds'
import { writeXBullets, type BulletResult } from './x-bullets'
import { getServiceClient } from '@/lib/supabase-admin'

// ---------------------------------------------------------------------------
// TikTok — each article becomes a swipeable photo carousel:
//   1. cover: the photo and headline (the hook)
//   2–4. one key fact per slide, in big type (written by Claude)
//   5. "Full story: link in bio"
//
// Why a carousel: TikTok counts swiping through every slide like watching a
// video to the end and widens distribution for it. Search reads the caption,
// hashtags and on-slide text, so the caption leads with the headline's
// keywords and carries 3–5 hashtags.
//
// Provider (TIKTOK_PROVIDER; when unset, the first one configured below):
//   'buffer'   Reminder mode by default: Buffer's phone app hands over the
//              slides and caption, and the post is finished in TikTok with any
//              sound. Free, same service as X. TIKTOK_PUBLISH_MODE=auto posts
//              silently instead.
//   'zernio'   Draft mode by default: the carousel lands in TikTok's drafts
//              inbox, ready to add a sound and post. Free for 2 accounts.
//              TIKTOK_PUBLISH_MODE=auto publishes directly with TikTok's music.
//   'postfast' Publishes directly with the sound picked in the editor (or the
//              default sound, or TikTok's recommended music). Paid.
// Picked sounds come from TikTok's Commercial Music Library (business-cleared).
//
// Crime and tragedy are skipped (same filter as Pinterest): TikTok
// age-restricts violent content and it isn't what the account is for.
// ---------------------------------------------------------------------------

const SITE = 'https://www.culturealberta.com'

export const isTikTokable = isPinnable

const NOT_A_PLACE = new Set(['', 'local', 'culture', 'news', 'alberta'])
const SHORT_TAGS: Record<string, string> = { edmonton: 'yeg', calgary: 'yyc' }

/** City, its short tag, a topic tag, then the province — five at most. */
export function tiktokHashtags(article: SocialArticle): string[] {
  const category = (article.category ?? '').trim().toLowerCase()
  const tags: string[] = []
  const add = (raw?: string | null) => {
    const t = raw ? toHashtag(raw) : null
    if (t && !tags.some((x) => x.toLowerCase() === t.toLowerCase())) tags.push(t)
  }

  if (category === 'national') add('Canada')
  else if (!NOT_A_PLACE.has(category)) {
    add(article.category)
    add(SHORT_TAGS[category])
  }

  const skip = new Set([category, 'alberta', 'canada', 'news', 'yeg', 'yyc', 'local'])
  const topic = (article.tags ?? []).find((t) => t && !skip.has(t.trim().toLowerCase()))
  add(topic)

  add('Alberta')
  add(category === 'national' ? 'CanadaNews' : 'AlbertaNews')
  return tags.slice(0, 5)
}

export function tiktokCaption(article: SocialArticle): string {
  const tags = tiktokHashtags(article).map((t) => `#${t}`).join(' ')
  return `${article.title.trim()}\n\nFull story: link in bio.\n\n${tags}`
}

const slideBase = (slug: string) => `${SITE}/api/tiktok-slide/${encodeURIComponent(slug)}`

export function tiktokSlideUrls(slug: string, bullets: string[]): string[] {
  const base = slideBase(slug)
  const points = bullets.map((text, i) => {
    const q = new URLSearchParams({
      n: String(i + 1),
      of: String(bullets.length),
      t: encodeSlideText(text),
      s: signSlide(slug, text),
    })
    return `${base}/point.jpg?${q}`
  })
  return [`${base}/cover.jpg`, ...points, `${base}/end.jpg`]
}

async function articleBody(id: string): Promise<string | null> {
  try {
    const { data } = await getServiceClient().from('articles').select('content').eq('id', id).maybeSingle()
    return (data?.content as string | null) ?? null
  } catch {
    return null
  }
}

export type TikTokProvider = 'buffer' | 'zernio' | 'postfast'

const configured: Record<TikTokProvider, () => boolean> = {
  buffer: () => !!(process.env.BUFFER_API_KEY && process.env.BUFFER_TIKTOK_CHANNEL_ID),
  zernio: () => !!(process.env.ZERNIO_API_KEY && process.env.ZERNIO_TIKTOK_ACCOUNT_ID),
  postfast: () => !!(process.env.POSTFAST_API_KEY && process.env.POSTFAST_TIKTOK_ACCOUNT_ID),
}

export function tiktokProvider(): TikTokProvider {
  const set = process.env.TIKTOK_PROVIDER as TikTokProvider | undefined
  if (set && set in configured) return set
  return (['buffer', 'zernio', 'postfast'] as const).find((p) => configured[p]()) ?? 'buffer'
}

export function tiktokEnabled(): boolean {
  return configured[tiktokProvider()]()
}

/**
 * Hand-finished (reminder/draft) vs published directly. Buffer and Zernio
 * default to hand-finished so a sound can be added in TikTok; PostFast
 * publishes directly because it attaches the sound itself.
 */
export function tiktokHandFinished(provider: TikTokProvider = tiktokProvider()): boolean {
  if (provider === 'postfast') return false
  return process.env.TIKTOK_PUBLISH_MODE !== 'auto'
}

/** When no sound is picked anywhere, let TikTok choose (off with TIKTOK_AUTO_MUSIC=off). */
const autoMusicFallback = () => process.env.TIKTOK_AUTO_MUSIC !== 'off'

export interface TikTokPlan {
  slides: string[]
  caption: string
  title: string
  provider: TikTokProvider
  sound: SoundChoice | null
  soundSource: 'article' | 'default' | 'none'
  /** What will actually play: the chosen sound, TikTok's pick, or nothing. */
  music: string
  reminder: boolean
  bullets: BulletResult
}

function describeMusic(provider: TikTokProvider, sound: SoundChoice | null): string {
  if (tiktokHandFinished(provider)) return 'you add it in the TikTok app before posting'
  if (provider === 'buffer') return 'none (Buffer cannot add music)'
  if (provider === 'zernio') return autoMusicFallback() ? "TikTok's recommended music" : 'none'
  if (sound) return `${sound.name ?? 'chosen sound'}${sound.artist ? ` — ${sound.artist}` : ''}`
  return autoMusicFallback() ? "TikTok's recommended music" : 'none'
}

/** Everything that would be posted, without posting. */
export async function planTikTokPost(article: SocialArticle): Promise<TikTokPlan> {
  const [bullets, resolved] = await Promise.all([
    articleBody(article.id).then((body) => writeXBullets(article, body)),
    resolveSound(article.id),
  ])
  const provider = tiktokProvider()
  return {
    slides: tiktokSlideUrls(article.slug, bullets.bullets),
    caption: tiktokCaption(article),
    title: article.title.trim().slice(0, 90),
    provider,
    sound: resolved.sound,
    soundSource: resolved.source,
    music: describeMusic(provider, resolved.sound),
    reminder: tiktokHandFinished(provider),
    bullets,
  }
}

/** Render a slide (which also warms the CDN) and return its bytes. */
async function fetchSlide(url: string): Promise<Buffer> {
  const res = await fetch(url, { cache: 'no-store', headers: { 'User-Agent': 'CultureAlbertaSlideWarmer/1.0' } })
  if (!res.ok || !(res.headers.get('content-type') ?? '').startsWith('image/')) {
    throw new Error(`Slide unavailable: ${res.status} for ${url.split('?')[0]}`)
  }
  return Buffer.from(await res.arrayBuffer())
}

export async function postToTikTok(article: SocialArticle): Promise<string | undefined> {
  const plan = await planTikTokPost(article)
  // Renders every slide first, so the service's own fetch hits a warm cache.
  const slides = await Promise.all(plan.slides.map(fetchSlide))

  if (plan.provider === 'zernio') {
    const accountId = process.env.ZERNIO_TIKTOK_ACCOUNT_ID
    if (!accountId) throw new Error('ZERNIO_TIKTOK_ACCOUNT_ID is not set')
    const { id, url } = await publishTikTokViaZernio({
      accountId,
      imageUrls: plan.slides,
      title: plan.title,
      caption: plan.caption,
      draft: plan.reminder,
      autoMusic: autoMusicFallback(),
    })
    console.log(`[tiktok via zernio] ${plan.slides.length} slides, ${plan.reminder ? 'sent to TikTok drafts' : 'published'}, post ${id}`)
    return url ?? `zernio:${id}`
  }

  if (plan.provider === 'buffer') {
    const channelId = process.env.BUFFER_TIKTOK_CHANNEL_ID
    if (!channelId) throw new Error('BUFFER_TIKTOK_CHANNEL_ID is not set')
    const postId = await publishToTikTok(channelId, {
      imageUrls: plan.slides,
      text: plan.caption,
      title: plan.title,
      reminder: plan.reminder,
    })
    console.log(`[tiktok via buffer] ${plan.slides.length} slides, buffer post ${postId}`)
    return `buffer:${postId}`
  }

  const accountId = process.env.POSTFAST_TIKTOK_ACCOUNT_ID
  if (!accountId) throw new Error('POSTFAST_TIKTOK_ACCOUNT_ID is not set')
  const postId = await publishTikTokCarousel({
    accountId,
    slides,
    caption: plan.caption,
    title: plan.title,
    soundId: plan.sound?.musicSoundId,
    soundName: plan.sound?.name,
    autoMusic: autoMusicFallback(),
  })
  console.log(`[tiktok via postfast] ${slides.length} slides, music: ${plan.music} (${plan.soundSource}), post ${postId}`)
  return `postfast:${postId}`
}
