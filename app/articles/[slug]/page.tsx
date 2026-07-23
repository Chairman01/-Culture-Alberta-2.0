import { cache, Fragment } from 'react'
import { unstable_cache } from 'next/cache'
import { notFound, permanentRedirect } from 'next/navigation'
import { Calendar, Clock, Bookmark, ArrowLeft, ArrowRight, MapPin, ChevronRight, Calculator } from 'lucide-react'
import { ArticleActions } from '@/components/article-actions'
import Image from 'next/image'
import Link from 'next/link'
import { getArticleById, getArticleBySlug } from '@/lib/supabase-articles'
import { supabase } from '@/lib/supabase'
import { getFastArticleBySlug, getFastArticles } from '@/lib/fast-articles'
import { getTitleFromUrl } from '@/lib/utils/article-url'
import { getArticleUrl } from '@/lib/utils/article-url'
import { createSlug } from '@/lib/utils/slug'
import { Article } from '@/lib/types/article'
import ArticleNewsletterSignup from '@/components/article-newsletter-signup'
import { PreferredSourceCTA } from '@/components/preferred-source-cta'
import { ArticleStructuredData, BreadcrumbStructuredData, ListicleStructuredData } from '@/components/seo/structured-data'
import { ArticleEmbedActivator } from '@/components/article-embed-activator'

// ISR: cache rendered pages for 30 min, revalidate in background.
// Longer window = fewer Supabase revalidations (and ISR writes) during traffic spikes.
// Publishing/editing an article triggers an on-demand revalidation, so new content
// still appears immediately — this only relaxes the background re-render timer.
export const revalidate = 1800
import { getAllEvents, getEventBySlug } from '@/lib/events'
import { Metadata } from 'next'
// import { ArticleReadingFeatures } from '@/components/article-reading-features' // Removed - causing duplicate newsletter

import { processArticleContent } from '@/lib/utils/youtube'
import Script from 'next/script'
import { CommentsSection } from '@/components/comments-section'
import { PollCard } from '@/components/poll-card'
import { ArticleViewCount } from '@/components/article-view-count'
import { getSocialImageUrl } from '@/lib/social-image-url'

// import NewsletterSignup from '@/components/newsletter-signup' // Removed - using ArticleNewsletterSignup instead
// Removed ArticleContent import to fix hydration issues
// import './article-styles.css' // Removed - file was deleted

const LEGACY_ARTICLE_REDIRECTS: Record<string, string> = {}
const useFastDevMode = process.env.NODE_ENV === 'development' && process.env.USE_SUPABASE_IN_DEV !== '1'
const DEFAULT_ARTICLE_AUTHOR = 'Adam Harrison'
type ArticleRecommendation = Article & { recommendationReason?: string; viewCount?: number }

function getImageMimeType(url: string): string {
  const pathname = (() => {
    try {
      return new URL(url).pathname
    } catch {
      return url
    }
  })()
  const ext = pathname.split('.').pop()?.toLowerCase()

  switch (ext) {
    case 'png': return 'image/png'
    case 'gif': return 'image/gif'
    case 'webp': return 'image/webp'
    case 'svg': return 'image/svg+xml'
    case 'jpg':
    case 'jpeg':
    default: return 'image/jpeg'
  }
}

function normalizeArticleAuthor(author?: string | null): string {
  const trimmedAuthor = typeof author === 'string' ? author.trim() : ''
  return trimmedAuthor && trimmedAuthor !== 'Culture Alberta' ? trimmedAuthor : DEFAULT_ARTICLE_AUTHOR
}

function tokenizeForRecommendations(value?: string | null): Set<string> {
  const stopWords = new Set([
    'the', 'and', 'for', 'with', 'after', 'before', 'from', 'that', 'this', 'into',
    'about', 'your', 'you', 'are', 'was', 'were', 'has', 'have', 'will', 'can',
    'its', 'their', 'our', 'out', 'new', 'next', 'why', 'how', 'what',
    'edmonton', 'calgary', 'alberta', 'canada', 'canadian',
  ])

  return new Set(
    (value || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word))
  )
}

const CITY_CATEGORIES = new Set(['edmonton', 'calgary', 'alberta', 'red deer', 'medicine hat', 'grande prairie'])

const RECOMMENDATION_TOPICS: Record<string, string[]> = {
  crime: ['police', 'charged', 'charges', 'arrest', 'assault', 'murder', 'warrant', 'seize', 'seized', 'drug', 'drugs', 'trafficking', 'victim', 'complainants', 'abducted', 'abduction', 'amber', 'homicide', 'stabbing', 'shooting', 'rcmp'],
  transit: ['transit', 'streetcar', 'lrt', 'train', 'bus', 'bridge', 'construction', 'rehabilitation', 'road', 'traffic', 'route', 'station'],
  heritage: ['heritage', 'historic', 'history', 'museum', 'village', 'artifacts', 'century', 'old', 'reopens', 'destroyed', 'visitor'],
  architecture: ['building', 'pavilion', 'campus', 'architecture', 'ugliest', 'iconic', 'design', 'tower', 'downtown'],
  education: ['school', 'schools', 'teacher', 'teachers', 'student', 'students', 'strike', 'classroom', 'education', 'daycare', 'childcare'],
  housing: ['rent', 'rental', 'housing', 'homeless', 'shelter', 'affordable', 'landlord', 'tenant', 'apartment'],
  culture: ['festival', 'arts', 'artist', 'music', 'theatre', 'gallery', 'culture', 'concert', 'exhibit'],
  food: ['restaurant', 'food', 'coffee', 'bar', 'brewery', 'bakery', 'menu', 'chef', 'eat'],
  outdoors: ['park', 'river', 'trail', 'valley', 'outdoor', 'hike', 'winter', 'wildfire', 'lake'],
}

function getRecommendationText(article: Article): string {
  return `${article.title} ${article.excerpt || ''} ${article.description || ''} ${(article.tags || []).join(' ')} ${(article.categories || []).join(' ')}`
}

function getTopicMatches(article: Article): Set<string> {
  const tokens = tokenizeForRecommendations(getRecommendationText(article))
  const matches = new Set<string>()

  for (const [topic, words] of Object.entries(RECOMMENDATION_TOPICS)) {
    if (words.some(word => tokens.has(word))) {
      matches.add(topic)
    }
  }

  return matches
}

function getSharedCount(a: Iterable<string>, b: Set<string>): number {
  let count = 0
  for (const item of a) {
    if (b.has(item.toLowerCase())) count += 1
  }
  return count
}

function getArticleTime(article: Article): number {
  const time = new Date(article.date || article.createdAt || 0).getTime()
  return Number.isFinite(time) ? time : 0
}

function getArticleAgeDays(article: Article): number | null {
  const time = getArticleTime(article)
  if (!time) return null

  const ageDays = (Date.now() - time) / (1000 * 60 * 60 * 24)
  return Number.isFinite(ageDays) ? ageDays : null
}

