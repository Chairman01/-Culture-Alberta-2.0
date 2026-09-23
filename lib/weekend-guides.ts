import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache'
import { supabase } from '@/lib/supabase'

/**
 * Weekend guides ("15 Things to Do in Edmonton This Weekend: September 18–20")
 * are published as a new article every Thursday, so each one used to start from
 * zero in search: position 6–10, 2–6% click-through, dead the Monday after.
 *
 * The permanent pages at /edmonton/things-to-do-this-weekend and
 * /calgary/things-to-do-this-weekend always show the newest published guide for
 * that city, so one URL collects the links and the ranking week after week.
 * Guides are recognised by slug, which covers both the hand-written guides and
 * the ones the weekend-events cron drafts: every guide since July matches.
 */

export type WeekendCity = 'edmonton' | 'calgary'

export const WEEKEND_CITIES: Record<WeekendCity, { label: string; path: string }> = {
  edmonton: { label: 'Edmonton', path: '/edmonton/things-to-do-this-weekend' },
  calgary: { label: 'Calgary', path: '/calgary/things-to-do-this-weekend' },
}

export const WEEKEND_CACHE_TAG = 'weekend-guides'

const GUIDE_SLUG_RE = /things-to-do-in-(edmonton|calgary)-this-(?:long-)?weekend/

/** The city a weekend guide covers, or null when the slug isn't a weekend guide. */
export function weekendGuideCity(slug?: string | null): WeekendCity | null {
  const match = slug ? GUIDE_SLUG_RE.exec(slug) : null
  return match ? (match[1] as WeekendCity) : null
}

/** Path of the permanent weekend page a guide feeds, or null for any other article. */
export function weekendHubPath(slug?: string | null): string | null {
  const city = weekendGuideCity(slug)
  return city ? WEEKEND_CITIES[city].path : null
}

/**
 * Call wherever an article is published or edited. For a weekend guide it
 * refreshes the city's permanent page straight away instead of after the
 * 15-minute window; for anything else it does nothing.
 */
export function revalidateWeekendHub(slug?: string | null): void {
  const path = weekendHubPath(slug)
  if (!path) return
  revalidateTag(WEEKEND_CACHE_TAG)
  revalidatePath(path)
}

export interface WeekendGuideSummary {
  id: string
  title: string
  slug: string
  excerpt: string | null
  imageUrl: string | null
  imageSource: string | null
  author: string | null
  tags: string[]
  createdAt: string
  updatedAt: string | null
}

export interface WeekendGuides {
  latest: (WeekendGuideSummary & { content: string }) | null
  past: WeekendGuideSummary[]
}

const PAST_GUIDES = 8

async function fetchWeekendGuides(city: WeekendCity): Promise<WeekendGuides> {
  const { data, error } = await supabase
    .from('articles')
    .select('id, title, slug, excerpt, image_url, image_source, author, tags, created_at, updated_at')
    .eq('status', 'published')
    .or(`slug.ilike.%things-to-do-in-${city}-this-weekend%,slug.ilike.%things-to-do-in-${city}-this-long-weekend%`)
    .order('created_at', { ascending: false })
    .limit(PAST_GUIDES + 1)

  // Throw rather than return an empty result: unstable_cache memoizes return
  // values, and an empty page cached for 15 minutes is worse than a retry.
  if (error) throw new Error(`weekend guides (${city}): ${error.message}`)

  const guides: WeekendGuideSummary[] = (data || [])
    .filter((row) => weekendGuideCity(row.slug) === city)
    .map((row) => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      excerpt: row.excerpt,
      imageUrl: row.image_url,
      imageSource: row.image_source,
      author: row.author,
      tags: row.tags || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))

  if (guides.length === 0) return { latest: null, past: [] }

  // Content is fetched for the newest guide only; the list above stays light.
  const { data: body, error: bodyError } = await supabase
    .from('articles')
    .select('content')
    .eq('id', guides[0].id)
    .single()

  if (bodyError) throw new Error(`weekend guide content (${city}): ${bodyError.message}`)

  return {
    latest: { ...guides[0], content: body?.content || '' },
    past: guides.slice(1),
  }
}

export function getWeekendGuides(city: WeekendCity): Promise<WeekendGuides> {
  return unstable_cache(() => fetchWeekendGuides(city), ['weekend-guides', city], {
    revalidate: 900,
    tags: [WEEKEND_CACHE_TAG],
  })()
}

/** Slug of the newest published guide for the city, or null if it can't be read. */
export async function getLatestWeekendGuideSlug(city: WeekendCity): Promise<string | null> {
  try {
    const { latest } = await getWeekendGuides(city)
    return latest?.slug ?? null
  } catch {
    return null
  }
}
