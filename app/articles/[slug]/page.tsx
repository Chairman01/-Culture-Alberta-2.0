/**
 * Optimized Article Detail Page
 * 
 * Performance optimizations:
 * - Uses ISR (Incremental Static Regeneration) for fast loads
 * - Efficient article lookup with fallback strategies
 * - Optimized content processing
 * - Client-side reading progress component
 * - Proper image optimization
 * - No console.logs in production
 * 
 * Caching strategy:
 * - Revalidates every 300 seconds (5 minutes)
 * - Falls back to cached version if fetch fails
 * - Reduces server load and improves TTFB
 * 
 * Used as: Article detail route (/articles/[slug])
 */

import { notFound, redirect } from 'next/navigation'
import { Clock, Share2, Bookmark, ArrowLeft } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { Metadata } from 'next'
import { Article } from '@/lib/types/article'
import { getArticleUrl } from '@/lib/utils/article-url'
import { createSlug } from '@/lib/utils/slug'
import { formatRelativeDate } from '@/lib/utils/date'
import { processContentWithVideos } from '@/lib/utils/content-processor'
import { 
  findArticleBySlug, 
  ensureFullContent, 
  getRelatedArticles,
  checkEventSlug 
} from '@/lib/data/article-data'
import { getAllArticles } from '@/lib/articles'
import ArticleNewsletterSignup from '@/components/article-newsletter-signup'
import { ReadingProgress } from '@/components/reading-progress'

// PERFORMANCE: Use ISR with aggressive caching for instant loads
// Revalidates every 2 minutes - faster updates while maintaining speed
export const revalidate = 120

/**
 * Formats a date string to readable format (e.g., "January 15, 2024")
 * 
 * @param dateString - ISO date string
 * @returns Formatted date string
 * 
 * Performance: O(1) - constant time operation
 */
function formatArticleDate(dateString: string | undefined): string {
  if (!dateString) return ''
  
  try {
    const date = new Date(dateString)
    const year = date.getFullYear()
    const month = date.getMonth()
    const day = date.getDate()
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ]
    return `${monthNames[month]} ${day}, ${year}`
  } catch {
    return dateString
  }
}

/**
 * Generates static params for all published articles
 * 
 * Performance:
 * - Only runs at build time
 * - Caches results
 * - Limits to published articles only
 * 
 * @returns Array of slug params for static generation
 */
export async function generateStaticParams() {
  try {
    // PERFORMANCE: Use optimized fallback (faster, only runs at build time)
    const { loadOptimizedFallback } = await import('@/lib/optimized-fallback')
    const allContent = await loadOptimizedFallback()
    
    // Filter for published articles only (exclude events)
    const publishedArticles = allContent.filter(
      (article: any) => 
        article.type !== 'event' &&
        (article.status === 'published' || !article.status)
    )
    
    return publishedArticles.map((article: any) => ({
      slug: createSlug(article.title),
    }))
  } catch (error) {
    // Return empty array to prevent build failure
    if (process.env.NODE_ENV === 'development') {
      console.error('Error generating static params:', error)
    }
    return []
  }
}

/**
 * Generates metadata for SEO and social media sharing
 * 
 * @param params - Route parameters containing slug
 * @returns Metadata object for Next.js
 * 
 * Performance:
 * - Uses fast article lookup
 * - Falls back gracefully if article not found
 * - Optimizes image URLs
 */
export async function generateMetadata({ 
  params 
}: { 
  params: Promise<{ slug: string }> 
}): Promise<Metadata> {
  const resolvedParams = await params
  const slug = resolvedParams.slug
  
  try {
    const article = await findArticleBySlug(slug)
    
    if (!article) {
      return {
        title: 'Article Not Found | Culture Alberta',
        description: 'The requested article could not be found.',
      }
    }
    
    const fullTitle = article.title.includes('Culture Alberta') 
      ? article.title 
      : `${article.title} | Culture Alberta`
    
    const description = article.excerpt || 
                       article.description || 
                       `Read about ${article.title} on Culture Alberta`
    
    const fullUrl = `https://www.culturealberta.com/articles/${slug}`
    
    // Handle image URL - ensure it's absolute
    let articleImage = article.imageUrl || '/images/culture-alberta-og.jpg'
    const absoluteImageUrl = articleImage.startsWith('http') 
      ? articleImage 
      : articleImage.startsWith('data:image')
      ? articleImage
      : `https://www.culturealberta.com${articleImage}`
    
    return {
      title: fullTitle,
      description: description,
      keywords: [
        ...(article.tags || []), 
        article.category, 
        'Alberta', 
        'Culture'
      ].filter(Boolean).join(', '),
      authors: [{ name: article.author || 'Culture Alberta' }],
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
            alt: article.title,
          }
        ],
        siteName: 'Culture Alberta',
        locale: 'en_CA',
        publishedTime: article.date,
        modifiedTime: article.updatedAt || article.date,
        authors: [article.author || 'Culture Alberta'],
        section: article.category,
        tags: article.tags || [],
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
      other: {
        'article:author': article.author || 'Culture Alberta',
        'article:section': article.category || '',
        'article:published_time': article.date || '',
        'article:modified_time': article.updatedAt || article.date || '',
      }
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error generating metadata:', error)
    }
    return {
      title: 'Article | Culture Alberta',
      description: 'Read the latest articles on Culture Alberta.',
    }
  }
}

