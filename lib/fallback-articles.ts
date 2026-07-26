import { Article } from './types/article'
import { getAllArticles as getSupabaseArticles, getHomepageArticles } from './supabase-articles'
import { updateOptimizedFallback, loadOptimizedFallback } from './optimized-fallback'
import fs from 'fs'
import path from 'path'

// Cache for articles.json data - DISABLED for production fix
let articlesJsonCache: Article[] | null = null
let articlesJsonCacheTimestamp: number = 0
const ARTICLES_JSON_CACHE_DURATION = 0 // DISABLED - always fetch fresh data

/**
 * REMOVED: No longer using lib/data/articles.json
 * Now using only the optimized fallback system for consistency
 */
async function loadArticlesFromJson(): Promise<Article[]> {
  console.log('⚠️ DEPRECATED: loadArticlesFromJson() is no longer used - using optimized fallback instead')
  return loadOptimizedFallback()
}

/**
 * Load articles with Supabase as primary source and articles.json as fallback
 * This function tries Supabase first, and if it fails or takes too long, falls back to articles.json
 */
export async function getArticlesWithFallback(timeoutMs: number = 5000): Promise<Article[]> {
  console.log('🔄 Loading articles with fallback system...')

  // CRITICAL FIX: In production, ALWAYS use Supabase (never use stale articles.json)
  const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1'

  if (!isProduction) {
    // Only try articles.json in development
    try {
      const jsonArticles = await loadArticlesFromJson()
      if (jsonArticles.length > 0) {
        console.log(`✅ [DEV] Loaded ${jsonArticles.length} articles from articles.json`)

        // Log the date range to verify we have fresh data
        const dates = jsonArticles.map(a => a.createdAt).filter(Boolean).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
        if (dates.length > 0) {
          console.log(`📅 Latest article date: ${dates[0]}`)
          console.log(`📅 Oldest article date: ${dates[dates.length - 1]}`)
        }

        return jsonArticles
      }
    } catch (jsonError) {
      console.log('ℹ️ [DEV] articles.json not found, using Supabase:', jsonError)
    }
  } else {
    console.log('🚀 [PRODUCTION] Skipping articles.json, fetching directly from Supabase for fresh data')
  }

  // Use Supabase (ALWAYS in production, fallback in development)
  // Create a promise that resolves with Supabase data
  const supabasePromise = getSupabaseArticles()

  // Create a timeout promise
  const timeoutPromise = new Promise<Article[]>((_, reject) => {
    setTimeout(() => {
      reject(new Error('Supabase timeout'))
    }, timeoutMs)
  })

  try {
    // Race between Supabase and timeout
    const articles = await Promise.race([supabasePromise, timeoutPromise])
    console.log(`✅ Loaded ${articles.length} articles from Supabase`)

    // SUSTAINABLE FALLBACK: Update optimized fallback with fresh data when Supabase works
    try {
      await updateOptimizedFallback(articles)
    } catch (updateError) {
      console.warn('⚠️ Could not update optimized fallback file:', updateError)
      // Don't fail the request if fallback update fails
    }

    return articles
  } catch (error) {
    console.warn('⚠️ Supabase failed or timed out, using optimized fallback:', error)

    try {
      const fallbackArticles = await loadOptimizedFallback()
      if (fallbackArticles.length > 0) {
        console.log(`✅ Optimized fallback successful: ${fallbackArticles.length} articles`)
        return fallbackArticles
      } else {
        console.warn('⚠️ No optimized fallback articles available')
        return []
      }
    } catch (fallbackError) {
      console.error('❌ Optimized fallback also failed:', fallbackError)
      return []
    }
  }
}

/**
 * Load articles for homepage with optimized fallback
 */
export async function getHomepageArticlesWithFallback(): Promise<Article[]> {
  return getArticlesWithFallback(10000) // 10 second timeout for homepage - give Supabase more time
}

// Other Alberta cities/locations - exclude from Edmonton and Calgary pages (primary location wins)
const OTHER_ALBERTA_LOCATIONS = ['red deer', 'lethbridge', 'medicine hat', 'grande prairie', 'fort mcmurray', 'airdrie', 'st. albert', 'okotoks', 'canmore', 'banff', 'brooks', 'edson', 'camrose', 'lloydminster', 'drumheller', 'jasper']

