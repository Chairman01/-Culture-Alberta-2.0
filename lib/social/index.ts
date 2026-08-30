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

// @cultureyyc._ covers southern Alberta; @culturealberta._ takes the rest.
const YYC_CITIES = new Set(['calgary', 'lethbridge', 'medicine hat'])

const isYycCity = (article: SocialArticle) =>
  YYC_CITIES.has((article.category ?? '').trim().toLowerCase())

const PLATFORMS: Platform[] = [
  {
    name: 'bluesky',
    enabled: () => !!(process.env.BLUESKY_HANDLE && process.env.BLUESKY_APP_PASSWORD),
    post: postToBluesky,
  },
  // Two Threads accounts, split by city. @cultureyyc._ carries southern Alberta;
  // @culturealberta._ carries everything else, so no article falls through.
  {
    name: 'threads_alberta',
    enabled: () =>
      !!(process.env.THREADS_ALBERTA_USER_ID && process.env.THREADS_ALBERTA_ACCESS_TOKEN),
    accepts: (article) => !isYycCity(article),
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
    accepts: isYycCity,
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

/**
 * Retry posts that failed earlier.
 *
 * Threads rejects a container now and then for no stated reason and accepts the
 * identical post moments later. Recovery used to depend on somebody noticing a
 * missing post and re-saving the article; this sweeps them up on a schedule so
 * a transient failure heals itself.
 *
 * Rows carry an attempt counter: a post that is genuinely unpublishable stops
 * being retried rather than being hammered forever.
 */
export async function retryFailedSocialPosts(
  { maxAttempts = 5, limit = 20 } = {}
): Promise<{ retried: number; recovered: number; stillFailing: number }> {
  const result = { retried: 0, recovered: 0, stillFailing: 0 }
  if (process.env.SOCIAL_AUTOPOST !== 'true') return result

  const supabase = getServiceClient()
  const { data: rows } = await supabase
    .from('social_posts')
    .select('article_id, platform, attempts')
    .eq('status', 'failed')
    .lt('attempts', maxAttempts)
    .order('created_at', { ascending: true })
    .limit(limit)

  for (const row of rows ?? []) {
    const platform = PLATFORMS.find((p) => p.name === row.platform)
    if (!platform?.enabled()) continue

    // The article may have been deleted or unpublished since it failed — in
    // which case there is nothing to post and the row should stop retrying.
    const { data: article } = await supabase
      .from('articles')
      .select('id, title, slug, excerpt, image_url, category, tags, status')
      .eq('id', row.article_id)
      .single()

    if (!article || article.status !== 'published' || !article.slug) {
      await supabase
        .from('social_posts')
        .update({ attempts: maxAttempts, error: 'article deleted or unpublished — not retrying' })
        .eq('article_id', row.article_id)
        .eq('platform', row.platform)
      continue
    }

    const payload: SocialArticle = {
      id: article.id,
      title: article.title,
      slug: article.slug,
      excerpt: article.excerpt,
      imageUrl: article.image_url,
      category: article.category,
      tags: article.tags,
    }

    // Routing can change; don't post a Calgary story to the province account
    // just because an old row exists for it.
    if (!(platform.accepts?.(payload) ?? true)) continue

    result.retried++
    const attempts = (row.attempts ?? 0) + 1

    try {
      const externalUrl = await platform.post(payload, `${BASE_URL}/articles/${article.slug}`)
      await supabase
        .from('social_posts')
        .update({ status: 'posted', external_url: externalUrl ?? null, error: null, attempts })
        .eq('article_id', row.article_id)
        .eq('platform', row.platform)
      result.recovered++
      console.log(`✅ Social retry: "${article.title}" → ${row.platform}`)
    } catch (err) {
      await supabase
        .from('social_posts')
        .update({ status: 'failed', error: String(err).slice(0, 500), attempts })
        .eq('article_id', row.article_id)
        .eq('platform', row.platform)
      result.stillFailing++
      console.warn(`❌ Social retry ${attempts}/${maxAttempts} failed for ${row.platform}:`, err)
    }
  }

  return result
}

export async function postArticleToSocial(article: SocialArticle): Promise<void> {
  if (process.env.SOCIAL_AUTOPOST !== 'true') return
  if (!article.id || !article.title || !article.slug) return

  const enabled = PLATFORMS.filter((p) => p.enabled() && (p.accepts?.(article) ?? true))
  if (enabled.length === 0) return

  const articleUrl = `${BASE_URL}/articles/${article.slug}`
  const supabase = getServiceClient()

  for (const platform of enabled) {
    // Claim the (article, platform) slot first. An existing row normally means
    // this article is already done here — but a row left behind by a failed
    // attempt is retried on the next save. Threads fails transiently often
    // enough that without this, one bad minute keeps an article off that
    // account permanently, with no way back short of deleting the row by hand.
    const { error: claimError } = await supabase
      .from('social_posts')
      .insert({ article_id: article.id, platform: platform.name })

    if (claimError) {
      const { data: existing } = await supabase
        .from('social_posts')
        .select('status')
        .eq('article_id', article.id)
        .eq('platform', platform.name)
        .single()

      // Anything other than a previous failure is left alone: 'posted' is done,
      // and 'pending' means an attempt is still in flight, which we must not
      // race or we would post twice.
      if (existing?.status !== 'failed') continue

      await supabase
        .from('social_posts')
        .update({ status: 'pending', error: null })
        .eq('article_id', article.id)
        .eq('platform', platform.name)
    }

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