// Evergreen / SEO content (guides, how-tos, listicles, "best of") stays relevant
// regardless of age, so it is exempt from the recency demotion that time-sensitive
// news (breaking news, crime, events) is subject to. Utility/benefits patterns
// (payment dates, calculators, rebates, stat holidays…) are included because that
// content earns a multiple of news RPM — when it's relevant, we want it surfaced.
const EVERGREEN_TAGS = new Set(['evergreen', 'seo', 'guide', 'guides'])
const EVERGREEN_TITLE_RE =
  /\b(guide|how to|how-to|things to do|where to|best places|best things|ultimate|complete guide|tips|what to know|everything you need|step by step|full list|payment dates?|calculator|rebates?|benefits?|stat holidays?|statutory holidays?|cost of living|minimum wage|openings? in|who'?s hiring|explained|what .* actually changes)\b/

// Weekend guides ("7 great things to do in Calgary this weekend: July 10 to 12")
// LOOK evergreen by title ("things to do") but are dead the moment the weekend
// passes — detect them by the "this weekend" framing or an explicit month+day
// range in the title, and expire them fast instead.
const DATED_GUIDE_RE = /\bthis weekend\b|\blong weekend\b|what['’]?s open/
const MONTH_DAY_RANGE_RE =
  /\b(january|february|march|april|may|june|july|august|september|october|november|december)\.?\s+\d{1,2}\s*(?:to|through|until|–|—|-)\s*(?:(?:january|february|march|april|may|june|july|august|september|october|november|december)\.?\s+)?\d{1,2}\b/

function isDatedGuide(article: Article): boolean {
  const title = (article.title || '').toLowerCase()
  return DATED_GUIDE_RE.test(title) || MONTH_DAY_RANGE_RE.test(title)
}

// Real Mediavine RPM data (July 2026) — these clusters earn a multiple of the
// site's news RPM ($3–5), so they get a proportional recommendation boost:
//   ~$25–31 RPM: Alberta energy rebate cluster
//   ~$14–23 RPM: benefits (AISH/ADAP/payment dates), Costco/chain openings,
//                stat holidays, rent/damage deposit, minimum wage
// The boost stacks with topical relevance scoring, so these surface where they
// make sense — a rebate article won't outrank a same-story crime follow-up, but
// it beats loosely-related news.
const HIGH_RPM_TIERS: Array<{ pattern: RegExp; boost: number }> = [
  { pattern: /energy rebate|\$100 rebate|rebate (checker|portal|application)/, boost: 30 },
  { pattern: /\baish\b|\badap\b|assured income|payment dates?|\bbenefits?\b|stat(utory)? holidays?|minimum wage|damage deposit|rent increase|\bcostco\b|\bwingstop\b|grand opening|openings? in \w+/, boost: 22 },
]

function getHighRpmBoost(article: Article): number {
  const text = `${article.title || ''} ${(article.tags || []).join(' ')}`.toLowerCase()
  for (const tier of HIGH_RPM_TIERS) {
    if (tier.pattern.test(text)) return tier.boost
  }
  return 0
}

function isEvergreenLike(article: Article): boolean {
  const tags = (article.tags || []).map(tag => tag.toLowerCase())
  // Explicit 'evergreen' tag is a manual override and always wins.
  if (tags.some(tag => EVERGREEN_TAGS.has(tag))) return true

  // Date-scoped guides are time-sensitive no matter how evergreen the title reads.
  if (isDatedGuide(article)) return false

  const category = (article.category || '').toLowerCase()
  const categories = (article.categories || []).map(entry => entry.toLowerCase())
  if (category === 'guide' || categories.includes('guide')) return true

  return EVERGREEN_TITLE_RE.test((article.title || '').toLowerCase())
}

// Short-lived advisories (weather warnings, closures, evacuations, recalls…).
// A "snowstorm hits this weekend" story recommended months later reads as broken,
// so these expire fast and are then excluded outright.
const ALERT_TITLE_RE =
  /\b(warns?|warning|advisory|alert|closures?|closed|cancell?ed|postponed|evacuat\w+|snowstorm|snowfall|blizzard|freezing rain|ice storm|wind chill|heat wave|air quality|flood(ing)? (warning|watch)|recalls?|outage|non-essential travel)\b/

function isAlertLike(article: Article): boolean {
  return ALERT_TITLE_RE.test(`${article.title || ''} ${article.excerpt || ''}`.toLowerCase())
}

// Poll tone gate: every article shows only ITS OWN poll (no site-wide fallback
// question, per editorial decision). The AI generator is the primary judge —
// it reads the full article and refuses polls on sensitive stories — so this
// render-time backstop only blocks true tragedy/emergency stories. It must NOT
// match broad crime words like "police": a victimless "driver caught at
// 230 km/h" story is prime poll material even though police are in the title.
const TRAGEDY_TITLE_RE =
  /\b(dead|death|dies|died|killed|fatal|fatality|drowns?|drowned|drowning|homicide|murder|stabbing|shooting|assaults?|gunpoint|robbery|vigil|mourns?|mourning|funeral|obituar(y|ies)|missing|body found|suicide|overdoses?|victims?|laid to rest|plane crash|collision|manslaughter|inquest|coroner|cancer|evacuations?|evacuated|state of emergency)\b/

// Deliberately NOT reusing isAlertLike here: its regex catches stray words like
// "warning range" in a breathalyzer story. Polls now exist only by deliberate
// choice (editor checkbox or user-triggered backfill), so the only render-time
// backstop needed is the death/violence list above.
function isTragedyArticle(article: Article): boolean {
  const text = `${article.title || ''} ${article.excerpt || ''}`.toLowerCase()
  return TRAGEDY_TITLE_RE.test(text)
}

// Hard exclusions — these never appear in recommendations, no matter how thin the
// candidate pool is:
//  - crime stories older than 5 days (traffic-driven when fresh, dead weight after)
//  - dated guides ("this weekend: July 10 to 12") older than 5 days (weekend's over)
//  - alerts/advisories older than 7 days (the event is over)
//  - any non-evergreen news older than 60 days
function isExpiredTimeSensitive(article: Article): boolean {
  const ageDays = getArticleAgeDays(article)
  if (ageDays === null || isEvergreenLike(article)) return false

  if (getTopicMatches(article).has('crime') && ageDays > 5) return true
  // Holiday open/closed guides ("Canada Day 2026: What's Open, What's Closed")
  // are published ~a week before their holiday — 14 days covers the lead-up and
  // the day itself, then they're done until next year. Checked before the general
  // dated-guide rule so they get the longer window.
  if (/what['’]?s open/.test((article.title || '').toLowerCase())) return ageDays > 14
  if (isDatedGuide(article) && ageDays > 5) return true
  if (isAlertLike(article) && ageDays > 7) return true
  return ageDays > 60
}

// Resolve the city an article belongs to (used to blend city-relevant evergreen
// content into time-sensitive recommendations). Prefers a specific city over the
// province-wide "alberta" bucket so an Edmonton story matches Edmonton evergreen.
function getArticleCity(article: Article): string | null {
  const pool = [
    (article.category || '').toLowerCase(),
    (article.location || '').toLowerCase(),
    ...(article.categories || []).map(entry => entry.toLowerCase()),
  ].filter(Boolean)

  const matches = pool.filter(value => CITY_CATEGORIES.has(value))
  if (matches.length === 0) return null

  return matches.find(city => city !== 'alberta') || matches[0]
}

// Continuous recency contribution. Most published content is already 30+ days old,
// so the curve has to keep separating articles across MONTHS (not just days) for the
// newest relevant story to win over an older but equally on-topic one.
function getRecencyScore(ageDays: number): number {
  if (ageDays < 3) return 40
  if (ageDays < 7) return 32
  if (ageDays < 14) return 24
  if (ageDays < 21) return 14
  if (ageDays < 30) return 4
  if (ageDays < 45) return -10
  if (ageDays < 60) return -25
  if (ageDays < 90) return -45
  if (ageDays < 120) return -65
  if (ageDays < 180) return -90
  if (ageDays < 270) return -120
  return -150
}

function scoreArticleRecommendation(current: Article, candidate: Article): number {
  let score = 0
  const currentCategory = (current.category || '').toLowerCase()
  const candidateCategory = (candidate.category || '').toLowerCase()
  const currentLocation = (current.location || '').toLowerCase()
  const candidateLocation = (candidate.location || '').toLowerCase()
  const currentCategories = new Set((current.categories || []).map(category => category.toLowerCase()))
  const candidateCategories = (candidate.categories || []).map(category => category.toLowerCase())
  const currentTags = new Set((current.tags || []).map(tag => tag.toLowerCase()))
  const candidateTags = (candidate.tags || []).map(tag => tag.toLowerCase())
  const currentWords = tokenizeForRecommendations(getRecommendationText(current))
  const candidateWords = tokenizeForRecommendations(getRecommendationText(candidate))
  const currentTitleWords = tokenizeForRecommendations(current.title)
  const candidateTitleWords = tokenizeForRecommendations(candidate.title)
  const currentTopics = getTopicMatches(current)
  const candidateTopics = getTopicMatches(candidate)
  const sharedTopics = getSharedCount(candidateTopics, currentTopics)

  if (currentCategory && candidateCategory && currentCategory === candidateCategory) {
    score += CITY_CATEGORIES.has(currentCategory) ? 4 : 22
  }
  if (currentLocation && candidateLocation && currentLocation === candidateLocation) score += 8
  score += getSharedCount(candidateCategories, currentCategories) * 12
  score += getSharedCount(candidateTags, currentTags) * 10
  score += getSharedCount(candidateWords, currentWords) * 4
  score += getSharedCount(candidateTitleWords, currentTitleWords) * 10
  score += sharedTopics * 28

  if (currentTopics.size > 0 && candidateTopics.size > 0 && sharedTopics === 0) score -= 18
  if (!currentTopics.has('crime') && candidateTopics.has('crime')) score -= 26
  if (currentTopics.has('crime') && !candidateTopics.has('crime')) score -= 10

  if (candidate.featuredHome || candidate.featuredEdmonton || candidate.featuredCalgary || candidate.featuredAlberta) score += 5
  if (candidate.trendingHome || candidate.trendingEdmonton || candidate.trendingCalgary || candidate.trendingAlberta) score += 8

  const ageDays = getArticleAgeDays(candidate)
  if (ageDays !== null) {
    // Strong recency bias so the newest relevant story wins. Evergreen / SEO content
    // (guides, how-tos, "best of" lists) is timeless, so it is never demoted for age —
    // it keeps the freshness boost when recent but takes no penalty when old.
    const recency = getRecencyScore(ageDays)
    score += isEvergreenLike(candidate) ? Math.max(recency, 8) : recency
  }

  // Utility/benefits content earns a multiple of news RPM, so evergreen wins
  // against news unless the news is substantially more relevant. Clusters with
  // measured high RPM get a proportional boost (max, not stacked, with the
  // generic evergreen bump — a rebate article is already evergreen).
  const rpmBoost = getHighRpmBoost(candidate)
  const evergreenBoost = isEvergreenLike(candidate) ? 18 : 0
  score += Math.max(rpmBoost, evergreenBoost)

  const viewCount = (candidate as ArticleRecommendation).viewCount || (candidate as any).view_count || 0
  if (viewCount > 0) {
    score += Math.min(18, Math.log10(viewCount + 1) * 7)
  }

  return score
}

function getRecommendationReason(current: Article, candidate: Article): string {
  if (current.location && candidate.location && current.location === candidate.location) {
    return `More from ${candidate.location}`
  }
  if (current.category && candidate.category && current.category === candidate.category) {
    return `More ${candidate.category}`
  }
  const sharedTag = (candidate.tags || []).find(tag =>
    (current.tags || []).some(currentTag => currentTag.toLowerCase() === tag.toLowerCase())
  )
  if (sharedTag) return `Also about ${sharedTag}`
  // High-RPM utility picks get an honest utility label instead of the generic
  // fallback — tells the reader why a money/benefits piece is here.
  if (getHighRpmBoost(candidate) > 0) return 'Helpful resource'
  if (candidate.trendingHome || candidate.trendingEdmonton || candidate.trendingCalgary) return 'Trending now'
  return 'Recommended next'
}

function getCityHub(location?: string | null, categories?: string[] | null, category?: string | null): { url: string; label: string } | null {
  const text = `${location || ''} ${(categories || []).join(' ')} ${category || ''}`.toLowerCase()
  if (text.includes('edmonton')) return { url: '/edmonton', label: 'Edmonton' }
  if (text.includes('calgary')) return { url: '/calgary', label: 'Calgary' }
  if (text.includes('alberta')) return { url: '/alberta', label: 'Alberta' }
  return null
}

// unstable_cache: shared across ALL concurrent serverless invocations on Vercel.
// Prevents the thundering herd — if 50 users trigger ISR revalidation at the same
// time for the same article, only ONE Supabase call is made; the rest get the cache.
const getArticleFromDB = unstable_cache(
  async (slug: string): Promise<Article | null> => {
    let article: Article | null = null
    try {
      const { data, error } = await Promise.race([
        // Public page: drafts must 404 here, not render. This query is the one a
        // reader (or a crawler) actually hits for /articles/<slug>.
        supabase.from('articles').select('*').eq('slug', slug).eq('status', 'published').maybeSingle(),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Supabase slug timeout')), 3000))
      ]) as any

      if (!error && data) {
        article = {
          ...data,
          imageUrl: data.image_url || data.image || data.imageUrl,
          imageSource: data.image_source || data.imageSource || null,
          date: data.date || data.created_at,
          createdAt: data.created_at || data.createdAt,
          updatedAt: data.updated_at || data.updatedAt,
          trendingHome: data.trending_home || data.trendingHome || false,
          trendingEdmonton: data.trending_edmonton || data.trendingEdmonton || false,
          trendingCalgary: data.trending_calgary || data.trendingCalgary || false,
          featuredHome: data.featured_home || data.featuredHome || false,
          featuredEdmonton: data.featured_edmonton || data.featuredEdmonton || false,
          featuredCalgary: data.featured_calgary || data.featuredCalgary || false,
        }
      }
    } catch {}
    if (!article) {
      try { article = await getArticleBySlug(slug) } catch {}
    }
    if (!article) {
      try { article = await getArticleById(slug) } catch {}
    }
    return article
  },
  ['article-db'],
  { revalidate: 1800 } // 30 min — matches the ISR window above
)

// React.cache(): deduplicates within a single request (metadata + page component).
const getCachedArticle = cache(async (slug: string): Promise<Article | null> => {
  // Article detail pages should prefer Supabase so admin edits, including author
  // changes, are reflected instead of stale optimized-fallback data.
  if (!useFastDevMode) {
    const dbArticle = await getArticleFromDB(slug)
    if (dbArticle) return dbArticle
  }

  const fast = await getFastArticleBySlug(slug)
  if (fast) return fast

  return useFastDevMode ? getArticleFromDB(slug) : null
})

function logArticlePage(event: string, data: Record<string, unknown>) {
  try {
    console.log(`[article-page:${event}]`, JSON.stringify({
      ...data,
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV || null,
      timestamp: new Date().toISOString(),
    }))
  } catch {
    console.log(`[article-page:${event}]`, data)
  }
}

function summarizeArticleForLog(article: Article | null | undefined) {
  if (!article) return null
  return {
    id: article.id,
    title: article.title,
    slug: article.slug || createSlug(article.title || ''),
    status: article.status,
    type: article.type,
    category: article.category,
    contentLength: typeof article.content === 'string' ? article.content.length : 0,
    excerptLength: typeof article.excerpt === 'string' ? article.excerpt.length : 0,
    imagePresent: !!article.imageUrl,
  }
}

function mapRecommendationArticleRow(row: any): ArticleRecommendation {
  return {
    ...row,
    imageUrl: row.image_url || row.image || row.imageUrl,
    imageSource: row.image_source || row.imageSource || null,
    date: row.date || row.created_at || row.createdAt,
    readTime: row.read_time || row.readTime,
    createdAt: row.created_at || row.createdAt,
    updatedAt: row.updated_at || row.updatedAt,
    trendingHome: row.trending_home || row.trendingHome || false,
    trendingEdmonton: row.trending_edmonton || row.trendingEdmonton || false,
    trendingCalgary: row.trending_calgary || row.trendingCalgary || false,
    trendingAlberta: row.trending_alberta || row.trendingAlberta || false,
    featuredHome: row.featured_home || row.featuredHome || false,
    featuredEdmonton: row.featured_edmonton || row.featuredEdmonton || false,
    featuredCalgary: row.featured_calgary || row.featuredCalgary || false,
    featuredAlberta: row.featured_alberta || row.featuredAlberta || false,
    viewCount: row.view_count || row.viewCount || 0,
  }
}

const getFreshRecommendationCandidates = unstable_cache(
  async (): Promise<ArticleRecommendation[]> => {
    // NO `content` in this select: scoring only reads title/excerpt/description/
    // tags/categories, and content added ~500kB per refresh — enough to trip the
    // timeout below, which silently emptied the pool.
    //
    // Order by created_at, not date: articles created after May 8 2026 had NULL
    // date (the create route never set it), so `date DESC NULLS LAST LIMIT 120`
    // permanently excluded every new article — recommendations froze on the last
    // 120 articles dated before then. created_at is always set.
    const { data, error } = await Promise.race([
      supabase
        .from('articles')
        .select(`
          id, title, excerpt, description, image_url, image, image_source,
          category, categories, location, date, read_time, type, author, status, tags,
          slug, created_at, updated_at, trending_home, trending_edmonton, trending_calgary,
          trending_alberta, featured_home, featured_edmonton, featured_calgary,
          featured_alberta, view_count
        `)
        .eq('status', 'published')
        .neq('type', 'event')
        .order('created_at', { ascending: false, nullsFirst: false })
        .limit(120),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Supabase recommendations timeout')), 3000))
    ]) as any

    // Throw instead of returning [] — unstable_cache memoizes return values, so a
    // returned [] would pin an EMPTY pool (and stale-fallback recommendations) for
    // the whole 15-minute revalidate window. Thrown errors are not cached.
    if (error) {
      throw new Error(`Supabase recommendation lookup failed: ${error.message}`)
    }

    return (data || []).map(mapRecommendationArticleRow)
  },
  ['fresh-article-recommendation-candidates'],
  { revalidate: 900 }
)

async function getFullArticleContentById(id: string): Promise<string | null> {
  try {
    const { data, error } = await Promise.race([
      supabase
        .from('articles')
        .select('content')
        .eq('id', id)
        .maybeSingle(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Supabase content timeout')), 5000))
    ]) as any

    if (error) {
      console.warn('Supabase content lookup failed:', error.message)
      return null
    }

    return typeof data?.content === 'string' && data.content.trim().length > 0
      ? data.content
      : null
  } catch (error) {
    console.warn('Supabase content lookup failed:', error instanceof Error ? error.message : error)
    return null
  }
}

function isNextNavigationError(error: unknown): boolean {
  const digest = typeof error === 'object' && error !== null && 'digest' in error
    ? String((error as { digest?: unknown }).digest)
    : ''

  // Next 15 changed notFound()'s digest from 'NEXT_NOT_FOUND' to
  // 'NEXT_HTTP_ERROR_FALLBACK;404'. Match both so notFound()/redirect() thrown
  // inside the try are re-thrown cleanly (a proper 404/redirect) instead of being
  // swallowed by the catch and re-issued — which produced soft-404s (HTTP 200).
  return digest.startsWith('NEXT_REDIRECT') ||
    digest.startsWith('NEXT_NOT_FOUND') ||
    digest.startsWith('NEXT_HTTP_ERROR_FALLBACK')
}

// Don't pre-render articles at build time — let ISR handle on first request.
// Pre-rendering 200+ articles at build time made deployments take 5+ minutes.
export async function generateStaticParams() {
  return []
}

// Generate metadata for social media sharing
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const resolvedParams = await params
  const originalSlug = resolvedParams.slug
  const slug = LEGACY_ARTICLE_REDIRECTS[originalSlug] || originalSlug

  try {
    // Load article data for metadata - uses React.cache() to share result with page component
    const loadedArticle = await getCachedArticle(slug)

    if (!loadedArticle) {
      return {
        title: 'Article Not Found | Culture Alberta',
        description: 'The requested article could not be found.',
        robots: { index: false, follow: false },
      }
    }

    const fullTitle = loadedArticle.title.includes('Culture Alberta') ? loadedArticle.title : `${loadedArticle.title} | Culture Alberta`

    // Create a proper description for social sharing
    // Don't truncate - let each platform handle its own display limits
    // Reddit shows ~300 chars, Twitter ~200, Facebook ~300
    const description = loadedArticle.excerpt || loadedArticle.description || `Read about ${loadedArticle.title} on Culture Alberta`

    // Always use canonical slug (from title) not the incoming slug (which could be a numeric ID)
    const canonicalSlug = loadedArticle.slug || createSlug(loadedArticle.title)
    const fullUrl = `https://www.culturealberta.com/articles/${canonicalSlug}`

    // Social crawlers need a public, non-base64 image URL. Supabase Storage images
    // are served through our proxy so Reddit can validate them without restrictive headers.
    const absoluteImageUrl = getSocialImageUrl(loadedArticle.imageUrl)
    const imageMimeType = getImageMimeType(loadedArticle.imageUrl || absoluteImageUrl)

    // Debug logging for metadata
    console.log('Article Metadata Debug:', {
      title: fullTitle,
      description: description,
      image: absoluteImageUrl,
      imageMimeType: imageMimeType,
      url: fullUrl,
      originalImage: loadedArticle.imageUrl
    })

    return {
      title: fullTitle,
      description: description,
      keywords: [...(loadedArticle.tags || []), loadedArticle.category, 'Alberta', 'Culture'].filter(Boolean).join(', '),
      authors: [{ name: normalizeArticleAuthor(loadedArticle.author) }],
      robots: {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          'max-snippet': -1,
          'max-image-preview': 'large',
          'max-video-preview': -1,
        },
      },
      openGraph: {
        type: 'article',
        title: fullTitle,
        description: description,
        url: fullUrl,
        images: [
          {
            url: absoluteImageUrl,
            width: 1200,
            height: 630,
            alt: loadedArticle.title,
            type: imageMimeType,
          }
        ],
        siteName: 'Culture Alberta',
        locale: 'en_CA',
        publishedTime: loadedArticle.date,
        modifiedTime: loadedArticle.updatedAt || loadedArticle.date,
        authors: [normalizeArticleAuthor(loadedArticle.author)],
        section: loadedArticle.category,
        tags: loadedArticle.tags || [],
      },
      twitter: {
        card: 'summary_large_image',
        title: fullTitle,
        description: description,
        images: [absoluteImageUrl],
        site: '@culturealberta',
        creator: '@culturealberta',
      },
      alternates: {
        canonical: fullUrl,
      },
      // Additional meta tags for article info
      other: {
        'article:author': normalizeArticleAuthor(loadedArticle.author),
        'article:section': loadedArticle.category || '',
        'article:published_time': loadedArticle.date || '',
        'article:modified_time': loadedArticle.updatedAt || loadedArticle.date || '',
      },
      // Metadata for better Reddit previews
      metadataBase: new URL('https://www.culturealberta.com'),
    }
  } catch (error) {
    console.error('Error generating metadata:', error)
    return {
      title: 'Article | Culture Alberta',
      description: 'Read the latest articles on Culture Alberta.',
    }
  }
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params
  const slug = resolvedParams.slug

  if (LEGACY_ARTICLE_REDIRECTS[slug]) {
    permanentRedirect(`/articles/${LEGACY_ARTICLE_REDIRECTS[slug]}`)
  }

  try {
    // Use cached article lookup - shared with generateMetadata to avoid double DB calls
    let loadedArticle = await getCachedArticle(slug)

    // Last resort - complex slug matching in local cache
    if (!loadedArticle) {
      const fastArticles = await getFastArticles()

      // Try multiple matching strategies
      loadedArticle = fastArticles.find(article => {
        if (article.slug && String(article.slug).toLowerCase() === slug.toLowerCase()) {
          return true
        }

        const articleSlug = createSlug(article.title)

        if (articleSlug.toLowerCase() === slug.toLowerCase()) return true

        // Only match if the requested slug contains the article slug (not reverse)
        // Prevents "...-gale-again" from matching when looking for "...-gale"
        if (slug.toLowerCase().includes(articleSlug.toLowerCase())) return true

        // Title-based slug fallback
        if (article.title.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-') === slug.toLowerCase()) return true

        return false
      }) || null
    }

    if (!loadedArticle) {
      logArticlePage('not-found', { slug })

      // IMPORTANT: permanentRedirect()/redirect() work by THROWING. They must be
      // called OUTSIDE any try/catch, or the catch swallows the redirect and we
      // fall through to notFound() (the bug that soft-404'd renamed articles).
      // So: resolve the target inside the try, then redirect after it.

      // Check if this might be an event instead of an article
      let eventRedirectSlug: string | null = null
      try {
        const allEvents = await getAllEvents()
        const eventSlug = createSlug(slug)
        for (const event of allEvents) {
          if (createSlug(event.title) === eventSlug) {
            eventRedirectSlug = eventSlug
            break
          }
        }
      } catch (error) {
        console.warn('Failed to check events:', error)
      }
      if (eventRedirectSlug) {
        permanentRedirect(`/events/${eventRedirectSlug}`)
      }

      // Check slug_redirects table for renamed articles
      let renamedRedirectSlug: string | null = null
      try {
        const { data: slugRedirect } = await supabase
          .from('slug_redirects')
          .select('new_slug')
          .eq('old_slug', slug)
          .single()
        if (slugRedirect?.new_slug) {
          renamedRedirectSlug = slugRedirect.new_slug
        }
      } catch {
        // No redirect found, fall through to notFound
      }
      if (renamedRedirectSlug) {
        permanentRedirect(`/articles/${renamedRedirectSlug}`)
      }

      notFound()
    }

    logArticlePage('loaded', { slug, article: summarizeArticleForLog(loadedArticle) })
    loadedArticle = {
      ...loadedArticle,
      author: normalizeArticleAuthor(loadedArticle.author),
    }

    // Redirect numeric ID URLs (e.g. /articles/article-1766206001328-0yq0zr5g5)
    // to the canonical title-based slug (e.g. /articles/attention-edmonton-...)
    const canonicalSlug = loadedArticle.slug || createSlug(loadedArticle.title)
    if (slug !== canonicalSlug) {
      permanentRedirect(`/articles/${canonicalSlug}`)
    }

    // If content is missing or too short, lazily fetch full content from Supabase
    try {
      const hasUsableContent = !!(
        loadedArticle.content &&
        typeof loadedArticle.content === 'string' &&
        loadedArticle.content.trim().length > 100
      )
      if (!hasUsableContent) {
        console.log('🔎 Article content missing/short, attempting Supabase fetch for full content...')
        const directContent = await getFullArticleContentById(loadedArticle.id)
        if (directContent) {
          loadedArticle = { ...loadedArticle, content: directContent }
          console.log(`Fetched full content directly from Supabase (length: ${directContent.length})`)
        } else {
        // Must be > getArticleById's own 4500ms timeout so that function can complete
        const timeoutMs = process.env.NODE_ENV === 'development' ? 7000 : 5000
        const withTimeout = async (promise: Promise<any>): Promise<any | null> => {
          try {
            return await Promise.race([
              promise,
              new Promise<null>((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs))
            ])
          } catch {
            return null
          }
        }

        // ID lookup is a single-row query and much faster than slug scans.
        let supabaseArticle = await withTimeout(getArticleById(loadedArticle.id))
        if (!supabaseArticle && !useFastDevMode) {
          supabaseArticle = await withTimeout(getArticleBySlug(slug))
        }
        if (supabaseArticle && typeof supabaseArticle.content === 'string' && supabaseArticle.content.trim().length > 0) {
          loadedArticle = { ...loadedArticle, content: supabaseArticle.content }
          console.log(`✅ Fetched full content from Supabase (length: ${supabaseArticle.content.length})`)
        } else {
          console.log('⚠️ Supabase did not return content; trying admin API as final fallback')
          try {
            const controller = new AbortController()
            const abortTimer = setTimeout(() => controller.abort(), timeoutMs)
            const fallbackArticles = await getFastArticles()
            const articleId = loadedArticle!.id
            const fallbackArticle = fallbackArticles.find(article =>
              article.id === articleId ||
              (article.slug && String(article.slug).toLowerCase() === slug.toLowerCase()) ||
              createSlug(article.title) === slug.toLowerCase()
            )
            const resp = {
              ok: !!(fallbackArticle && typeof fallbackArticle.content === 'string' && fallbackArticle.content.trim().length > 0),
              status: fallbackArticle ? 200 : 404,
              json: async () => fallbackArticle,
            }
            clearTimeout(abortTimer)
            if (resp.ok) {
              const apiArticle = await resp.json()
              if (apiArticle && typeof apiArticle.content === 'string' && apiArticle.content.trim().length > 0) {
                loadedArticle = { ...loadedArticle, content: apiArticle.content }
                console.log(`✅ Filled content from admin API (length: ${apiArticle.content.length})`)
              } else {
                console.log('⚠️ Admin API did not return content; showing excerpt placeholder')
              }
            } else {
              console.log('⚠️ Admin API request failed:', resp.status)
            }
          } catch (apiErr) {
            console.log('⚠️ Admin API content fetch failed:', apiErr)
          }
        }
        }
      }
    } catch (contentFetchError) {
      console.warn('⚠️ Failed to fetch full content from Supabase:', contentFetchError)
    }

    // Article loaded successfully

    // Load recommendation candidates from Supabase first so new articles can appear quickly.
    // The optimized fallback cache is only a resilience backup.
    let relatedArticles: ArticleRecommendation[] = []
    // A second, DISTINCT set of recommendations for the "Recommended Reads" sidebar.
    // It must never overlap the "Keep Reading" grid below.
    let sidebarArticles: ArticleRecommendation[] = []
    try {
      // Failures throw (so unstable_cache never pins an empty pool) but must not
      // kill the section — swallow here and lean on the static fallback below.
      let freshCandidates: ArticleRecommendation[] = []
      try {
        freshCandidates = await getFreshRecommendationCandidates()
      } catch (error) {
        console.warn('Fresh recommendation candidates unavailable:', error instanceof Error ? error.message : error)
      }
      const fallbackCandidates = freshCandidates.length >= 12
        ? []
        : (await getFastArticles()).filter(a => a.type !== 'event')

      const seenCandidates = new Set<string>()
      const recommendationCandidates = [...freshCandidates, ...fallbackCandidates]
        .map(article => mapRecommendationArticleRow(article))
        .filter(article => {
          const candidateSlug = article.slug || createSlug(article.title || '')
          const currentSlug = loadedArticle.slug || createSlug(loadedArticle.title || '')
          const dedupeKey = String(article.id || candidateSlug || article.title).toLowerCase()

          if (article.id === loadedArticle.id || candidateSlug === currentSlug) return false
          if (article.status && article.status !== 'published') return false
          if (String(article.type || '').toLowerCase() === 'event') return false
          if (isExpiredTimeSensitive(article)) return false
          if (seenCandidates.has(dedupeKey)) return false

          seenCandidates.add(dedupeKey)
          return true
        })

      if (recommendationCandidates.length > 0) {
        const GRID_SIZE = 6
        const SIDEBAR_SIZE = 3
        const EVERGREEN_SLOTS = 3

        const keyOf = (article: ArticleRecommendation) =>
          String(article.id || article.slug || article.title).toLowerCase()

        const byScoreThenRecency = (a: ArticleRecommendation, b: ArticleRecommendation) => {
          const scoreDiff = ((b as any).recommendationScore || 0) - ((a as any).recommendationScore || 0)
          if (scoreDiff !== 0) return scoreDiff
          return getArticleTime(b) - getArticleTime(a)
        }

        // Score every candidate once, best first.
        const ranked = recommendationCandidates
          .map(article => ({
            ...article,
            recommendationReason: getRecommendationReason(loadedArticle, article),
            recommendationScore: scoreArticleRecommendation(loadedArticle, article),
          }))
          .sort(byScoreThenRecency)

        // Hard ~2-week recency window: only recommend fresh stories, EXCEPT
        // evergreen/SEO content, which stays relevant when older. (Cumulative view
        // count used to grant this exemption too — but lifetime views correlate
        // with AGE, not quality, so it mostly resurrected old viral news. Expired
        // time-sensitive stories are already excluded from the pool entirely.)
        // Anything else that's stale is kept only as a last-resort top-up below,
        // so the section is never left empty.
        const RECENT_DAYS = 14
        const MAX_CRIME_RECS = 2
        const isFreshEnough = (a: ArticleRecommendation) => {
          const age = getArticleAgeDays(a)
          return (age !== null && age <= RECENT_DAYS) || isEvergreenLike(a)
        }
        const prioritized = [
          ...ranked.filter(isFreshEnough),
          ...ranked.filter((a) => !isFreshEnough(a)),
        ]

        const sourceCity = getArticleCity(loadedArticle)
        const sourceIsEvergreen = isEvergreenLike(loadedArticle)
        const sourceIsCrime = getTopicMatches(loadedArticle).has('crime')
        const isCrimeArticle = (article: ArticleRecommendation) => getTopicMatches(article).has('crime')
        const usedKeys = new Set<string>()
        const grid: ArticleRecommendation[] = []

        // Request D: time-sensitive stories (crime, breaking news) are TRAFFIC drivers,
        // not REVENUE drivers. Recommending only more crime wastes the visit, so reserve
        // grid slots for NON-CRIME, city-relevant content (the SEO / revenue drivers) to
        // guarantee a MIX. Preference order: evergreen guides for the same city, then any
        // non-crime story from the same city, then province-wide, then any non-crime.
        if (!sourceIsEvergreen) {
          const reserveTarget = sourceIsCrime ? EVERGREEN_SLOTS : 2
          const nonCrime = prioritized.filter(article => !isCrimeArticle(article))
          const tiers: ArticleRecommendation[][] = [
            nonCrime.filter(a => isEvergreenLike(a) && getArticleCity(a) === sourceCity),
            nonCrime.filter(a => isEvergreenLike(a) && getArticleCity(a) === 'alberta'),
            // ANY evergreen before plain news: the reserved slots exist to surface
            // high-RPM utility content, so city mismatch alone must not hand them
            // to another news story.
            nonCrime.filter(a => isEvergreenLike(a)),
            nonCrime.filter(a => getArticleCity(a) === sourceCity),
            nonCrime.filter(a => getArticleCity(a) === 'alberta'),
            nonCrime,
          ]
          for (const tier of tiers) {
            if (grid.length >= reserveTarget) break
            for (const article of tier) {
              if (grid.length >= reserveTarget) break
              if (usedKeys.has(keyOf(article))) continue
              usedKeys.add(keyOf(article))
              grid.push(article)
            }
          }
        }

        // Fill remaining grid slots with the strongest remaining matches, capping
        // crime stories at MAX_CRIME_RECS so a city's feed isn't wall-to-wall crime.
        let crimeInGrid = grid.filter(isCrimeArticle).length
        for (const article of prioritized) {
          if (grid.length >= GRID_SIZE) break
          if (usedKeys.has(keyOf(article))) continue
          if (isCrimeArticle(article) && crimeInGrid >= MAX_CRIME_RECS) continue
          usedKeys.add(keyOf(article))
          grid.push(article)
          if (isCrimeArticle(article)) crimeInGrid++
        }
        // Last-resort top-up (ignores the crime cap) so the grid is never short.
        for (const article of prioritized) {
          if (grid.length >= GRID_SIZE) break
          if (usedKeys.has(keyOf(article))) continue
          usedKeys.add(keyOf(article))
          grid.push(article)
        }

        relatedArticles = grid
          .sort(byScoreThenRecency)
          .map(({ recommendationScore, ...article }: any) => article)

        // Request E: the sidebar shows the next-best matches that are NOT already in the
        // grid, so the two lists are always disjoint. Seed it with the best remaining
        // evergreen pick (high-RPM utility content should appear in BOTH lists), falling
        // back to any non-crime pick for crime stories so it isn't wall-to-wall crime.
        const sidebar: ArticleRecommendation[] = []
        const sidebarSeed =
          prioritized.find(a => (isEvergreenLike(a) || getHighRpmBoost(a) > 0) && !usedKeys.has(keyOf(a))) ||
          (sourceIsCrime ? prioritized.find(a => !isCrimeArticle(a) && !usedKeys.has(keyOf(a))) : undefined)
        if (sidebarSeed) {
          usedKeys.add(keyOf(sidebarSeed))
          sidebar.push(sidebarSeed)
        }
        for (const article of prioritized) {
          if (sidebar.length >= SIDEBAR_SIZE) break
          if (usedKeys.has(keyOf(article))) continue
          usedKeys.add(keyOf(article))
          sidebar.push(article)
        }
        sidebarArticles = sidebar
          .sort(byScoreThenRecency)
          .map(({ recommendationScore, ...article }: any) => article)
      }
    } catch (error) {
      console.warn('Failed to load related articles:', error)
      relatedArticles = []
      sidebarArticles = []
    }

    const formatDate = (dateString: string) => {
      try {
        // Handle empty or invalid date strings
        if (!dateString || dateString.trim() === '') {
          return ''
        }
        const date = new Date(dateString)
        // Check if date is valid
        if (isNaN(date.getTime())) {
          return ''
        }
        return new Intl.DateTimeFormat('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
          timeZone: 'America/Edmonton',
        }).format(date)
      } catch {
        return ''
      }
    }

    const cityHub = getCityHub(loadedArticle.location, loadedArticle.categories, loadedArticle.category)

    return (
      <>
        {/* Structured Data for Google Rich Snippets */}
        <ArticleStructuredData article={loadedArticle} />
        <ListicleStructuredData article={loadedArticle} />
        <BreadcrumbStructuredData
          articleTitle={loadedArticle.title}
          articleCategory={loadedArticle.category}
          articleSlug={slug}
        />

        {/* Metadata is now handled by generateMetadata function */}
        {/* Article JSON-LD is handled by <ArticleStructuredData> above — inline duplicate removed */}

        <div className="min-h-screen bg-gray-50">
          {/* Sticky Header */}
          <div className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
            <div className="container mx-auto px-4 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Link href="/" className="inline-flex items-center text-blue-600 hover:text-blue-700">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Home
                  </Link>
                  <div className="hidden md:block">
                    <p className="text-lg font-semibold text-gray-900 truncate max-w-2xl">
                      {loadedArticle.title}
                    </p>
                  </div>
                </div>
                <ArticleActions
                  articleId={loadedArticle.id}
                  articleTitle={loadedArticle.title}
                  articleUrl={`/articles/${slug}`}
                />
              </div>
              {/* Reading Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-1 mt-3">
                <div
                  className="bg-blue-600 h-1 rounded-full transition-all duration-300 ease-out"
                  style={{ width: '0%' }}
                  id="header-reading-progress"
                  suppressHydrationWarning={true}
                ></div>
              </div>
            </div>
          </div>

          {/* Reading Progress + Back-nav Script - Client Side Only */}
          <script
            dangerouslySetInnerHTML={{
              __html: `
              (function() {
                if (typeof window === 'undefined') return;

                // ── Back-navigation guard ──────────────────────────────────
                // When a reader arrives from an external source (Reddit, Facebook, etc.)
                // inject the Culture Alberta homepage into the history stack so that
                // swiping / tapping Back keeps them on the site instead of leaving.
                (function() {
                  try {
                    var ref = document.referrer;
                    if (ref && ref.indexOf('culturealberta.com') === -1) {
                      var cur = window.location.href;
                      var state = window.history.state;
                      window.history.replaceState({ caBounce: true }, '', '/');
                      window.history.pushState(state, '', cur);
                    }
                  } catch(e) {}
                })();
                // ──────────────────────────────────────────────────────────

                // Wait for DOM to be ready
                if (document.readyState === 'loading') {
                  document.addEventListener('DOMContentLoaded', initReadingProgress);
                } else {
                  initReadingProgress();
                }
                
                function initReadingProgress() {
                  window.addEventListener('scroll', function() {
                    const article = document.querySelector('.article-content');
                    if (!article) return;
                    
                    const articleTop = article.offsetTop;
                    const articleHeight = article.offsetHeight;
                    const scrollTop = window.pageYOffset;
                    
                    let progress = 0;
                    if (scrollTop >= articleTop) {
                      const scrolled = Math.min(scrollTop - articleTop, articleHeight);
                      progress = Math.min((scrolled / articleHeight) * 100, 100);
                    }
                    
                    const progressBar = document.getElementById('header-reading-progress');
                    if (progressBar) {
                      progressBar.style.width = progress + '%';
                    }
                  });
                }
              })();
            `
            }}
          />

          {/* Hero Section */}
          <div className="bg-white">
            <div className="container mx-auto px-4 py-8">

              <div className="max-w-7xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                  {/* Article Content */}
                  <div className="lg:col-span-3 space-y-8">
                    {/* Breadcrumb Navigation */}
                    <nav className="flex items-center gap-1.5 text-sm text-gray-500 flex-wrap">
                      <Link href="/" className="hover:text-blue-600 transition-colors">Home</Link>
                      <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />
                      {cityHub ? (
                        <Link href={cityHub.url} className="hover:text-blue-600 transition-colors">{cityHub.label}</Link>
                      ) : (
                        <span>{loadedArticle.category}</span>
                      )}
                      <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="text-gray-700 line-clamp-1">{loadedArticle.title}</span>
                    </nav>

                    {/* Article Header */}
                    <div className="space-y-6">
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        {loadedArticle.category && (
                          <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium">
                            {loadedArticle.category}
                          </span>
                        )}
                        {loadedArticle.date && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {formatDate(loadedArticle.date)}
                          </span>
                        )}
                        {loadedArticle.readTime && (
                          <span className="flex items-center gap-1">
                            <Bookmark className="w-4 h-4" />
                            {loadedArticle.readTime} read
                          </span>
                        )}
                        {loadedArticle.author && (
                          <span className="font-medium">By {loadedArticle.author}</span>
                        )}
                        <ArticleViewCount slug={slug} articleTitle={loadedArticle.title} />
                      </div>

                      <h1 className="text-4xl lg:text-5xl font-bold leading-tight text-gray-900">
                        {loadedArticle.title}
                      </h1>

                      {/* Use description (full text) if available, otherwise fall back to excerpt */}
                      {(loadedArticle.description || loadedArticle.excerpt) && (
                        <p className="text-xl text-gray-600 leading-relaxed max-w-3xl">
                          {loadedArticle.description || loadedArticle.excerpt}
                        </p>
                      )}

                    </div>

                    {/* Featured Image */}
                    {loadedArticle.imageUrl && !loadedArticle.imageUrl.startsWith('data:image') && (
                      <div>
                        <div className="relative w-full aspect-[16/9] rounded-xl overflow-hidden bg-gray-100">
                          <Image
                            src={loadedArticle.imageUrl}
                            alt={loadedArticle.title || 'Article image'}
                            fill
                            className="object-cover"
                            priority
                            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 75vw, 900px"
                            quality={85}
                            placeholder="blur"
                            blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
                          />
                        </div>
                        {loadedArticle.imageSource && (
                          <p className="mt-2 text-sm text-gray-500 text-right">
                            Photo: {loadedArticle.imageSource}
                          </p>
                        )}
                      </div>
                    )}



                    {/* Article Content */}
                    <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-100">
                      <div className="article-content">
                        {loadedArticle.content &&
                          typeof loadedArticle.content === 'string' &&
                          loadedArticle.content.trim().length > 10 &&
                          loadedArticle.content !== 'null' &&
                          loadedArticle.content !== 'undefined' ? (
                          <div
                            className="prose prose-lg max-w-none article-content-wrapper"
                            dangerouslySetInnerHTML={{ __html: processArticleContent(loadedArticle.content) }}
                            suppressHydrationWarning={true}
                          />
                        ) : loadedArticle.excerpt ? (
                          <div className="space-y-6">
                            <div className="prose prose-lg max-w-none">
                              <div className="text-lg text-gray-700 leading-relaxed">
                                {loadedArticle.excerpt.split('\n').map((paragraph: string, index: number) => (
                                  <p key={index} className="mb-4">
                                    {paragraph}
                                  </p>
                                ))}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-12">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                              <span className="text-2xl">📝</span>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Article Content Coming Soon</h3>
                            <p className="text-gray-600 max-w-md mx-auto">
                              We're working on bringing you the complete article. Check back soon for the full story!
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Twitter widget script - activates twitter-tweet blockquotes */}
                    <Script src="https://platform.twitter.com/widgets.js" strategy="lazyOnload" />

                    {/* Instagram embed script - activates instagram-media blockquotes */}
                    <Script src="https://www.instagram.com/embed.js" strategy="lazyOnload" />

                    {/* Re-process embeds on every SPA navigation (scripts don't re-run on client-side route changes) */}
                    <ArticleEmbedActivator />

                    {/* Article Footer */}
                    <div className="flex items-center justify-between pt-8 border-t border-gray-200">
                      {loadedArticle.date && formatDate(loadedArticle.date) && (
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <span>Published {formatDate(loadedArticle.date)}</span>
                        </div>
                      )}
                      <ArticleViewCount slug={slug} articleTitle={loadedArticle.title} />
                    </div>

                    {/* Reader poll — this article's own question only; tragedy stories
                        get nothing */}
                    {!isTragedyArticle(loadedArticle) && (
                      <div className="mt-8">
                        <PollCard articleId={loadedArticle.id} dailyFallback={false} />
                      </div>
                    )}

                    {/* End-of-article CTA: add Culture Alberta as a Google preferred source */}
                    <PreferredSourceCTA />

                    {/* Newsletter - Scroll-triggered split-image popup (appears at 50% read) */}
                    <ArticleNewsletterSignup
                      articleTitle={loadedArticle.title}
                      articleCategory={loadedArticle.category}
                      articleImageUrl={loadedArticle.imageUrl}
                      variant="fixed"
                    />

                    {/* Newsletter signup — sits above the comments */}
                    <div className="mt-12">
                      <ArticleNewsletterSignup
                        articleTitle={loadedArticle.title}
                        articleCategory={loadedArticle.category}
                        articleImageUrl={loadedArticle.imageUrl}
                        variant="inline"
                      />
                    </div>

                    {/* Comments Section (article like sits beside the heading) */}
                    <CommentsSection articleId={loadedArticle.id} />

                    {/* More Articles Section */}
                    {relatedArticles.length > 0 && (
                      <div className="mt-16 pt-12 border-t border-gray-200">
                        <div className="mb-8 text-center">
                          <h2 className="text-3xl font-bold text-gray-900">Keep Reading</h2>
                          <p className="mt-2 text-gray-600">
                            Picked for readers of this story based on place, topic, and what is fresh right now.
                          </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                          {relatedArticles.slice(0, 6).map((relatedArticle, idx) => (
                            <Fragment key={relatedArticle.id}>
                            <Link
                              href={getArticleUrl(relatedArticle)}
                              className="group block"
                            >
                              <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                                <div className="aspect-[16/10] w-full bg-gray-200 relative overflow-hidden">
                                  {relatedArticle.imageUrl && !relatedArticle.imageUrl.startsWith('data:image') ? (
                                    <Image
                                      src={relatedArticle.imageUrl}
                                      alt={relatedArticle.title}
                                      fill
                                      className="object-cover group-hover:scale-110 transition-transform duration-500"
                                      loading="lazy"
                                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                      quality={75}
                                    />
                                  ) : (
                                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                      <span className="text-gray-400 text-lg">No Image</span>
                                    </div>
                                  )}
                                  {/* Bookmark icon overlay */}
                                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <div className="bg-white/90 backdrop-blur-sm rounded-full p-2 shadow-lg">
                                      <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                      </svg>
                                    </div>
                                  </div>
                                </div>
                                <div className="p-6">
                                  <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 mb-3">
                                    <span className="bg-blue-100 text-blue-800 px-3 py-1.5 rounded-full font-medium text-sm">
                                      {relatedArticle.category}
                                    </span>
                                    {relatedArticle.recommendationReason && (
                                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        {relatedArticle.recommendationReason}
                                      </span>
                                    )}
                                    {relatedArticle.date && (
                                      <span className="font-medium">{formatDate(relatedArticle.date)}</span>
                                    )}
                                  </div>
                                  <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2 mb-3 leading-tight">
                                    {relatedArticle.title}
                                  </h3>
                                  {relatedArticle.excerpt && (
                                    <p className="text-gray-600 line-clamp-3 leading-relaxed">
                                      {relatedArticle.excerpt}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </Link>
                            </Fragment>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Sidebar */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Newsletter Signup */}
                    {/* Newsletter signup removed - using ArticleNewsletterSignup instead */}

                    {/* Recommended Reads (distinct from the "Keep Reading" grid above) */}
                    {sidebarArticles.length > 0 && (
                      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                        <h3 className="text-xl font-bold mb-1 text-gray-900">Recommended Reads</h3>
                        <p className="text-sm text-gray-500 mb-4">Closest matches to this article</p>
                        <div className="space-y-4">
                          {sidebarArticles.slice(0, 3).map((sidebarArticle) => (
                            <Link
                              key={sidebarArticle.id}
                              href={getArticleUrl(sidebarArticle)}
                              className="group flex items-start gap-3"
                            >
                              <div className="flex-shrink-0 w-20 h-16 rounded-lg bg-gray-200 relative overflow-hidden">
                                {sidebarArticle.imageUrl && !sidebarArticle.imageUrl.startsWith('data:image') ? (
                                  <Image
                                    src={sidebarArticle.imageUrl}
                                    alt={sidebarArticle.title}
                                    fill
                                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                                    loading="lazy"
                                    sizes="80px"
                                    quality={70}
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <span className="text-gray-400 text-xs">No Image</span>
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                {sidebarArticle.category && (
                                  <span className="text-[11px] font-semibold uppercase tracking-wide text-blue-600">
                                    {sidebarArticle.category}
                                  </span>
                                )}
                                <h4 className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug">
                                  {sidebarArticle.title}
                                </h4>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Alberta Tools */}
                    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                      <div className="flex items-center gap-2 mb-4">
                        <Calculator className="w-5 h-5 text-blue-600" />
                        <h3 className="text-xl font-bold text-gray-900">Alberta Tools</h3>
                      </div>
                      <div className="space-y-2">
                        <Link href="/tools/stat-holiday-calculator" className="group flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-blue-50 transition-colors">
                          <span className="text-xl">🗓️</span>
                          <div>
                            <p className="text-sm font-medium text-gray-900 group-hover:text-blue-700">Stat Holiday Pay</p>
                            <p className="text-xs text-gray-500">Calculate your holiday pay</p>
                          </div>
                        </Link>
                        <Link href="/tools/aish-calculator" className="group flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-blue-50 transition-colors">
                          <span className="text-xl">💰</span>
                          <div>
                            <p className="text-sm font-medium text-gray-900 group-hover:text-blue-700">AISH Calculator</p>
                            <p className="text-xs text-gray-500">Assured income amounts</p>
                          </div>
                        </Link>
                        <Link href="/tools/alberta-rental-increase-calculator" className="group flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-blue-50 transition-colors">
                          <span className="text-xl">🏠</span>
                          <div>
                            <p className="text-sm font-medium text-gray-900 group-hover:text-blue-700">Rent Increase Check</p>
                            <p className="text-xs text-gray-500">Is your increase legal?</p>
                          </div>
                        </Link>
                        <Link href="/tools/calgary-vs-edmonton-cost-of-living" className="group flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-blue-50 transition-colors">
                          <span className="text-xl">⚖️</span>
                          <div>
                            <p className="text-sm font-medium text-gray-900 group-hover:text-blue-700">Calgary vs Edmonton</p>
                            <p className="text-xs text-gray-500">Cost of living comparison</p>
                          </div>
                        </Link>
                        <Link href="/tools" className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium mt-1 pt-1">
                          View all tools <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </>
    )
  } catch (error) {
    if (isNextNavigationError(error)) {
      throw error
    }

    logArticlePage('error', {
      slug,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : null,
    })
    console.error('Error loading article:', error)
    notFound()
  }
}