/** Exclude articles whose primary location/category is another Alberta city or general Alberta-only */
function excludeOtherCityArticles(articles: Article[], targetCity: string): Article[] {
  const target = targetCity.toLowerCase()
  return articles.filter(article => {
    const loc = (article.location || '').toLowerCase().trim()
    const cat = (article.category || '').toLowerCase().trim()
    const cats = (article.categories || []).map((c: string) => c.toLowerCase())
    const tags = ((article as any).tags || []).map((t: string) => t.toLowerCase())
    const combined = [loc, cat, ...cats, ...tags]

    // Exclude if primary location/category is another Alberta city
    if (OTHER_ALBERTA_LOCATIONS.some(other => loc.includes(other) || cat.includes(other))) {
      return false
    }
    // Exclude if categories/tags ONLY have other cities (no target city)
    const hasTarget = combined.some(s => s.includes(target))
    const hasOtherCity = OTHER_ALBERTA_LOCATIONS.some(other => combined.some(s => s.includes(other)))
    if (hasOtherCity && !hasTarget) return false
    // Exclude when location is "Alberta" - province-wide stories belong on /alberta, not city pages
    if (loc === 'alberta' && target !== 'alberta') return false
    // Exclude general "Alberta" only when category is alberta and no city reference
    if (cat === 'alberta' && target !== 'alberta') {
      const hasCityRef = combined.some(s => s.includes('edmonton') || s.includes('calgary'))
      if (!hasCityRef) return false
    }
    return true
  })
}

/**
 * Load articles for city pages with fallback
 */
export async function getCityArticlesWithFallback(city: string): Promise<Article[]> {
  console.log(`🔄 Loading ${city} articles with fallback system...`)

  // Try Supabase first (Production & Dev)
  try {
    // Dynamically import to avoid circular dependencies if any
    const { getCityArticles } = await import('./supabase-articles')

    // Validate city
    const validCity = city.toLowerCase()
    if (validCity === 'edmonton' || validCity === 'calgary') {
      const raw = await getCityArticles(validCity)

      if (raw.length > 0) {
        // Exclude events - articles only (events belong on events page and city events sections)
        let articles = raw.filter((a: Article & { type?: string; categories?: string[] }) =>
          a.type !== 'event' && a.type !== 'Event' && !a.categories?.includes('Events')
        )
        // Exclude articles assigned to Red Deer, Lethbridge, Alberta-only, etc.
        articles = excludeOtherCityArticles(articles, validCity)
        console.log(`✅ Loaded ${articles.length} ${city} articles from Supabase (excluded events + other cities)`)

        // Update optimized fallback with fresh data
        updateOptimizedFallback(raw).catch(err =>
          console.warn('⚠️ Background update of fallback failed:', err)
        )

        return articles
      }
    }
  } catch (error) {
    console.warn(`⚠️ Supabase failed for ${city}, using optimized fallback:`, error)
  }

  // Fallback to optimized JSON
  try {
    console.log(`⚠️ Using optimized fallback for ${city}`)
    const fallbackArticles = await loadOptimizedFallback()

    // Filter for city-specific articles and exclude events
    let filtered = fallbackArticles.filter(article => {
      if ((article as any).type === 'event' || (article as any).type === 'Event') return false
      if ((article as any).categories?.includes('Events')) return false

      const hasCityCategory = article.category?.toLowerCase().includes(city.toLowerCase())
      const hasCityLocation = article.location?.toLowerCase().includes(city.toLowerCase())
      const hasCityCategories = article.categories?.some((cat: string) =>
        cat.toLowerCase().includes(city.toLowerCase())
      )
      const hasCityTags = (article as any).tags?.some((tag: string) =>
        tag.toLowerCase().includes(city.toLowerCase())
      )
      return hasCityCategory || hasCityLocation || hasCityCategories || hasCityTags
    })
    return excludeOtherCityArticles(filtered, city.toLowerCase())
  } catch (error) {
    console.error(`❌ Failed to load ${city} articles from fallback:`, error)
    return []
  }
}

/**
 * Load articles for food & drink page with fallback
 */
