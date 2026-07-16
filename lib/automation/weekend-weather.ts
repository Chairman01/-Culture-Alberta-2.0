/**
 * Weekend weather article orchestrator ("Alberta Weekend Weather Forecast").
 *
 * Pulls the Friday–Sunday forecast for all seven cities from Open-Meteo
 * (free, keyless, https://open-meteo.com) and has Claude write ONE
 * province-wide, city-by-city outlook. One article instead of seven keeps the
 * piece substantial and avoids seven near-duplicate thin pages.
 *
 * Runs Thursdays via /api/cron/weekend-weather, or on demand from
 * /admin/automation. Same service-role insert pattern as weekend-events.ts.
 */

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { getUpcomingWeekend } from './eventbrite'
import {
  generateWeatherArticle,
  type CityWeekendForecast,
  type WeatherDay,
} from './article-generator'
import { getCityWeekendPhoto } from './pexels'
import { createSlug } from '@/lib/utils/slug'
import { notifySearchEngines } from '@/lib/indexing'

const FETCH_TIMEOUT_MS = 10_000

// City → coordinates + hub page. Order here is the order in the article.
const WEATHER_CITIES: Array<{ city: string; label: string; lat: number; lon: number }> = [
  { city: 'calgary',        label: 'Calgary',        lat: 51.0447, lon: -114.0719 },
  { city: 'edmonton',       label: 'Edmonton',       lat: 53.5461, lon: -113.4938 },
  { city: 'red-deer',       label: 'Red Deer',       lat: 52.2681, lon: -113.8112 },
  { city: 'lethbridge',     label: 'Lethbridge',     lat: 49.6956, lon: -112.8451 },
  { city: 'medicine-hat',   label: 'Medicine Hat',   lat: 50.0405, lon: -110.6764 },
  { city: 'grande-prairie', label: 'Grande Prairie', lat: 55.1707, lon: -118.7947 },
  { city: 'fort-mcmurray',  label: 'Fort McMurray',  lat: 56.7268, lon: -111.3810 },
]

// WMO weather interpretation codes → plain-English conditions
// https://open-meteo.com/en/docs (weather_code)
const WMO_CONDITIONS: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Freezing fog',
  51: 'Light drizzle',
  53: 'Drizzle',
  55: 'Heavy drizzle',
  56: 'Freezing drizzle',
  57: 'Heavy freezing drizzle',
  61: 'Light rain',
  63: 'Rain',
  65: 'Heavy rain',
  66: 'Freezing rain',
  67: 'Heavy freezing rain',
  71: 'Light snow',
  73: 'Snow',
  75: 'Heavy snow',
  77: 'Snow grains',
  80: 'Light showers',
  81: 'Showers',
  82: 'Heavy showers',
  85: 'Light snow showers',
  86: 'Snow showers',
  95: 'Thunderstorms',
  96: 'Thunderstorms with hail',
  99: 'Severe thunderstorms with hail',
}

interface OpenMeteoDaily {
  time?: string[]
  weather_code?: number[]
  temperature_2m_max?: number[]
  temperature_2m_min?: number[]
  precipitation_probability_max?: number[]
  wind_speed_10m_max?: number[]
  uv_index_max?: number[]
}

function dayName(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-CA', {
    timeZone: 'UTC',
    weekday: 'long',
  })
}

