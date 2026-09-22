/**
 * Publishing a scheduled draft.
 *
 * A scheduled article is a DRAFT carrying `publish_at`. Draft status is what
 * keeps it off the public site — the only SELECT policy on `articles` is
 * `status = 'published'`, so the anon key used by every public read (and by
 * the fallback sync in lib/auto-sync) cannot return it at all. Nothing else
 * has to remember to filter.
 *
 * Going live therefore has to do everything the admin PUT route does after it
 * flips status, and that chain is easy to get half-right: the hero pin, the
 * fallback sync, the ISR revalidation, IndexNow, and the social post. This
 * module owns it so the cron and a manual "publish now" cannot drift apart.
 */

import { revalidatePath } from 'next/cache'
import { getServiceClient } from '@/lib/supabase-admin'
import { quickSyncArticle } from '@/lib/auto-sync'
import { notifySearchEngines } from '@/lib/indexing'
import { postArticleToSocial } from '@/lib/social'
import { warmSocialPreview } from '@/lib/social-image-url'

export interface PublishResult {
  ok: boolean
  id: string
  title?: string
  slug?: string
  /** Set when the row could not be published; `ok` is false. */
  reason?: string
}

/** How far past the requested time a schedule is still accepted as a schedule. */
const SCHEDULE_SLACK_MS = 60_000

export type ParsedSchedule =
  | { kind: 'none' }
  | { kind: 'clear' }
  | { kind: 'now' }
  | { kind: 'at'; at: string }
  | { kind: 'invalid'; error: string }

/**
 * Read a `publishAt` off an admin request body.
 *
 * Absent means "change nothing" — the editor forms do not all render a schedule
 * control, and the same `??` reasoning that protects the trending flags applies
 * here: a form that cannot express a schedule must not be able to cancel one.
 * An explicit null cancels it. A time already in the past means the editor
 * wants it out now, which is a normal publish rather than an error.
 */
export function parsePublishAt(value: unknown): ParsedSchedule {
  if (value === undefined) return { kind: 'none' }
  if (value === null || value === '') return { kind: 'clear' }
  if (typeof value !== 'string') return { kind: 'invalid', error: 'publishAt must be an ISO timestamp or null' }

  const at = new Date(value)
  if (Number.isNaN(at.getTime())) {
    return { kind: 'invalid', error: `publishAt is not a valid timestamp: ${value}` }
  }
  if (at.getTime() <= Date.now() + SCHEDULE_SLACK_MS) {
    return { kind: 'now' }
  }

  return { kind: 'at', at: at.toISOString() }
}

/**
 * Flip one scheduled draft to published and run every side effect.
 *
 * `requireDue` is the difference between the cron and an editor's "publish now
 * instead of waiting": the cron must only touch rows whose time has come, an
 * editor is deliberately overriding the clock.
 */