export async function getFoodDrinkArticlesWithFallback(): Promise<Article[]> {
  console.log('🔄 Loading Food & Drink articles with fallback system...')

  // Try Supabase first
  try {
    const articles = await getSupabaseArticles()

    // Filter for food & drink
    const foodArticles = articles.filter(article => {
      if (article.type === 'event') return false

      const c = (str: string | undefined) => str ? str.toLowerCase() : ''

      const hasFoodCategory = c(article.category).includes('food') ||
        c(article.category).includes('drink') ||
        c(article.category).includes('restaurant') ||
        c(article.category).includes('cafe') ||
        c(article.category).includes('brewery')

      const hasFoodCategories = article.categories?.some(cat =>
        c(cat).includes('food') || c(cat).includes('drink') ||
        c(cat).includes('restaurant') || c(cat).includes('cafe')
      )

      return hasFoodCategory || hasFoodCategories
    })

    if (foodArticles.length > 0) {
      console.log(`✅ Loaded ${foodArticles.length} Food & Drink articles from Supabase`)
      // Update optimized fallback with fresh data (all articles)
      updateOptimizedFallback(articles).catch(err => console.warn('Background update failed', err))
      return foodArticles
    }
  } catch (error) {
    console.warn('⚠️ Supabase failed for Food & Drink, using fallback:', error)
  }

  // Fallback
  try {
    const fallbackArticles = await loadOptimizedFallback()
    console.log(`⚡ FALLBACK: Loaded ${fallbackArticles.length} articles from optimized fallback`)

    // Filter for food & drink articles (excluding events)
    const foodDrinkArticles = fallbackArticles.filter(article => {
      // First filter out events
      if (article.type === 'event') return false

      const hasFoodCategory = article.category?.toLowerCase().includes('food') ||
        article.category?.toLowerCase().includes('drink') ||
        article.category?.toLowerCase().includes('restaurant') ||
        article.category?.toLowerCase().includes('cafe') ||
        article.category?.toLowerCase().includes('brewery') ||
        article.category?.toLowerCase().includes('food & drink')

      const hasFoodCategories = article.categories?.some(cat =>
        cat.toLowerCase().includes('food') ||
        cat.toLowerCase().includes('drink') ||
        cat.toLowerCase().includes('restaurant') ||
        cat.toLowerCase().includes('cafe') ||
        cat.toLowerCase().includes('brewery') ||
        cat.toLowerCase().includes('food & drink')
      )

      const hasFoodTags = article.tags?.some(tag =>
        tag.toLowerCase().includes('food') ||
        tag.toLowerCase().includes('drink') ||
        tag.toLowerCase().includes('restaurant') ||
        tag.toLowerCase().includes('cafe') ||
        tag.toLowerCase().includes('brewery') ||
        tag.toLowerCase().includes('food & drink')
      )

      return hasFoodCategory || hasFoodCategories || hasFoodTags
    })

    // Sort by newest first and return ALL articles for the dedicated page
    foodDrinkArticles.sort((a, b) => {
      const dateA = new Date(a.createdAt || a.date || 0).getTime()
      const dateB = new Date(b.createdAt || b.date || 0).getTime()
      return dateB - dateA // Newest first
    })

    console.log(`✅ FOOD & DRINK PAGE: Returning all ${foodDrinkArticles.length} articles`)
    return foodDrinkArticles // Return all articles for the dedicated page
  } catch (error) {
    console.error('❌ Failed to load Food & Drink articles from fallback:', error)
    return []
  }
}

/**
 * Load articles for culture page with fallback
 */
export async function getCultureArticlesWithFallback(): Promise<Article[]> {
  console.log('🔄 Loading Culture articles with fallback system...')

  // Try Supabase first
  try {
    const articles = await getSupabaseArticles()

    // Filter for culture
    const cultureArticles = articles.filter(article => {
      if (article.type === 'event') return false

      // Exclude irrelevant
      if (article.title?.toLowerCase().includes('edmonton folk music festival')) return false

      const c = (str: string | undefined) => str ? str.toLowerCase() : ''
      const keywords = ['culture', 'art', 'music', 'theater', 'museum', 'festival', 'heritage', 'indigenous', 'community']

      const hasCultureCategory = keywords.some(k => c(article.category).includes(k))
      const hasCultureCategories = article.categories?.some(cat => keywords.some(k => c(cat).includes(k)))

      return hasCultureCategory || hasCultureCategories
    })

    if (cultureArticles.length > 0) {
      console.log(`✅ Loaded ${cultureArticles.length} Culture articles from Supabase`)
      updateOptimizedFallback(articles).catch(err => console.warn('Background update failed', err))
      return cultureArticles
    }
  } catch (error) {
    console.warn('⚠️ Supabase failed for Culture, using fallback:', error)
  }

  // Fallback
  try {
    const fallbackArticles = await loadOptimizedFallback()
    console.log(`⚡ FALLBACK: Loaded ${fallbackArticles.length} articles from optimized fallback`)

    // Filter for culture articles (excluding events)
    return fallbackArticles.filter(article => {
      // First filter out events
      if (article.type === 'event') return false

      // Exclude specific articles that shouldn't be on the Culture page
      if (article.title?.toLowerCase().includes('edmonton folk music festival') ||
        article.title?.toLowerCase().includes('edmonton folk festival')) {
        return false
      }

      const hasCultureCategory = article.category?.toLowerCase().includes('culture') ||
        article.category?.toLowerCase().includes('art') ||
        article.category?.toLowerCase().includes('music') ||
        article.category?.toLowerCase().includes('theater') ||
        article.category?.toLowerCase().includes('museum') ||
        article.category?.toLowerCase().includes('festival') ||
        article.category?.toLowerCase().includes('heritage') ||
        article.category?.toLowerCase().includes('indigenous') ||
        article.category?.toLowerCase().includes('community')

      const hasCultureCategories = article.categories?.some(cat =>
        cat.toLowerCase().includes('culture') ||
        cat.toLowerCase().includes('art') ||
        cat.toLowerCase().includes('music') ||
        cat.toLowerCase().includes('theater') ||
        cat.toLowerCase().includes('museum') ||
        cat.toLowerCase().includes('festival') ||
        cat.toLowerCase().includes('heritage') ||
        cat.toLowerCase().includes('indigenous') ||
        cat.toLowerCase().includes('community')
      )

      const hasCultureTags = article.tags?.some(tag =>
        tag.toLowerCase().includes('culture') ||
        tag.toLowerCase().includes('art') ||
        tag.toLowerCase().includes('music') ||
        tag.toLowerCase().includes('theater') ||
        tag.toLowerCase().includes('museum') ||
        tag.toLowerCase().includes('festival') ||
        tag.toLowerCase().includes('heritage') ||
        tag.toLowerCase().includes('indigenous') ||
        tag.toLowerCase().includes('community')
      )

      return hasCultureCategory || hasCultureCategories || hasCultureTags
    })
  } catch (error) {
    console.error('❌ Failed to load Culture articles from fallback:', error)
    return []
  }
}