/**
 * Article Detail Page Component
 * 
 * Renders a full article with:
 * - Article header with metadata
 * - Featured image
 * - Article content (processed with videos)
 * - Related articles
 * - Newsletter signup
 * 
 * Performance:
 * - Server-side rendered with ISR
 * - Optimized image loading
 * - Efficient content processing
 * - Client-side reading progress
 */
export default async function ArticlePage({ 
  params 
}: { 
  params: Promise<{ slug: string }> 
}) {
  const resolvedParams = await params
  const slug = resolvedParams.slug
  
  try {
    // PERFORMANCE: Use optimized article lookup (fast cache first)
    let article = await findArticleBySlug(slug)
    
    // Check if this might be an event instead
    if (!article) {
      const event = await checkEventSlug(slug)
      if (event) {
        redirect(`/events/${event.slug}`)
      }
      notFound()
    }
    
    // PERFORMANCE: Ensure full content is loaded (lazy fetch if needed)
    article = await ensureFullContent(article, slug)
    
    // PERFORMANCE: Load related articles in parallel (non-blocking)
    const relatedArticlesPromise = getRelatedArticles(article, 6)
    
    // Process content once
    const processedContent = article.content && 
                             typeof article.content === 'string' && 
                             article.content.trim().length > 10 &&
                             article.content !== 'null' &&
                             article.content !== 'undefined'
      ? processContentWithVideos(article.content)
      : null
    
    // Wait for related articles
    const relatedArticles = await relatedArticlesPromise

    return (
      <>
        <div className="min-h-screen bg-gray-50">
          {/* Sticky Header with Reading Progress */}
          <div className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
            <div className="container mx-auto px-4 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Link 
                    href="/" 
                    className="inline-flex items-center text-blue-600 hover:text-blue-700 transition-colors"
                    aria-label="Back to home"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" aria-hidden="true" />
                    Back to Home
                  </Link>
                  <div className="hidden md:block">
                    <h1 className="text-lg font-semibold text-gray-900 truncate max-w-md">
                      {article.title}
                    </h1>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <button 
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
                    aria-label="Share article"
                  >
                    <Share2 className="w-4 h-4" aria-hidden="true" />
                    <span className="hidden sm:inline">Share</span>
                  </button>
                  <button 
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
                    aria-label="Save article"
                  >
                    <Bookmark className="w-4 h-4" aria-hidden="true" />
                    <span className="hidden sm:inline">Save</span>
                  </button>
                </div>
              </div>
              {/* Reading Progress Bar - Client Component */}
              <div className="mt-3">
                <ReadingProgress />
              </div>
            </div>
          </div>

          {/* Article Content */}
          <div className="bg-white">
            <div className="container mx-auto px-4 py-8">
              <div className="max-w-7xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                  {/* Main Article Content */}
                  <div className="lg:col-span-3 space-y-8">
                    {/* Article Header */}
                    <div className="space-y-6">
                      <div className="flex items-center gap-4 text-sm text-gray-600 flex-wrap">
                        {article.category && (
                          <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium">
                            {article.category}
                          </span>
                        )}
                        {article.date && (
                          <time 
                            className="flex items-center gap-1"
                            dateTime={article.date}
                          >
                            <Clock className="w-4 h-4" aria-hidden="true" />
                            {formatArticleDate(article.date)}
                          </time>
                        )}
                        {article.readTime && (
                          <span className="flex items-center gap-1">
                            <Bookmark className="w-4 h-4" aria-hidden="true" />
                            {article.readTime} read
                          </span>
                        )}
                        {article.author && (
                          <span className="font-medium">By {article.author}</span>
                        )}
                      </div>
                      
                      <h1 className="text-4xl lg:text-5xl font-bold leading-tight text-gray-900">
                        {article.title}
                      </h1>
                      
                      {article.excerpt && (
                        <p className="text-xl text-gray-600 leading-relaxed max-w-3xl">
                          {article.excerpt}
                        </p>
                      )}
                    </div>

                    {/* Featured Image */}
                    {article.imageUrl && (
                      <div className="relative w-full h-[400px] lg:h-[500px] rounded-xl overflow-hidden">
                        {article.imageUrl.startsWith('data:image') ? (
                          <img
                            src={article.imageUrl}
                            alt={article.title}
                            className="w-full h-full object-cover"
                            loading="eager"
                            decoding="sync"
                          />
                        ) : (
                          <Image
                            src={article.imageUrl}
                            alt={article.title}
                            fill
                            className="object-cover"
                            priority
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 66vw, 800px"
                            quality={85}
                            placeholder="blur"
                            blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
                          />
                        )}
                      </div>
                    )}

                    {/* Article Content */}
                    <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-100">
                      <div className="article-content">
                        {processedContent ? (
                          <div 
                            className="prose prose-lg max-w-none article-content-wrapper"
                            dangerouslySetInnerHTML={{ __html: processedContent }}
                          />
                        ) : article.excerpt ? (
                          <div className="space-y-6">
                            <div className="prose prose-lg max-w-none">
                              <div className="text-lg text-gray-700 leading-relaxed">
                                {article.excerpt.split('\n').map((paragraph: string, index: number) => (
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
                              <span className="text-2xl" aria-hidden="true">📝</span>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                              Article Content Coming Soon
                            </h3>
                            <p className="text-gray-600 max-w-md mx-auto">
                              We're working on bringing you the complete article. Check back soon for the full story!
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Article Footer */}
                    <div className="flex items-center justify-end pt-8 border-t border-gray-200">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <time dateTime={article.date || article.createdAt}>
                          Published {formatArticleDate(article.date || article.createdAt)}
                        </time>
                      </div>
                    </div>

                    {/* Newsletter Signup */}
                    <ArticleNewsletterSignup 
                      articleTitle={article.title}
                      articleCategory={article.category}
                    />

                    {/* Related Articles Section */}
                    {relatedArticles.length > 0 && (
                      <RelatedArticlesSection articles={relatedArticles} />
                    )}
                  </div>

                  {/* Sidebar */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Latest Articles Sidebar */}
                    <LatestArticlesSidebar articles={relatedArticles.slice(0, 3)} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    )
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error loading article:', error)
    }
    notFound()
  }
}

/**
 * Related Articles Section Component
 * 
 * Displays related articles in a grid layout
 * 
 * @param articles - Array of related articles
 */
function RelatedArticlesSection({ articles }: { articles: Article[] }) {
  return (
    <div className="mt-16 pt-12 border-t border-gray-200">
      <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
        More Articles
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {articles.slice(0, 6).map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </div>
    </div>
  )
}

/**
 * Article Card Component for Related Articles
 * 
 * Reusable card component for displaying article previews
 * 
 * @param article - Article object to display
 */
function ArticleCard({ article }: { article: Article }) {
  return (
    <Link 
      href={getArticleUrl(article)}
      className="group block"
    >
      <article className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
        <div className="aspect-[16/10] w-full bg-gray-200 relative overflow-hidden">
          {article.imageUrl ? (
            article.imageUrl.startsWith('data:image') ? (
              <img
                src={article.imageUrl}
                alt={article.title}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <Image
                src={article.imageUrl}
                alt={article.title}
                fill
                className="object-cover group-hover:scale-110 transition-transform duration-500"
                loading="lazy"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                quality={75}
              />
            )
          ) : (
            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
              <span className="text-gray-400 text-lg">No Image</span>
            </div>
          )}
        </div>
        <div className="p-6">
          <div className="flex items-center gap-3 text-sm text-gray-500 mb-3">
            <span className="bg-blue-100 text-blue-800 px-3 py-1.5 rounded-full font-medium text-sm">
              {article.category || 'General'}
            </span>
            {article.date && (
              <time className="font-medium" dateTime={article.date}>
                {formatRelativeDate(article.date)}
              </time>
            )}
          </div>
          <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2 mb-3 leading-tight">
            {article.title}
          </h3>
          {article.excerpt && (
            <p className="text-gray-600 line-clamp-3 leading-relaxed">
              {article.excerpt}
            </p>
          )}
        </div>
      </article>
    </Link>
  )
}

/**
 * Latest Articles Sidebar Component
 * 
 * Displays a compact list of latest articles
 * 
 * @param articles - Array of articles to display
 */
function LatestArticlesSidebar({ articles }: { articles: Article[] }) {
  if (articles.length === 0) {
    return null
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
      <h3 className="text-xl font-bold mb-4 text-gray-900">Latest Articles</h3>
      <nav className="space-y-4" aria-label="Latest articles">
        {articles.map((article) => (
          <Link 
            key={article.id} 
            href={getArticleUrl(article)}
            className="group block"
          >
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-16 h-16 bg-gray-200 rounded-lg overflow-hidden">
                {article.imageUrl ? (
                  article.imageUrl.startsWith('data:image') ? (
                    <img
                      src={article.imageUrl}
                      alt={article.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <Image
                      src={article.imageUrl}
                      alt={article.title}
                      width={64}
                      height={64}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      sizes="64px"
                      quality={60}
                    />
                  )
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-400 text-xs">No Image</span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                  {article.title}
                </h4>
                <p className="text-xs text-gray-500 mt-1">
                  {article.category || 'General'}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </nav>
    </div>
  )
}