export async function publishScheduledArticle(
  articleId: string,
  { requireDue = true }: { requireDue?: boolean } = {}
): Promise<PublishResult> {
  const supabase = getServiceClient()

  const { data: draft, error: readError } = await supabase
    .from('articles')
    .select('id, title, slug, excerpt, image_url, category, tags, status, publish_at, featured_home')
    .eq('id', articleId)
    .maybeSingle()

  if (readError) {
    console.error(`[publish-scheduled] could not read ${articleId}:`, readError.message)
    return { ok: false, id: articleId, reason: readError.message }
  }
  if (!draft) {
    return { ok: false, id: articleId, reason: 'Article not found' }
  }
  if (draft.status !== 'draft') {
    // Already live. Not an error: two cron ticks can overlap, and an editor can
    // publish by hand between them.
    return { ok: false, id: articleId, reason: 'Already published' }
  }
  if (!draft.publish_at) {
    return { ok: false, id: articleId, reason: 'Not scheduled' }
  }
  if (requireDue && new Date(draft.publish_at).getTime() > Date.now()) {
    return { ok: false, id: articleId, reason: 'Not due yet' }
  }

  // `date` and `created_at` both move to the publish moment. Every public
  // listing orders by created_at, so leaving the authoring time in place would
  // bury a piece written on Tuesday and scheduled for Saturday underneath
  // everything published in between — the one thing scheduling must not do.
  //
  // now(), not publish_at: if the cron were down for a day, honouring the
  // stored time would silently backdate the article into the archive.
  const publishedAt = new Date().toISOString()

  // The status guard makes this the atomic claim on the row. A second worker
  // running the same tick matches nothing and gets `Already published`, so the
  // side effects below — the social post above all — happen exactly once.
  const { data: published, error: updateError } = await supabase
    .from('articles')
    .update({
      status: 'published',
      publish_at: null,
      date: publishedAt,
      created_at: publishedAt,
    })
    .eq('id', articleId)
    .eq('status', 'draft')
    .select('id, title, slug, excerpt, image_url, category, tags, featured_home')
    .maybeSingle()

  if (updateError) {
    console.error(`[publish-scheduled] update failed for ${articleId}:`, updateError.message)
    return { ok: false, id: articleId, reason: updateError.message }
  }
  if (!published) {
    return { ok: false, id: articleId, reason: 'Already published' }
  }

  console.log(`[publish-scheduled] published "${published.title}" (${published.slug})`)

  // The homepage hero is a single slot, so scheduling an article as the hero has
  // to unpin the incumbent now, not back when it was scheduled — otherwise the
  // homepage would lose its hero for however long the draft sat waiting.
  if (published.featured_home) {
    const { error: unpinError } = await supabase
      .from('articles')
      .update({ featured_home: false })
      .eq('featured_home', true)
      .neq('id', articleId)

    if (unpinError) {
      console.warn('[publish-scheduled] could not unpin previous hero (non-fatal):', unpinError.message)
    }
  }

  // Everything past this point is cache and distribution: the article is live in
  // the database either way, so a failure here is logged, never thrown.
  try {
    const syncResult = await quickSyncArticle(articleId)
    if (!syncResult.success) {
      console.warn('[publish-scheduled] fallback sync failed (non-fatal):', syncResult.error)
    }
  } catch (err) {
    console.warn('[publish-scheduled] fallback sync threw (non-fatal):', err)
  }

  try {
    const { clearArticlesCache } = await import('@/lib/fast-articles')
    clearArticlesCache()
  } catch (err) {
    console.warn('[publish-scheduled] cache clear failed (non-fatal):', err)
  }

  // Page-scoped, matching the admin PUT route: revalidatePath('/', 'layout')
  // invalidates every cached page and floods ISR writes.
  try {
    revalidatePath('/')
    revalidatePath('/articles')
    revalidatePath('/alberta')
    revalidatePath('/national')
    revalidatePath('/edmonton')
    revalidatePath('/calgary')
    revalidatePath('/red-deer')
    revalidatePath('/lethbridge')
    // The sitemaps too: a scheduled piece was absent from them the whole time it
    // sat as a draft, so unlike an ordinary edit this is the first chance the
    // crawlers get to see the URL.
    revalidatePath('/sitemap.xml')
    revalidatePath('/news-sitemap.xml')
    if (published.slug) revalidatePath(`/articles/${published.slug}`)
  } catch (err) {
    console.warn('[publish-scheduled] revalidation failed (non-fatal):', err)
  }

  return { ok: true, id: published.id, title: published.title, slug: published.slug || undefined }
}

/**
 * IndexNow + the social post, for a row `publishScheduledArticle` just flipped.
 *
 * Split out because both calls are slow and the caller should run them inside
 * `after()` — a bare floating promise can be frozen the moment the response is
 * returned, which is how social posting silently stopped happening once before.
 */
export async function announcePublishedArticle(articleId: string): Promise<void> {
  const supabase = getServiceClient()

  const { data: article } = await supabase
    .from('articles')
    .select('id, title, slug, excerpt, image_url, category, tags, status')
    .eq('id', articleId)
    .maybeSingle()

  if (!article || article.status !== 'published' || !article.slug) return

  try {
    await notifySearchEngines(`/articles/${article.slug}`)
  } catch (err) {
    console.warn('[publish-scheduled] search engine notification failed (non-fatal):', err)
  }

  try {
    // Warm the CDN first so a crawler gets a fast og:image and renders the large
    // image card. The social_posts unique constraint means a repeat never
    // double-posts.
    await warmSocialPreview(article.image_url, article.slug)
    await postArticleToSocial({
      id: article.id,
      title: article.title,
      slug: article.slug,
      excerpt: article.excerpt,
      imageUrl: article.image_url,
      category: article.category,
      tags: article.tags,
    })
  } catch (err) {
    console.warn('[publish-scheduled] social posting failed (non-fatal):', err)
  }
}

/**
 * Every draft whose time has come, oldest first.
 *
 * No upper bound on lateness: if the cron missed a window the backlog should
 * still go out rather than sit invisible forever.
 */
export async function findDueScheduledArticles(limit = 10) {
  const supabase = getServiceClient()

  const { data, error } = await supabase
    .from('articles')
    .select('id, title, publish_at')
    .eq('status', 'draft')
    .not('publish_at', 'is', null)
    .lte('publish_at', new Date().toISOString())
    .order('publish_at', { ascending: true })
    .limit(limit)

  if (error) {
    console.error('[publish-scheduled] could not read the schedule:', error.message)
    return { articles: [] as { id: string; title: string; publish_at: string }[], error: error.message }
  }

  return { articles: (data || []) as { id: string; title: string; publish_at: string }[] }
}
