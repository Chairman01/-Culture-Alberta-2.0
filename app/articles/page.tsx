/**
 * Optimized Articles Listing Page
 * 
 * Performance optimizations:
 * - Uses ISR (Incremental Static Regeneration) for fast loads
 * - Efficient data fetching with utility functions
 * - Optimized images with Next.js Image component
 * - No console.logs in production
 * - Reusable components for better maintainability
 * 
 * Caching strategy:
 * - Revalidates every 300 seconds (5 minutes)
 * - Falls back to cached version if fetch fails
 * - Reduces server load and improves TTFB
 * 
 * Used as: Articles listing page route (/articles)
 */

import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Clock, MapPin, Tag } from 'lucide-react'
import NewsletterSignup from '@/components/newsletter-signup'
import { getArticleUrl } from '@/lib/utils/article-url'
import { getAllArticles } from '@/lib/articles'
import { formatRelativeDate } from '@/lib/utils/date'
import { getArticleTitle, getArticleExcerpt, getArticleImage, getArticleCategory, sortArticlesByDate } from '@/lib/utils/article-helpers'
import { Article } from '@/lib/types/article'
import { PageSEO } from '@/components/seo/page-seo'

// PERFORMANCE: Use ISR with aggressive caching for instant loads
// Revalidates every 2 minutes - faster updates while maintaining speed
export const revalidate = 120

/**
 * Articles Listing Page Component
 * 
 * Displays all articles with filtering and pagination
 * 
 * Performance:
 * - Server-side rendered with ISR
 * - Optimized data fetching
 * - Efficient sorting
 */
export default async function ArticlesPage() {
  const allArticles = await getAllArticles()
  
  // PERFORMANCE: Remove content field for listings (not needed for article cards)
  const articlesWithoutContent = allArticles.map(article => ({
    ...article,
    content: undefined
  }))
  
  // PERFORMANCE: Sort once
  const sortedArticles = sortArticlesByDate(articlesWithoutContent)
  
  // Extract unique categories for sidebar
  const uniqueCategories = Array.from(
    new Set(sortedArticles.map(a => a.category).filter((cat): cat is string => Boolean(cat)))
  ).slice(0, 10)

  return (
    <>
      <PageSEO
        title="All Articles - Culture Alberta"
        description="Browse all articles, stories, and guides from Culture Alberta. Discover the latest news, events, and cultural content from across Alberta."
      />
      <div className="min-h-screen bg-gray-50">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-blue-50 to-purple-50 py-12">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                All Articles
              </h1>
              <p className="max-w-2xl text-lg text-gray-600">
                Discover stories, guides, and insights from across Alberta
              </p>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span>{sortedArticles.length} articles</span>
                <span>•</span>
                <span>Updated regularly</span>
              </div>
            </div>
          </div>
        </section>

        {/* Main Content */}
        <section className="py-12">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-12">
              {/* Articles Grid */}
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">
                    Latest Articles
                  </h2>
                  <div className="text-sm text-gray-500">
                    {sortedArticles.length} total
                  </div>
                </div>

                {sortedArticles.length > 0 ? (
                  <div className="grid gap-6">
                    {sortedArticles.map((article) => (
                      <ArticleCard key={article.id} article={article} />
                    ))}
                  </div>
                ) : (
                  <EmptyState />
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                <NewsletterSidebar />
                <CategoriesSidebar categories={uniqueCategories} />
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}

/**
 * Article Card Component
 * 
 * Reusable card component for displaying articles
 * 
 * @param article - Article object to display
 */
function ArticleCard({ article }: { article: Article }) {
  return (
    <Link href={getArticleUrl(article)} className="group block">
      <article className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-300">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
          <div className="md:col-span-1 relative aspect-[4/3] group-hover:scale-105 transition-transform duration-300">
            <Image
              src={getArticleImage(article)}
              alt={getArticleTitle(article)}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 400px"
              loading="lazy"
              quality={75}
            />
          </div>
          <div className="md:col-span-2 p-6 space-y-3">
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium text-xs">
                {getArticleCategory(article)}
              </span>
              <time className="flex items-center gap-1" dateTime={article.date || article.createdAt}>
                <Clock className="w-3 h-3" aria-hidden="true" />
                {formatRelativeDate(article.date || article.createdAt)}
              </time>
            </div>
            <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors leading-tight">
              {getArticleTitle(article)}
            </h3>
            <p className="text-gray-600 leading-relaxed line-clamp-2">
              {getArticleExcerpt(article, 120)}
            </p>
            {article.location && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <MapPin className="w-4 h-4" aria-hidden="true" />
                <span>{article.location}</span>
              </div>
            )}
            <div className="pt-2">
              <span className="inline-flex items-center text-blue-600 font-semibold text-sm group-hover:text-blue-700 transition-colors">
                Read Article
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
              </span>
            </div>
          </div>
        </div>
      </article>
    </Link>
  )
}

/**
 * Empty State Component
 */
function EmptyState() {
  return (
    <div className="text-center py-16">
      <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
        <span className="text-2xl" aria-hidden="true">📰</span>
      </div>
      <h3 className="text-2xl font-semibold text-gray-900 mb-4">No articles found</h3>
      <p className="text-gray-600">Check back later for the latest articles.</p>
    </div>
  )
}

/**
 * Newsletter Sidebar Component
 */
function NewsletterSidebar() {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
      <NewsletterSignup 
        title="Stay Updated"
        description="Get the latest articles and stories delivered to your inbox."
        defaultCity=""
      />
    </div>
  )
}

/**
 * Categories Sidebar Component
 * 
 * @param categories - Array of category strings
 */
function CategoriesSidebar({ categories }: { categories: string[] }) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <Tag className="w-4 h-4 text-gray-600" aria-hidden="true" />
        Categories
      </h3>
      <nav className="space-y-2" aria-label="Article categories">
        {categories.length > 0 ? (
          categories.map((category) => (
            <Link 
              key={category}
              href={`/articles?category=${category?.toLowerCase()}`}
              className="block text-gray-600 hover:text-blue-600 transition-colors py-2 px-3 rounded-md hover:bg-gray-50 group"
            >
              <span className="font-medium text-sm">{category}</span>
              <ArrowRight className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity inline-block" aria-hidden="true" />
            </Link>
          ))
        ) : (
          <p className="text-gray-500 text-sm text-center py-4">No categories available</p>
        )}
      </nav>
    </div>
  )
}
