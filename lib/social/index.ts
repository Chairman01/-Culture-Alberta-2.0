import { getServiceClient } from '@/lib/supabase-admin'
import { postToBluesky } from './bluesky'
import { postToThreads } from './threads'
import { postToTelegram } from './telegram'
import { postToX } from './x'
import { postToReddit } from './reddit'

// ---------------------------------------------------------------------------
// Automated social posting — fires as a non-blocking side-effect when an
// article is published (same pattern as notifySearchEngines in lib/indexing.ts).
//
// Master switch: SOCIAL_AUTOPOST=true. Each platform activates only when its
// env vars are present. The social_posts table's unique(article_id, platform)
// constraint guarantees an article is never posted to the same platform twice,
// even though the create/update/publish routes can all re-fire on edits.
// ---------------------------------------------------------------------------

export interface SocialArticle {
  id: string
  title: string
  slug: string
  excerpt?: string | null
  imageUrl?: string | null
  /** City, e.g. "Grande Prairie" — becomes the leading hashtag. */
  category?: string | null
  /** Article tags, e.g. ["sports", "oilers"] — become the trailing hashtags. */
  tags?: string[] | null
}

const BASE_URL = 'https://www.culturealberta.com'

interface Platform {
  name: string
  enabled: () => boolean
  /**
   * Which articles belong on this account. Omitted means everything.
   * Used to split coverage across the two Threads accounts.
   */
  accepts?: (article: SocialArticle) => boolean
  post: (article: SocialArticle, articleUrl: string) => Promise<string | undefined>
}

const isCalgary = (article: SocialArticle) =>
  (article.category ?? '').trim().toLowerCase() === 'calgary'

const PLATFORMS: Platform[] = [
  {
    name: 'bluesky',
    enabled: () => !!(process.env.BLUESKY_HANDLE && process.env.BLUESKY_APP_PASSWORD),
    post: postToBluesky,
  },
  // Two Threads accounts, split by city. @cultureyyc._ carries Calgary;
  // @culturealberta._ carries everything else, so no article falls through.
  {
    name: 'threads_alberta',
    enabled: () =>
      !!(process.env.THREADS_ALBERTA_USER_ID && process.env.THREADS_ALBERTA_ACCESS_TOKEN),
    accepts: (article) => !isCalgary(article),
    post: (article, articleUrl) =>
      postToThreads(article, articleUrl, {
        label: 'alberta',
        userId: process.env.THREADS_ALBERTA_USER_ID!,
        accessToken: process.env.THREADS_ALBERTA_ACCESS_TOKEN!,
      }),
  },
  {
    name: 'threads_yyc',
    enabled: () => !!(process.env.THREADS_YYC_USER_ID && process.env.THREADS_YYC_ACCESS_TOKEN),
    accepts: isCalgary,
    post: (article, articleUrl) =>
      postToThreads(article, articleUrl, {
        label: 'yyc',
        userId: process.env.THREADS_YYC_USER_ID!,
        accessToken: process.env.THREADS_YYC_ACCESS_TOKEN!,
      }),
  },
  {
    name: 'telegram',
    enabled: () => !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHANNEL_ID),
    post: postToTelegram,
  },
  {
    name: 'x',
    enabled: () =>
      !!(
        process.env.X_API_KEY &&
        process.env.X_API_SECRET &&
        process.env.X_ACCESS_TOKEN &&
        process.env.X_ACCESS_SECRET
      ),
    post: postToX,
  },
  {
    name: 'reddit',
    enabled: () =>
      !!(
        process.env.REDDIT_CLIENT_ID &&
        process.env.REDDIT_CLIENT_SECRET &&
        process.env.REDDIT_USERNAME &&
        process.env.REDDIT_PASSWORD
      ),
    post: postToReddit,
  },
]

export async function postArticleToSocial(article: SocialArticle): Promise<void> {
  if (process.env.SOCIAL_AUTOPOST !== 'true') return
  if (!article.id || !article.title || !article.slug) return

  const enabled = PLATFORMS.filter((p) => p.enabled() && (p.accepts?.(article) ?? true))
  if (enabled.length === 0) return

  const articleUrl = `${BASE_URL}/articles/${article.slug}`
  const supabase = getServiceClient()

  for (const platform of enabled) {
    // Claim the (article, platform) slot first. If the row already exists,
    // this article was already posted (or is being posted) there — skip.
    const { error: claimError } = await supabase
      .from('social_posts')
      .insert({ article_id: article.id, platform: platform.name })
    if (claimError) continue

    try {
      const externalUrl = await platform.post(article, articleUrl)
      await supabase
        .from('social_posts')
        .update({ status: 'posted', external_url: externalUrl ?? null })
        .eq('article_id', article.id)
        .eq('platform', platform.name)
      console.log(`✅ Social: posted "${article.title}" to ${platform.name}`)
    } catch (err) {
      await supabase
        .from('social_posts')
        .update({ status: 'failed', error: String(err).slice(0, 500) })
        .eq('article_id', article.id)
        .eq('platform', platform.name)
      console.error(`❌ Social: ${platform.name} failed for "${article.title}":`, err)
    }
  }
}
