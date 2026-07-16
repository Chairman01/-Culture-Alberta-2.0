/**
 * Weekend events orchestrator.
 * Ties together Ticketmaster + keyless city calendars → content filter → Pexels → Claude → Supabase.
 *
 * Event sources (merged automatically):
 *   1. Ticketmaster Discovery API  — major sports, theatre, family (only when a key is set)
 *   2. City calendar sources       — festivals, markets, free community events:
 *        Calgary / Edmonton     → Socrata open data (lib/automation/open-data.ts)
 *        Red Deer / Med Hat     → The Events Calendar (Tribe) REST
 *        Fort McMurray          → Modern Events Calendar REST
 *        Lethbridge             → Modern Events Calendar (JSON-LD)
 *        Grande Prairie         → Drupal FullCalendar
 *      All of the above are dispatched by fetchWeekendCityEvents (lib/automation/city-events.ts).
 *
 * This is the main function to call from the cron endpoint or admin trigger.
 */

import { createClient } from '@supabase/supabase-js'
import { fetchWeekendEvents, getUpcomingWeekend, CITY_CONFIG } from './eventbrite'
import { mergeAndDedup } from './city-feeds'
import { filterEvents } from './content-filter'
import { fetchWeekendCityEvents } from './city-events'
import { enrichEventsWithInstagram } from './instagram-enrich'
import { targetEventCount } from './article-generator'
import { getCityWeekendPhoto } from './pexels'
import { generateWeekendEventsArticle } from './article-generator'
import { createSlug } from '@/lib/utils/slug'
import { notifySearchEngines } from '@/lib/indexing'
import { revalidatePath } from 'next/cache'

// City → CMS location/category mapping
const CITY_TO_CMS: Record<string, {
  location: string
  category: string
  categories: string[]
}> = {
  calgary: {
    location: 'Calgary',
    category: 'Calgary',
    categories: ['Calgary', 'Events'],
  },
  edmonton: {
    location: 'Edmonton',
    category: 'Edmonton',
    categories: ['Edmonton', 'Events'],
  },
  lethbridge: {
    location: 'Lethbridge',
    category: 'Alberta',
    categories: ['Lethbridge', 'Events', 'Alberta'],
  },
  'medicine-hat': {
    location: 'Medicine Hat',
    category: 'Alberta',
    categories: ['Medicine Hat', 'Events', 'Alberta'],
  },
  'grande-prairie': {
    location: 'Grande Prairie',
    category: 'Alberta',
    categories: ['Grande Prairie', 'Events', 'Alberta'],
  },
  'fort-mcmurray': {
    location: 'Fort McMurray',
    category: 'Alberta',
    categories: ['Fort McMurray', 'Events', 'Alberta'],
  },
  'red-deer': {
    location: 'Red Deer',
    category: 'Alberta',
    categories: ['Red Deer', 'Events', 'Alberta'],
  },
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  // Use service role key for server-side inserts — bypasses RLS
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient(url, key)
}

export interface WeekendEventsResult {
  success: boolean
  city: string
  cityLabel: string
  articleId?: string
  articleSlug?: string
  title?: string
  eventsFound: number
  eventsUsed: number
  error?: string
}

