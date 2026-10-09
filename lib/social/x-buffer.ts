import crypto from 'crypto'
import { getServiceClient } from '@/lib/supabase-admin'
import type { SocialArticle } from './index'
import { publishToX } from './buffer'
import { writeXBullets, type BulletResult } from './x-bullets'

// ---------------------------------------------------------------------------
// X via Buffer — image card + point-form text, link in the post or in a reply.
//
// X engagement research (2026) found link-card posts from non-Premium accounts
// get near-zero median engagement, while "put the link in a reply" has never
// been tested for clicks. So both are run side by side: each article is
// assigned by a hash of its id, and every link carries UTMs so GA4 shows which
// placement actually brings readers. X_LINK_MODE=post|reply ends the test.
// ---------------------------------------------------------------------------

const SITE = 'https://www.culturealberta.com'

export type LinkArm = 'link_post' | 'link_reply'

export function linkArm(articleId: string): LinkArm {
  const mode = process.env.X_LINK_MODE
  if (mode === 'post') return 'link_post'
  if (mode === 'reply') return 'link_reply'
  const byte = crypto.createHash('sha256').update(articleId).digest()[0]
  return byte % 2 === 0 ? 'link_post' : 'link_reply'
}

export function trackedUrl(articleUrl: string, arm: LinkArm): string {
  const url = new URL(articleUrl)
  url.searchParams.set('utm_source', 'x')
  url.searchParams.set('utm_medium', 'social')
  url.searchParams.set('utm_campaign', 'autopost')
  url.searchParams.set('utm_content', arm)
  return url.toString()
}

/** The card, as a URL ending in .png — Buffer wants a direct image link. */
export function xCardUrl(slug: string): string {
  return `${SITE}/api/pin/${encodeURIComponent(slug)}.png`
}

async function warmCard(url: string): Promise<void> {
  const res = await fetch(url, { cache: 'no-store', headers: { 'User-Agent': 'CultureAlbertaCardWarmer/1.0' } })
  if (!res.ok || !(res.headers.get('content-type') ?? '').startsWith('image/')) {
    throw new Error(`Card image unavailable: ${res.status} ${res.headers.get('content-type') ?? ''} for ${url}`)
  }
  await res.arrayBuffer()
}

async function articleBody(id: string): Promise<string | null> {
  try {
    const { data } = await getServiceClient().from('articles').select('content').eq('id', id).maybeSingle()
    return (data?.content as string | null) ?? null
  } catch {
    return null
  }
}

export interface XPostPlan {
  arm: LinkArm
  imageUrl: string
  parts: Array<{ text: string; imageUrl?: string }>
  bullets: BulletResult
}

/** Everything that would be posted, without posting. Used by the preview too. */
export async function planXPost(article: SocialArticle, articleUrl: string): Promise<XPostPlan> {
  const arm = linkArm(article.id)
  const link = trackedUrl(articleUrl, arm)
  const imageUrl = xCardUrl(article.slug)
  const bullets = await writeXBullets(article, await articleBody(article.id))
  const body = bullets.bullets.map((b) => `• ${b}`).join('\n')

  const parts =
    arm === 'link_post'
      ? [{ text: `${body}\n\n${link}`, imageUrl }]
      : [{ text: body, imageUrl }, { text: `Full story: ${link}` }]

  return { arm, imageUrl, parts, bullets }
}

export async function postToXViaBuffer(article: SocialArticle, articleUrl: string): Promise<string | undefined> {
  const channelId = process.env.BUFFER_X_CHANNEL_ID
  if (!channelId) throw new Error('BUFFER_X_CHANNEL_ID is not set')

  const plan = await planXPost(article, articleUrl)
  // Buffer fetches the image when it publishes; render it first so a cold
  // card route can't make that fetch time out.
  await warmCard(plan.imageUrl)

  const postId = await publishToX(channelId, plan.parts)
  console.log(`[x via buffer] ${plan.arm}, bullets from ${plan.bullets.source}, buffer post ${postId}`)
  return `buffer:${postId}`
}