/**
 * Clear the articles.json cache (useful for development)
 */
export function clearArticlesJsonCache(): void {
  articlesJsonCache = null
  articlesJsonCacheTimestamp = 0
}

/**
 * Load ALL articles for a city's dedicated "all articles" page.
 * Uses a broad fetch (no city pre-filter in Supabase) + comprehensive client-side
 * filtering so articles tagged via the categories/tags arrays are not missed.
 */
export async function getAllCityArticlesWithFallback(city: string): Promise<Article[]> {
  const cityLower = city.toLowerCase()
  console.log(`🔄 Loading ALL ${city} articles for all-articles page...`)

  function matchesCity(article: Article): boolean {
    const loc = (article.location || '').toLowerCase()
    const cat = (article.category || '').toLowerCase()
    const cats = (article.categories || []).map((c: string) => c.toLowerCase())
    const tags = ((article as any).tags || []).map((t: string) => t.toLowerCase())
    const title = (article.title || '').toLowerCase()
    return (
      loc.includes(cityLower) ||
      cat.includes(cityLower) ||
      cats.some(c => c.includes(cityLower)) ||
      tags.some((t: string) => t.includes(cityLower)) ||
      title.includes(cityLower)
    )
  }

  // Primary: fetch all articles (no city filter in DB) and filter client-side
  try {
    const allArticles = await getHomepageArticles()
    if (allArticles.length > 0) {
      const cityArticles = allArticles.filter(matchesCity)
      const result = excludeOtherCityArticles(cityArticles, cityLower)
      console.log(`✅ All-articles page: ${result.length} ${city} articles (from ${allArticles.length} total)`)
      updateOptimizedFallback(allArticles).catch(() => {})
      return result
    }
  } catch (error) {
    console.warn(`⚠️ Broad fetch failed for ${city} all-articles page:`, error)
  }

  // Fallback: optimized JSON with same comprehensive filter
  try {
    const fallback = await loadOptimizedFallback()
    const cityArticles = fallback.filter(matchesCity)
    return excludeOtherCityArticles(cityArticles, cityLower)
  } catch (error) {
    console.error(`❌ Failed to load all ${city} articles from fallback:`, error)
    return []
  }
}

// ---------------------------------------------------------------------------
// Commerce sections (Money, Retail)
//
// These are keyword-driven so existing articles surface immediately, but they
// share a crime/tragedy guard: keywords like "store", "mall" or "grant" would
// otherwise drag in "robbery at the mall" or "assault in a store parking lot".
// An editor can also just tag an article "Money"/"Retail" to force it in.
// ---------------------------------------------------------------------------