export async function generateWeekendArticleForCity(
  city: string,
  publishStatus: 'draft' | 'published' = 'draft'
): Promise<WeekendEventsResult> {
  const cityConfig = CITY_CONFIG[city]
  if (!cityConfig) {
    return {
      success: false,
      city,
      cityLabel: city,
      eventsFound: 0,
      eventsUsed: 0,
      error: `Unknown city: ${city}`,
    }
  }

  const { start, end, label } = getUpcomingWeekend()
  const cityLabel = cityConfig.label

  console.log(`\n[weekend-events] === Generating article for ${cityLabel} (${label}) ===`)

  // Step 1: Fetch events from Ticketmaster and the city's keyless calendar
  // source in parallel. Either failing is non-fatal — the article runs on the
  // other. Ticketmaster only ever adds anything when TICKETMASTER_API_KEY is
  // set; without it, fetchWeekendCityEvents (open data for Calgary/Edmonton,
  // tourism-calendar adapters for every other city) is the source of record.
  const [tmResult, cityEvents] = await Promise.all([
    fetchWeekendEvents(city, start, end, 30).then(
      events => ({ events, error: null as string | null }),
      err => ({ events: [] as Awaited<ReturnType<typeof fetchWeekendEvents>>, error: err instanceof Error ? err.message : String(err) })
    ),
    // Errors are swallowed inside fetchWeekendCityEvents (returns [])
    fetchWeekendCityEvents(city, start, end),
  ])

  const ticketmasterEvents = tmResult.events
  if (tmResult.error) {
    console.warn(`[weekend-events] Ticketmaster unavailable for ${cityLabel} (continuing on the city calendar source):`, tmResult.error)
  }

  // Merge: Ticketmaster first (richer data when present), city calendar fills in
  // unique extras. filterEvents re-applies the editorial values filter across
  // the merged set (both sources are individually filtered too).
  const events = filterEvents(mergeAndDedup(ticketmasterEvents, cityEvents))

  console.log(`[weekend-events] ${cityLabel}: ${ticketmasterEvents.length} Ticketmaster + ${cityEvents.length} city calendar → ${events.length} total after dedup`)

  if (events.length < 3) {
    const error = `Only ${events.length} events found for ${cityLabel} — not enough for an article (minimum 3)`
    console.warn(`[weekend-events] ${error}`)
    return { success: false, city, cityLabel, eventsFound: events.length, eventsUsed: 0, error }
  }

  const eventsUsed = targetEventCount(city, events.length)

  // Step 1b: Discover organizer Instagram profiles from event websites
  // (fail-soft — events without one simply skip the Instagram line)
  try {
    await enrichEventsWithInstagram(events, eventsUsed + 4)
  } catch (err) {
    console.warn('[weekend-events] Instagram enrichment failed (non-fatal):', err)
  }

  // Step 2: Get and upload a cover photo
  let imageUrl: string | undefined
  let imageSource: string | undefined
  try {
    const photo = await getCityWeekendPhoto(city)
    imageUrl = photo.url
    imageSource = photo.credit
    console.log(`[weekend-events] Cover photo ready: ${imageUrl}`)
  } catch (err) {
    // Non-fatal — article publishes without image
    console.warn(`[weekend-events] Photo fetch failed (non-fatal):`, err)
  }

  // Step 3: Generate article content via Claude
  let article
  try {
    article = await generateWeekendEventsArticle(city, label, events)
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    console.error(`[weekend-events] Article generation failed for ${cityLabel}:`, error)
    return { success: false, city, cityLabel, eventsFound: events.length, eventsUsed, error }
  }

  // Step 4: Build the slug and check for duplicates
  const supabase = getSupabaseAdmin()
  const baseSlug = createSlug(article.title)

  const { data: existing } = await supabase
    .from('articles')
    .select('slug')
    .eq('slug', baseSlug)
    .maybeSingle()

  // If a slug already exists for this weekend, use a timestamped variant
  const slug = existing ? `${baseSlug}-${Date.now()}` : baseSlug

  // Step 5: Map CMS fields for this city
  const cmsConfig = CITY_TO_CMS[city] || {
    location: cityLabel,
    category: 'Alberta',
    categories: ['Alberta', 'Events'],
  }

  const articleId = `article-auto-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
  const now = new Date().toISOString()

  // Step 6: Insert into Supabase
  const { data: inserted, error: insertError } = await supabase
    .from('articles')
    .insert([{
      id: articleId,
      title: article.title,
      content: article.content,
      excerpt: article.excerpt,
      category: cmsConfig.category,
      categories: cmsConfig.categories,
      location: cmsConfig.location,
      author: 'Culture Alberta',
      tags: ['things to do', 'weekend', cityLabel.toLowerCase(), 'events'],
      type: 'article',
      status: publishStatus,
      image_url: imageUrl || null,
      image_source: imageSource || null,
      slug,
      trending_home: false,
      trending_edmonton: city === 'edmonton',
      trending_calgary: city === 'calgary',
      featured_home: false,
      featured_edmonton: false,
      featured_calgary: false,
      created_at: now,
      updated_at: now,
    }])
    .select()
    .single()

  if (insertError) {
    const error = insertError.message
    console.error(`[weekend-events] Supabase insert failed for ${cityLabel}:`, error)
    return { success: false, city, cityLabel, eventsFound: events.length, eventsUsed, error }
  }

  console.log(`[weekend-events] Article saved: ${inserted.id} (status: ${publishStatus})`)

  // Step 6b: If we published straight to live (cron with status=published, or
  // the admin "Live" option), ping IndexNow so Bing/Yandex crawl it within
  // minutes. Drafts skip this — the publish route fires the ping when the admin
  // publishes. Non-fatal.
  if (publishStatus === 'published') {
    try {
      await notifySearchEngines(`/articles/${slug}`)
    } catch (err) {
      console.warn('[weekend-events] Search-engine notify failed (non-fatal):', err)
    }
  }

  // Step 7: Revalidate relevant pages
  try {
    revalidatePath('/', 'layout')
    revalidatePath('/articles')
    revalidatePath(`/articles/${slug}`)
    if (city === 'calgary') revalidatePath('/calgary')
    if (city === 'edmonton') revalidatePath('/edmonton')
    revalidatePath('/alberta')
  } catch {
    // Non-fatal
  }

  console.log(`[weekend-events] === Done: ${cityLabel} — "${article.title}" ===\n`)

  return {
    success: true,
    city,
    cityLabel,
    articleId: inserted.id,
    articleSlug: slug,
    title: article.title,
    eventsFound: ticketmasterEvents.length + cityEvents.length,
    eventsUsed,
  }
}

/**
 * Run for all 6 newsletter cities sequentially.
 * Returns results for each city.
 */
export async function generateWeekendArticlesForAllCities(
  publishStatus: 'draft' | 'published' = 'draft'
): Promise<WeekendEventsResult[]> {
  const cities = [
    'calgary',
    'edmonton',
    'lethbridge',
    'medicine-hat',
    'grande-prairie',
    'fort-mcmurray',
    'red-deer',
  ]

  const results: WeekendEventsResult[] = []

  for (const city of cities) {
    const result = await generateWeekendArticleForCity(city, publishStatus)
    results.push(result)

    // Small delay between cities to avoid hammering APIs simultaneously
    if (cities.indexOf(city) < cities.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
  }

  return results
}
