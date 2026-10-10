import type { SocialArticle } from './index'
import { publishToTikTok } from './buffer'
import { toHashtag } from './hashtags'
import { isPinnable } from './pinterest'
import { publishTikTokCarousel } from './postfast'
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
// Provider (TIKTOK_PROVIDER): 'postfast' (default) posts with a chosen sound —
// the article's pick from the editor, else the default sound, else TikTok's
// recommended music. 'buffer' is kept as a fallback; it can't add music.
// Sounds come from TikTok's Commercial Music Library (business-cleared).
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

export type TikTokProvider = 'postfast' | 'buffer'

export function tiktokProvider(): TikTokProvider {
  return process.env.TIKTOK_PROVIDER === 'buffer' ? 'buffer' : 'postfast'
}

export function tiktokEnabled(): boolean {
  return tiktokProvider() === 'buffer'
    ? !!(process.env.BUFFER_API_KEY && process.env.BUFFER_TIKTOK_CHANNEL_ID)
    : !!(process.env.POSTFAST_API_KEY && process.env.POSTFAST_TIKTOK_ACCOUNT_ID)
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
  if (provider === 'buffer') return 'none (Buffer cannot add music)'
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
    reminder: process.env.TIKTOK_PUBLISH_MODE === 'reminder',
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
  const slides = await Promise.all(plan.slides.map(fetchSlide))

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
