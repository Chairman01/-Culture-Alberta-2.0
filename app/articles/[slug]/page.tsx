import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { notFound, redirect } from 'next/navigation'
import { Calendar, Clock, Bookmark, ArrowLeft, ArrowRight } from 'lucide-react'
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
import { ArticleStructuredData, BreadcrumbStructuredData } from '@/components/seo/structured-data'
import { ArticleEmbedActivator } from '@/components/article-embed-activator'

// ISR: cache rendered pages for 10 min, revalidate in background.
// Longer window = fewer Supabase revalidations during traffic spikes.
export const revalidate = 600
import { getAllEvents, getEventBySlug } from '@/lib/events'
import { Metadata } from 'next'
// import { ArticleReadingFeatures } from '@/components/article-reading-features' // Removed - causing duplicate newsletter

import { processArticleContent } from '@/lib/utils/youtube'
import Script from 'next/script'
import { CommentsSection } from '@/components/comments-section'
import { ArticleViewCount } from '@/components/article-view-count'

// import NewsletterSignup from '@/components/newsletter-signup' // Removed - using ArticleNewsletterSignup instead
// Removed ArticleContent import to fix hydration issues
// import './article-styles.css' // Removed - file was deleted

const LEGACY_ARTICLE_REDIRECTS: Record<string, string> = {}
const useFastDevMode = process.env.NODE_ENV === 'development' && process.env.USE_SUPABASE_IN_DEV !== '1'
const DEFAULT_ARTICLE_AUTHOR = 'Adam Harrison'
type ArticleRecommendation = Article & { recommendationReason?: string }

function normalizeArticleAuthor(author?: string | null): string {
  const trimmedAuthor = typeof author === 'string' ? author.trim() : ''
  return trimmedAuthor && trimmedAuthor !== 'Culture Alberta' ? trimmedAuthor : DEFAULT_ARTICLE_AUTHOR
}

function tokenizeForRecommendations(value?: string | null): Set<string> {
  const stopWords = new Set([
    'the', 'and', 'for', 'with', 'after', 'before', 'from', 'that', 'this', 'into',
    'about', 'your', 'you', 'are', 'was', 'were', 'has', 'have', 'will', 'can',
    'its', 'their', 'our', 'out', 'new', 'next', 'why', 'how', 'what',
  ])

  return new Set(
    (value || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word))
  )
}

