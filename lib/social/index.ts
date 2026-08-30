import { getServiceClient } from '@/lib/supabase-admin'
import { postToBluesky } from './bluesky'
import { postToThreads } from './threads'
import { getThreadsToken } from './threads-tokens'
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
    post: async (article, articleUrl) =>
      postToThreads(article, articleUrl, {
        label: 'alberta',
        userId: process.env.THREADS_ALBERTA_USER_ID!,
        // Read at post time, not at module load: the renewal cron rewrites this
        // every few weeks and the env var is only the seed.
        accessToken: (await getThreadsToken('threads_alberta'))!,
      }),
  },
  {
    name: 'threads_yyc',
    enabled: () => !!(process.env.THREADS_YYC_USER_ID && process.env.THREADS_YYC_ACCESS_TOKEN),
    accepts: isYycCity,
    post: async (article, articleUrl) =>
      postToThreads(article, articleUrl, {
        label: 'yyc',
        userId: process.env.THREADS_YYC_USER_ID!,
        accessToken: (await getThreadsToken('threads_yyc'))!,
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

// A publish route is capped at 60s, so anything still 'pending' well past that
// is dead rather than running.
const STALE_PENDING_MS = 15 * 60 * 1000
// How far back to look for an article that missed a platform entirely.
const MISSED_WINDOW_MS = 48 * 60 * 60 * 1000

/**
 * Find articles that reached some platforms but never claimed others, and file
 * the gap as a failed row so the retry loop below picks it up.
 *
 * The scoping matters more than the sweeping. An article can be missing a
 * platform for two very different reasons: the attempt was lost, or that
 * platform did not exist yet when it published. Only the first is a fault.
 * Every platform is therefore bounded by its own first-ever post, so switching
 * on a new account can never drag the back catalogue onto it — which a dry run
 * showed would otherwise have dumped six day-old stories onto Threads at once.
 */
async function claimMissedPlatforms(
  supabase: ReturnType<typeof getServiceClient>
): Promise<void> {
  const since = new Date(Date.now() - MISSED_WINDOW_MS).toISOString()

  const { data: recent } = await supabase
    .from('social_posts')
    .select('article_id')
    .gte('created_at', since)

  const articleIds = [...new Set((recent ?? []).map((r) => r.article_id))]
  if (articleIds.length === 0) return

  const { data: existing } = await supabase
    .from('social_posts')
    .select('article_id, platform')
    .in('article_id', articleIds)

  const claimed = new Set((existing ?? []).map((r) => `${r.article_id}:${r.platform}`))

  // When each platform first posted anything. An article older than that was
  // never a candidate for it, so its absence is history, not a failure.
  const liveSince = new Map<string, string>()
  for (const platform of PLATFORMS) {
    const { data: first } = await supabase
      .from('social_posts')
      .select('created_at')
      .eq('platform', platform.name)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    // No history at all means a brand-new account: nothing to backfill onto it.
    if (first?.created_at) liveSince.set(platform.name, first.created_at)
  }

  const { data: articles } = await supabase
    .from('articles')
    .select('id, title, slug, excerpt, image_url, category, tags, status, created_at')
    .in('id', articleIds)

  for (const article of articles ?? []) {
    if (article.status !== 'published' || !article.slug) continue

    const payload: SocialArticle = {
      id: article.id,
      title: article.title,
      slug: article.slug,
      excerpt: article.excerpt,
      imageUrl: article.image_url,
      category: article.category,
      tags: article.tags,
    }

    for (const platform of PLATFORMS) {
      if (!platform.enabled()) continue
      if (!(platform.accepts?.(payload) ?? true)) continue
      if (claimed.has(`${article.id}:${platform.name}`)) continue

      // The article predates this account going live — it was never missed.
      const since = liveSince.get(platform.name)
      if (!since || new Date(article.created_at) < new Date(since)) continue

      await supabase.from('social_posts').insert({
        article_id: article.id,
        platform: platform.name,
        status: 'failed',
        error: 'never attempted — filed by the retry sweeper',
      })
      console.log(`🔁 Social sweeper: ${platform.name} was never attempted for "${article.title}"`)
    }
  }
}

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

  // A row left in 'pending' means the attempt died before it could record an
  // outcome. It is not in flight — the route that writes it is capped at 60s —
  // and left alone it would both block future attempts and be invisible here,
  // which is the original bug one state over. Demote it so it gets picked up.
  await supabase
    .from('social_posts')
    .update({ status: 'failed', error: 'attempt did not finish' })
    .eq('status', 'pending')
    .lt('created_at', new Date(Date.now() - STALE_PENDING_MS).toISOString())

  // Platforms that were never even claimed: an article that reached some
  // accounts but not others. Only articles that already have a row are
  // considered, which is what proves autoposting was live when they published —
  // without that, enabling a new platform would backfire and post the archive.
  await claimMissedPlatforms(supabase)

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
