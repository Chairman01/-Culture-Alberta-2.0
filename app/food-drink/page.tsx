/**
 * Optimized Food & Drink Page
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
 * Used as: Food & Drink page route (/food-drink)
 */

import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Clock, MapPin } from 'lucide-react'
import NewsletterSignup from '@/components/newsletter-signup'
import { getArticleUrl } from '@/lib/utils/article-url'
import { getFoodDrinkPageData } from '@/lib/data/food-drink-data'
import { formatRelativeDate } from '@/lib/utils/date'
import { getArticleTitle, getArticleExcerpt, getArticleImage, getArticleCategory } from '@/lib/utils/article-helpers'
import { Article } from '@/lib/types/article'

// PERFORMANCE: Use ISR with aggressive caching for instant loads
// Revalidates every 2 minutes - faster updates while maintaining speed
export const revalidate = 120

/**
 * Formats a date string to readable format (e.g., "Jan 15, 2024")
 * 
 * @param dateString - ISO date string
 * @returns Formatted date string
 * 
 * Performance: O(1) - constant time operation
 */
function formatReadableDate(dateString: string | undefined): string {
  if (!dateString) return 'Recently'
  
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    })
  } catch {
    return 'Recently'
  }
}

/**
 * Food & Drink Page Component
 * 
 * Displays food and drink articles with featured article and sidebar
 * 
 * Performance:
 * - Server-side rendered with ISR
 * - Optimized data fetching
 * - Efficient filtering and sorting
 */
export default async function FoodDrinkPage() {
  const { articles, featuredArticle } = await getFoodDrinkPageData()

  // Extract unique categories for sidebar
  const uniqueCategories: string[] = Array.from(
    new Set(articles.map((a: Article) => a.category).filter((cat: string | undefined): cat is string => Boolean(cat)))
  ).slice(0, 5)

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-orange-50 to-red-50 py-6">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-2 text-center">
            <div className="space-y-1">
              <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl">
                Food & Drink
              </h1>
              <p className="max-w-[900px] text-muted-foreground md:text-xl mx-auto">
                Discover Alberta's vibrant culinary scene, from farm-to-table restaurants to craft breweries and everything in between.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Article */}
      {featuredArticle && (
        <FeaturedArticleSection article={featuredArticle} />
      )}

      {/* Main Content */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-12">
            {/* Articles Grid */}
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold text-gray-900">Latest Stories</h2>
                <div className="text-sm text-gray-500">
                  {articles.length} article{articles.length !== 1 ? 's' : ''}
                </div>
              </div>

              {articles.length > 0 ? (
                <div className="grid gap-8">
                  {articles.map((article: Article) => (
                    <ArticleCard key={article.id} article={article} />
                  ))}
                </div>
              ) : (
                <EmptyState />
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-8">
              <NewsletterSidebar />
              <CategoriesSidebar categories={uniqueCategories} />
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

/**
 * Featured Article Section Component
 * 
 * Displays the featured food & drink article prominently
 * 
 * @param article - Featured article object
 */
function FeaturedArticleSection({ article }: { article: Article }) {
  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-12 items-center">
          <div className="space-y-6">
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full font-medium">
                {getArticleCategory(article)}
              </span>
              <time className="flex items-center gap-1" dateTime={article.date || article.createdAt}>
                <Clock className="w-4 h-4" aria-hidden="true" />
                {formatReadableDate(article.date || article.createdAt)}
              </time>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
              {getArticleTitle(article)}
            </h2>
            <p className="text-xl text-gray-600 leading-relaxed">
              {getArticleExcerpt(article, 200)}
            </p>
            <Link 
              href={getArticleUrl(article)}
              className="inline-flex items-center text-orange-600 hover:text-orange-700 font-semibold text-lg group"
            >
              Read More 
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
            </Link>
          </div>
          <div className="relative">
            <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl">
              <Image
                src={getArticleImage(article)}
                alt={getArticleTitle(article)}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 500px"
                quality={85}
                placeholder="blur"
                blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/**
 * Article Card Component
 * 
 * Reusable card component for displaying food & drink articles
 * 
 * @param article - Article object to display
 */
function ArticleCard({ article }: { article: Article }) {
  return (
    <Link href={getArticleUrl(article)} className="group">
      <article className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="relative aspect-[4/3]">
            <Image
              src={getArticleImage(article)}
              alt={getArticleTitle(article)}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 400px"
              loading="lazy"
              quality={75}
            />
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full font-medium">
                {getArticleCategory(article)}
              </span>
              <time className="flex items-center gap-1" dateTime={article.date || article.createdAt}>
                <Clock className="w-4 h-4" aria-hidden="true" />
                {formatReadableDate(article.date || article.createdAt)}
              </time>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 group-hover:text-orange-600 transition-colors leading-tight">
              {getArticleTitle(article)}
            </h3>
            <p className="text-gray-600 leading-relaxed line-clamp-3">
              {getArticleExcerpt(article, 150)}
            </p>
            {article.location && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <MapPin className="w-4 h-4" aria-hidden="true" />
                <span>{article.location}</span>
              </div>
            )}
          </div>
        </div>
      </article>
    </Link>
  )
}

/**
 * Empty State Component
 * 
 * Displays when no articles are found
 */
function EmptyState() {
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
        <span className="text-2xl" aria-hidden="true">🍽️</span>
      </div>
      <h3 className="text-2xl font-semibold text-gray-900 mb-4">No articles found</h3>
      <p className="text-gray-600">Check back later for the latest food and drink stories.</p>
    </div>
  )
}

/**
 * Newsletter Sidebar Component
 */
function NewsletterSidebar() {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
      <NewsletterSignup 
        title="Stay Hungry"
        description="Get the latest restaurant reviews, food trends, and dining guides delivered to your inbox."
        defaultCity=""
      />
    </div>
  )
}

/**
 * Categories Sidebar Component
 * 
 * Displays unique categories from articles
 * 
 * @param categories - Array of category strings
 */
function CategoriesSidebar({ categories }: { categories: string[] }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
      <h3 className="text-xl font-bold text-gray-900 mb-4">Categories</h3>
      <nav className="space-y-3" aria-label="Food & Drink categories">
        {categories.length > 0 ? (
          categories.map((category: string) => (
            <Link 
              key={category}
              href={`/food-drink?category=${category?.toLowerCase()}`}
              className="block text-gray-600 hover:text-orange-600 transition-colors py-2 border-b border-gray-100 last:border-b-0"
            >
              {category}
            </Link>
          ))
        ) : (
          <p className="text-gray-500 text-sm">No categories available yet</p>
        )}
      </nav>
    </div>
  )
}