function getSharedCount(a: Iterable<string>, b: Set<string>): number {
  let count = 0
  for (const item of a) {
    if (b.has(item.toLowerCase())) count += 1
  }
  return count
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
  const currentWords = tokenizeForRecommendations(`${current.title} ${current.excerpt || ''} ${current.description || ''}`)
  const candidateWords = tokenizeForRecommendations(`${candidate.title} ${candidate.excerpt || ''} ${candidate.description || ''}`)

  if (currentCategory && candidateCategory && currentCategory === candidateCategory) score += 30
  if (currentLocation && candidateLocation && currentLocation === candidateLocation) score += 24
  score += getSharedCount(candidateCategories, currentCategories) * 12
  score += getSharedCount(candidateTags, currentTags) * 10
  score += getSharedCount(candidateWords, currentWords) * 3

  if (candidate.featuredHome || candidate.featuredEdmonton || candidate.featuredCalgary) score += 5
  if (candidate.trendingHome || candidate.trendingEdmonton || candidate.trendingCalgary) score += 4

  const dateValue = candidate.date || candidate.createdAt
  if (dateValue) {
    const ageDays = (Date.now() - new Date(dateValue).getTime()) / (1000 * 60 * 60 * 24)
    if (Number.isFinite(ageDays)) {
      if (ageDays < 14) score += 8
      else if (ageDays < 45) score += 5
      else if (ageDays < 120) score += 2
    }
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
  if (candidate.trendingHome || candidate.trendingEdmonton || candidate.trendingCalgary) return 'Trending now'
  return 'Recommended next'
}

// unstable_cache: shared across ALL concurrent serverless invocations on Vercel.
// Prevents the thundering herd — if 50 users trigger ISR revalidation at the same
// time for the same article, only ONE Supabase call is made; the rest get the cache.
const getArticleFromDB = unstable_cache(
  async (slug: string): Promise<Article | null> => {
    let article: Article | null = null
    try {
      const { data, error } = await Promise.race([
        supabase.from('articles').select('*').eq('slug', slug).maybeSingle(),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Supabase slug timeout')), 3000))
      ]) as any

      if (!error && data) {
        article = {
          ...data,
          imageUrl: data.image_url || data.image || data.imageUrl,
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
  { revalidate: 600 } // 10 min — matches the increased ISR window below
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

  return digest.startsWith('NEXT_REDIRECT') || digest.startsWith('NEXT_NOT_FOUND')
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

    // Handle image URL properly - use article image if available, otherwise use default
    let articleImage = loadedArticle.imageUrl || '/images/culture-alberta-og.jpg'

    // CRITICAL: Reddit and social media platforms cannot use base64 images
    // Always use a publicly accessible URL for Open Graph images
    const defaultOgImage = 'https://www.culturealberta.com/images/culture-alberta-og.jpg'

    // Ensure image URL is absolute and publicly accessible
    let absoluteImageUrl = defaultOgImage

    if (articleImage) {
      // Skip base64 images - they won't work for social sharing
      if (articleImage.startsWith('data:image')) {
        console.warn('Article image is base64, using default OG image for social sharing')
        absoluteImageUrl = defaultOgImage
      }
      // Use external URLs as-is if they're already absolute (including Supabase)
      else if (articleImage.startsWith('http://') || articleImage.startsWith('https://')) {
        absoluteImageUrl = articleImage
      }
      // Convert relative URLs to absolute
      else if (articleImage.startsWith('/')) {
        absoluteImageUrl = `https://www.culturealberta.com${articleImage}`
      }
      // Handle other relative paths
      else {
        absoluteImageUrl = `https://www.culturealberta.com/${articleImage}`
      }
    }

    // Detect image MIME type from URL extension
    const getImageMimeType = (url: string): string => {
      const ext = url.split('.').pop()?.toLowerCase()
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

    const imageMimeType = getImageMimeType(absoluteImageUrl)

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
            alt: loadedArticle.title,
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
    redirect(`/articles/${LEGACY_ARTICLE_REDIRECTS[slug]}`)
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

      // Check if this might be an event instead of an article
      try {
        const allEvents = await getAllEvents()
        const eventSlug = createSlug(slug)

        for (const event of allEvents) {
          const eventSlugFromTitle = createSlug(event.title)
          if (eventSlugFromTitle === eventSlug) {
            redirect(`/events/${eventSlug}`)
          }
        }
      } catch (error) {
        console.warn('Failed to check events:', error)
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
      redirect(`/articles/${canonicalSlug}`)
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

    // Load related articles from local fallback cache and rank them by reader intent.
    let relatedArticles: ArticleRecommendation[] = []
    try {
      const allCachedArticles = (await getFastArticles()).filter(a => a.type !== 'event')

      if (allCachedArticles.length > 0) {
        relatedArticles = allCachedArticles
          .filter(a => a.id !== loadedArticle.id)
          .map(article => ({
            ...article,
            recommendationReason: getRecommendationReason(loadedArticle, article),
            recommendationScore: scoreArticleRecommendation(loadedArticle, article),
          }))
          .sort((a, b) => {
            const scoreDiff = ((b as any).recommendationScore || 0) - ((a as any).recommendationScore || 0)
            if (scoreDiff !== 0) return scoreDiff
            return new Date(b.date || b.createdAt || 0).getTime() - new Date(a.date || a.createdAt || 0).getTime()
          })
          .map(({ recommendationScore, ...article }: any) => article)
          .slice(0, 6)

        if (relatedArticles.length === 0) {
          relatedArticles = allCachedArticles
            .filter(a => a.id !== loadedArticle.id)
            .map(article => ({
              ...article,
              recommendationReason: getRecommendationReason(loadedArticle, article),
            }))
            .slice(0, 6)
        }
      }
    } catch (error) {
      console.warn('Failed to load related articles:', error)
      relatedArticles = []
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

    return (
      <>
        {/* Structured Data for Google Rich Snippets */}
        <ArticleStructuredData article={loadedArticle} />
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

          {/* Reading Progress Script - Client Side Only */}
          <script
            dangerouslySetInnerHTML={{
              __html: `
              (function() {
                if (typeof window === 'undefined') return;
                
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
                      <div className="relative w-full aspect-[16/10] md:aspect-auto md:h-[400px] lg:h-[500px] rounded-xl overflow-hidden bg-gray-100">
                        <Image
                          src={loadedArticle.imageUrl}
                          alt={loadedArticle.title || 'Article image'}
                          fill
                          className="object-contain object-center md:object-cover"
                          priority
                          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 75vw, 900px"
                          quality={85}
                          placeholder="blur"
                          blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
                        />
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

                    {/* Newsletter - Inline at end of article */}
                    <ArticleNewsletterSignup
                      articleTitle={loadedArticle.title}
                      articleCategory={loadedArticle.category}
                      articleImageUrl={loadedArticle.imageUrl}
                      variant="inline"
                    />

                    {/* Newsletter - Scroll-triggered split-image popup (appears at 50% read) */}
                    <ArticleNewsletterSignup
                      articleTitle={loadedArticle.title}
                      articleCategory={loadedArticle.category}
                      articleImageUrl={loadedArticle.imageUrl}
                      variant="fixed"
                    />

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
                          {relatedArticles.slice(0, 6).map((relatedArticle) => (
                            <Link
                              key={relatedArticle.id}
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
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Comments Section */}
                    <CommentsSection articleId={loadedArticle.id} />
                  </div>

                  {/* Sidebar */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Newsletter Signup */}
                    {/* Newsletter signup removed - using ArticleNewsletterSignup instead */}

                    {/* Latest Articles */}
                    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                      <h3 className="text-xl font-bold mb-1 text-gray-900">Recommended Reads</h3>
                      <p className="text-sm text-gray-500 mb-4">Closest matches to this article</p>
                      <div className="space-y-4">
                        {relatedArticles.slice(0, 3).map((relatedArticle) => (
                          <Link
                            key={relatedArticle.id}
                            href={getArticleUrl(relatedArticle)}
                            className="group block"
                          >
                            <div className="flex gap-3">
                              <div className="flex-shrink-0 w-16 h-16 bg-gray-200 rounded-lg overflow-hidden">
                                {relatedArticle.imageUrl && !relatedArticle.imageUrl.startsWith('data:image') ? (
                                  <Image
                                    src={relatedArticle.imageUrl}
                                    alt={relatedArticle.title}
                                    width={64}
                                    height={64}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                    sizes="64px"
                                    quality={60}
                                  />
                                ) : (
                                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                    <span className="text-gray-400 text-xs">No Image</span>
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                                  {relatedArticle.title}
                                </h4>
                                <p className="text-xs text-gray-500 mt-1">
                                  {relatedArticle.category}
                                </p>
                              </div>
                            </div>
                          </Link>
                        ))}
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