/** Fetch one city's daily forecast for the weekend window. Returns null on failure. */
async function fetchCityForecast(
  entry: (typeof WEATHER_CITIES)[number],
  startIso: string,
  endIso: string
): Promise<CityWeekendForecast | null> {
  const params = new URLSearchParams({
    latitude: String(entry.lat),
    longitude: String(entry.lon),
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,uv_index_max',
    timezone: 'America/Edmonton',
    start_date: startIso,
    end_date: endIso,
  })

  try {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, {
      next: { revalidate: 0 },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
    if (!res.ok) {
      console.warn(`[weekend-weather] ${entry.label}: HTTP ${res.status} — skipping city`)
      return null
    }
    const data: { daily?: OpenMeteoDaily } = await res.json()
    const d = data.daily
    if (!d?.time?.length) {
      console.warn(`[weekend-weather] ${entry.label}: empty forecast — skipping city`)
      return null
    }

    const days: WeatherDay[] = d.time.map((date, i) => ({
      date,
      dayName: dayName(date),
      conditions: WMO_CONDITIONS[d.weather_code?.[i] ?? -1] || 'Mixed conditions',
      tMax: d.temperature_2m_max?.[i] ?? 0,
      tMin: d.temperature_2m_min?.[i] ?? 0,
      precipProb: d.precipitation_probability_max?.[i] ?? 0,
      windMax: d.wind_speed_10m_max?.[i] ?? 0,
      uvMax: d.uv_index_max?.[i] ?? 0,
    }))

    return {
      city: entry.city,
      cityLabel: entry.label,
      hubPath: `/${entry.city}`,
      days,
    }
  } catch (err) {
    console.warn(`[weekend-weather] ${entry.label} fetch failed (${err instanceof Error ? err.message : err}) — skipping city`)
    return null
  }
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient(url, key)
}

export interface WeekendWeatherResult {
  success: boolean
  cityLabel: string          // always 'Alberta' — one province-wide article
  articleId?: string
  articleSlug?: string
  title?: string
  citiesCovered: number
  error?: string
}

export async function generateWeekendWeatherArticle(
  publishStatus: 'draft' | 'published' = 'draft'
): Promise<WeekendWeatherResult> {
  const { start, label } = getUpcomingWeekend()
  const startIso = start.toISOString().slice(0, 10)
  // Sunday is exactly two days after Friday. (Don't derive this from the
  // weekend `end` Date: it's Sunday 23:59 local, which lands on Monday in UTC
  // and would add a fourth day to the forecast.)
  const endIso = new Date(start.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  console.log(`\n[weekend-weather] === Generating Alberta weather article (${label}) ===`)

  // Step 1: All 7 forecasts in parallel; any city failing is non-fatal.
  const forecasts = (
    await Promise.all(WEATHER_CITIES.map(c => fetchCityForecast(c, startIso, endIso)))
  ).filter((f): f is CityWeekendForecast => f !== null)

  console.log(`[weekend-weather] Forecasts fetched for ${forecasts.length}/${WEATHER_CITIES.length} cities`)

  // A weather roundup missing most of the province isn't worth publishing.
  if (forecasts.length < 4) {
    const error = `Only ${forecasts.length} city forecasts available — not enough for a province-wide article (minimum 4)`
    console.warn(`[weekend-weather] ${error}`)
    return { success: false, cityLabel: 'Alberta', citiesCovered: forecasts.length, error }
  }

  // Step 2: Cover photo (non-fatal). Alberta-wide piece uses an Edmonton/Calgary
  // sky-and-skyline photo via the existing helper.
  let imageUrl: string | undefined
  let imageSource: string | undefined
  try {
    const photo = await getCityWeekendPhoto('edmonton')
    imageUrl = photo.url
    imageSource = photo.credit
  } catch (err) {
    console.warn('[weekend-weather] Photo fetch failed (non-fatal):', err)
  }

  // Step 3: Claude writes the article
  let article
  try {
    article = await generateWeatherArticle(label, forecasts)
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    console.error('[weekend-weather] Article generation failed:', error)
    return { success: false, cityLabel: 'Alberta', citiesCovered: forecasts.length, error }
  }

  // Step 4: Slug + duplicate check
  const supabase = getSupabaseAdmin()
  const baseSlug = createSlug(article.title)
  const { data: existing } = await supabase
    .from('articles')
    .select('slug')
    .eq('slug', baseSlug)
    .maybeSingle()
  const slug = existing ? `${baseSlug}-${Date.now()}` : baseSlug

  const articleId = `article-auto-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
  const now = new Date().toISOString()

  // Step 5: Insert
  const { data: inserted, error: insertError } = await supabase
    .from('articles')
    .insert([{
      id: articleId,
      title: article.title,
      content: article.content,
      excerpt: article.excerpt,
      category: 'Alberta',
      categories: ['Alberta'],
      location: 'Alberta',
      author: 'Culture Alberta',
      tags: ['weather', 'weekend', 'forecast', 'alberta'],
      type: 'article',
      status: publishStatus,
      image_url: imageUrl || null,
      image_source: imageSource || null,
      slug,
      trending_home: false,
      trending_edmonton: false,
      trending_calgary: false,
      featured_home: false,
      featured_edmonton: false,
      featured_calgary: false,
      created_at: now,
      updated_at: now,
    }])
    .select()
    .single()

  if (insertError) {
    console.error('[weekend-weather] Insert failed:', insertError.message)
    return { success: false, cityLabel: 'Alberta', citiesCovered: forecasts.length, error: insertError.message }
  }

  console.log(`[weekend-weather] Article saved: ${inserted.id} (status: ${publishStatus})`)

  // Step 5b: Direct-publish gets an IndexNow ping (drafts ping on publish instead)
  if (publishStatus === 'published') {
    try {
      await notifySearchEngines(`/articles/${slug}`)
    } catch (err) {
      console.warn('[weekend-weather] Search-engine notify failed (non-fatal):', err)
    }
  }

  // Step 6: Revalidate
  try {
    revalidatePath('/', 'layout')
    revalidatePath('/articles')
    revalidatePath(`/articles/${slug}`)
    revalidatePath('/alberta')
  } catch {
    // Non-fatal
  }

  console.log(`[weekend-weather] === Done — "${article.title}" ===\n`)

  return {
    success: true,
    cityLabel: 'Alberta',
    articleId: inserted.id,
    articleSlug: slug,
    title: article.title,
    citiesCovered: forecasts.length,
  }
}
