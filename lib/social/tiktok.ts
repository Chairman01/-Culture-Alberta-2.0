import type { SocialArticle } from './index'
import { publishToTikTok } from './buffer'
import { toHashtag } from './hashtags'
import { isPinnable } from './pinterest'
import { encodeSlideText, signSlide } from './slide-signing'
import { writeXBullets, type BulletResult } from './x-bullets'
import { getServiceClient } from '@/lib/supabase-admin'

// ---------------------------------------------------------------------------
// TikTok via Buffer — each article becomes a swipeable photo carousel:
//   1. cover: the photo and headline (the hook)
//   2–4. one key fact per slide, in big type (written by Claude)
//   5. "Full story: link in bio"
//
// Why a carousel: TikTok counts swiping through every slide like watching a
// video to the end and widens distribution for it; guides put the sweet spot
// at 5–8 slides. Search reads the caption, hashtags and on-slide text, so the
// caption leads with the headline's keywords and carries 3–5 hashtags.
//
// Sound: Buffer can't add music; TikTok only allows it in the app. With
// TIKTOK_PUBLISH_MODE=reminder Buffer notifies the phone instead and the post
// is finished there with a sound. Default is fully automatic, silent.
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

export interface TikTokPlan {
  slides: string[]
  caption: string
  title: string
  reminder: boolean
  bullets: BulletResult
}

/** Everything that would be posted, without posting. */
export async function planTikTokPost(article: SocialArticle): Promise<TikTokPlan> {
  const bullets = await writeXBullets(article, await articleBody(article.id))
  return {
    slides: tiktokSlideUrls(article.slug, bullets.bullets),
    caption: tiktokCaption(article),
    title: article.title.trim().slice(0, 90),
    reminder: process.env.TIKTOK_PUBLISH_MODE === 'reminder',
    bullets,
  }
}

async function warm(url: string): Promise<void> {
  const res = await fetch(url, { cache: 'no-store', headers: { 'User-Agent': 'CultureAlbertaSlideWarmer/1.0' } })
  if (!res.ok || !(res.headers.get('content-type') ?? '').startsWith('image/')) {
    throw new Error(`Slide unavailable: ${res.status} for ${url.split('?')[0]}`)
  }
  await res.arrayBuffer()
}

export async function postToTikTokViaBuffer(article: SocialArticle): Promise<string | undefined> {
  const channelId = process.env.BUFFER_TIKTOK_CHANNEL_ID
  if (!channelId) throw new Error('BUFFER_TIKTOK_CHANNEL_ID is not set')

  const plan = await planTikTokPost(article)
  // TikTok pulls the images when it publishes; render them first so a cold
  // slide route can't make that fetch time out.
  await Promise.all(plan.slides.map(warm))

  const postId = await publishToTikTok(channelId, {
    imageUrls: plan.slides,
    text: plan.caption,
    title: plan.title,
    reminder: plan.reminder,
  })
  console.log(`[tiktok via buffer] ${plan.slides.length} slides, ${plan.reminder ? 'reminder' : 'automatic'}, buffer post ${postId}`)
  return `buffer:${postId}`
}