const SOMBRE_TERMS = [
  'murder', 'homicide', 'manslaughter', 'killed', 'stabb', 'shooting', ' shot ',
  'robbery', 'sexual', 'assault', 'arrested', 'charged', 'charges', 'accused',
  'allegedly', 'scam', 'fraud', 'stolen', 'theft', 'smash-and-grab', 'raid',
  ' drugs', 'rcmp', 'police', 'fake ', 'victim', 'suspect', 'manhunt', 'weapon',
  ' gun ', 'dead', 'died', 'death', 'fatal', 'crash', 'collision', 'missing',
]

// Deliberately NOT "tax credit"/"tax break": those pull in corporate & film-
// industry incentives (Corus, Netflix, Lactalis) that aren't personal-money help.
const MONEY_TERMS = [
  'rebate', 'refund', 'aish', 'adap', 'cpp', 'pension', 'minimum wage',
  'living wage', 'cost of living', 'affordabil', 'carbon tax', 'income tax',
  'rrsp', 'tfsa', 'gst', 'child care subsidy', 'disability payment',
  'disabilities are losing', 'benefit cheque', 'seniors benefit', 'income support',
]

// High-precision: named chains + explicit retail phrases. Deliberately avoids
// loose substrings like "outlet" (power outlet), "winners" (contest winner) and
// "store"/"town centre" that pull in news, supply and location references.
const RETAIL_TERMS = [
  'costco', 'ikea', 'walmart', 'dollarama', 'canadian tire', 'homesense',
  'uniqlo', 'sephora', 'lululemon', 'best buy', 'no frills', 'save-on-foods',
  'real canadian superstore', 'superstore', 'supercentre', 'department store',
  'shopping centre', 'shopping center', 'shopping mall', ' mall ', 'west edmonton mall',
  'experience store', 'big-box', 'big box store', 'retail chain', 'retailer opens',
]

const isSombreArticle = (article: Article): boolean => {
  const haystack = `${article.title || ''} ${article.excerpt || ''}`.toLowerCase()
  return SOMBRE_TERMS.some(term => haystack.includes(term))
}

const matchesSection = (
  article: Article,
  terms: string[],
  categoryName: string,
  includeExcerpt: boolean,
): boolean => {
  const c = (str: string | undefined) => (str ? str.toLowerCase() : '')
  const name = categoryName.toLowerCase()

  // An explicit editor category wins outright. NOTE: we deliberately ignore the
  // freeform `tags` field — the auto-tagger over-tags (a milk shortage and a bar
  // closing both carry a "retail" tag), so only curated categories are trusted.
  if (c(article.category).includes(name)) return true
  if (article.categories?.some(cat => c(cat).includes(name))) return true

  // Otherwise fall back to topic keywords. Retail matches the TITLE only: a
  // store-opening names the chain in its headline, whereas a milk-shortage or
  // holiday-hours story merely mentions "Costco"/"Superstore" in passing.
  const haystack = (includeExcerpt ? `${article.title || ''} ${article.excerpt || ''}` : `${article.title || ''}`).toLowerCase()
  return terms.some(term => haystack.includes(term))
}

async function getSectionArticlesWithFallback(
  terms: string[],
  categoryName: string,
  includeExcerpt: boolean,
): Promise<Article[]> {
  console.log(`🔄 Loading ${categoryName} articles with fallback system...`)

  const keep = (article: Article) =>
    article.type !== 'event' &&
    !isSombreArticle(article) &&
    matchesSection(article, terms, categoryName, includeExcerpt)

  // Try Supabase first
  try {
    const articles = await getSupabaseArticles()
    const filtered = articles.filter(keep)
    if (filtered.length > 0) {
      console.log(`✅ Loaded ${filtered.length} ${categoryName} articles from Supabase`)
      updateOptimizedFallback(articles).catch(err => console.warn('Background update failed', err))
      return filtered
    }
  } catch (error) {
    console.warn(`⚠️ Supabase failed for ${categoryName}, using fallback:`, error)
  }

  // Fallback: optimized JSON
  try {
    const fallback = await loadOptimizedFallback()
    const filtered = fallback.filter(keep)
    console.log(`⚡ FALLBACK: Returning ${filtered.length} ${categoryName} articles`)
    return filtered
  } catch (error) {
    console.error(`❌ Failed to load ${categoryName} articles from fallback:`, error)
    return []
  }
}

export async function getMoneyArticlesWithFallback(): Promise<Article[]> {
  // Money terms (rebate, AISH, minimum wage…) are specific, so scan title + excerpt.
  return getSectionArticlesWithFallback(MONEY_TERMS, 'money', true)
}

export async function getRetailArticlesWithFallback(): Promise<Article[]> {
  // Retail matches the title only to avoid news that merely mentions a store.
  return getSectionArticlesWithFallback(RETAIL_TERMS, 'retail', false)
}
