/**
 * Optimized Culture Page
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
 * Used as: Culture page route (/culture)
 */

import Link from 'next/link'
import Image from 'next/image'
import { 
  ArrowRight, Clock, MapPin, Star, Users, Calendar, Tag, 
  Palette, Music, Theater, Landmark, Heart, Sparkles, Globe, Award 
} from 'lucide-react'
import NewsletterSignup from '@/components/newsletter-signup'
import { getArticleUrl } from '@/lib/utils/article-url'
import { getCulturePageData } from '@/lib/data/culture-data'
import { formatRelativeDate } from '@/lib/utils/date'
import { getArticleTitle, getArticleExcerpt, getArticleImage, getArticleCategory } from '@/lib/utils/article-helpers'
import { Article } from '@/lib/types/article'
import { LucideIcon } from 'lucide-react'

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
 * Gets the appropriate icon component for a category
 * 
 * @param category - Category name
 * @returns Lucide icon component
 * 
 * Performance: O(1) - constant time lookup
 */
function getCategoryIcon(category: string): LucideIcon {
  const cat = category.toLowerCase()
  if (cat.includes('art') || cat.includes('painting') || cat.includes('sculpture')) return Palette
  if (cat.includes('music') || cat.includes('concert') || cat.includes('festival')) return Music
  if (cat.includes('theater') || cat.includes('drama') || cat.includes('performance')) return Theater
  if (cat.includes('museum') || cat.includes('gallery') || cat.includes('exhibition')) return Landmark
  if (cat.includes('heritage') || cat.includes('indigenous') || cat.includes('tradition')) return Globe
  if (cat.includes('community') || cat.includes('local')) return Heart
  if (cat.includes('award') || cat.includes('recognition')) return Award
  return Sparkles
}

/**
 * Culture Page Component
 * 
 * Displays culture articles with featured article and sidebar
 * 
 * Performance:
 * - Server-side rendered with ISR
 * - Optimized data fetching
 * - Efficient filtering and sorting
 */
export default async function CulturePage() {
  const { articles, featuredArticle } = await getCulturePageData()

  // Extract unique categories for navigation and sidebar
  const uniqueCategories = Array.from(
    new Set(articles.map(a => a.category).filter((cat): cat is string => Boolean(cat)))
  )

  // Build category navigation items
  const categoryNavItems = [
    { id: 'all', name: 'All Stories', icon: Sparkles },
    ...uniqueCategories.slice(0, 8).map(cat => ({
      id: cat?.toLowerCase() || '',
      name: cat || 'Culture',
      icon: getCategoryIcon(cat || '')
    }))
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <HeroSection />

      {/* Featured Article */}
      {featuredArticle && (
        <FeaturedArticleSection article={featuredArticle} />
      )}

      {/* Category Navigation */}
      {categoryNavItems.length > 1 && (
        <CategoryNavigation categories={categoryNavItems} />
      )}

      {/* Main Content */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-12">
            {/* Articles Grid */}
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">
                    All Cultural Stories
                  </h2>
                  <p className="text-gray-600 text-sm">
                    {articles.length} {articles.length === 1 ? 'story' : 'stories'} to explore
                  </p>
                </div>
                <div className="bg-gray-100 px-3 py-1 rounded-full">
                  <span className="text-gray-700 font-medium text-sm">
                    {articles.length} article{articles.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              {articles.length > 0 ? (
                <div className="space-y-6">
                  {articles.map((article) => (
                    <CultureArticleCard key={article.id} article={article} />
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
              <RecentStoriesSidebar articles={articles.slice(0, 4)} />
              <QuoteSection />
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

/**
 * Hero Section Component
 */
function HeroSection() {
  return (
    <header className="bg-white border-b border-gray-200 py-16">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex flex-col items-center justify-center space-y-6 text-center">
          <div className="flex items-center gap-3 mb-4" aria-hidden="true">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
              <Palette className="w-5 h-5 text-gray-600" />
            </div>
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
              <Music className="w-5 h-5 text-gray-600" />
            </div>
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
              <Theater className="w-5 h-5 text-gray-600" />
            </div>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900">
            Alberta's Cultural
            <span className="block text-gray-700">Tapestry</span>
          </h1>
          
          <p className="max-w-3xl text-lg text-gray-600 leading-relaxed">
            From Indigenous heritage to contemporary arts, discover the vibrant stories, 
            traditions, and creative expressions that make Alberta truly special.
          </p>
          
          <div className="flex flex-wrap gap-3 justify-center mt-6" role="list">
            {['Visual Arts', 'Music & Festivals', 'Theater & Performance', 'Museums & Heritage'].map((tag) => (
              <div 
                key={tag}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-full text-sm font-medium"
                role="listitem"
              >
                {tag}
              </div>
            ))}
          </div>
        </div>
      </div>
    </header>
  )
}

/**
 * Featured Article Section Component
 * 
 * @param article - Featured article object
 */
function FeaturedArticleSection({ article }: { article: Article }) {
  const IconComponent = getCategoryIcon(getArticleCategory(article))
  
  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Featured Story</h2>
          <div className="w-16 h-0.5 bg-gray-300 mx-auto" aria-hidden="true"></div>
        </div>
        
        <div className="bg-white rounded-lg overflow-hidden shadow-md border border-gray-200">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
            <div className="relative aspect-[4/3] lg:aspect-square group">
              <Image
                src={getArticleImage(article)}
                alt={getArticleTitle(article)}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                priority
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 600px"
                quality={85}
              />
              <div className="absolute inset-0 bg-black/10" aria-hidden="true"></div>
              <div className="absolute top-4 left-4">
                <span className="bg-white text-gray-700 px-3 py-1 rounded-full font-medium text-sm border border-gray-200">
                  Featured
                </span>
              </div>
            </div>
            <div className="p-6 lg:p-8 flex flex-col justify-center">
              <div className="space-y-4">
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full font-medium text-sm flex items-center gap-2">
                    <IconComponent className="w-3 h-3" />
                    {getArticleCategory(article)}
                  </span>
                  <time className="flex items-center gap-2 text-gray-500" dateTime={article.date || article.createdAt}>
                    <Calendar className="w-4 h-4" aria-hidden="true" />
                    {formatReadableDate(article.date || article.createdAt)}
                  </time>
                </div>
                <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 leading-tight">
                  {getArticleTitle(article)}
                </h2>
                <p className="text-gray-600 leading-relaxed">
                  {getArticleExcerpt(article, 200)}
                </p>
                <Link 
                  href={getArticleUrl(article)}
                  className="inline-flex items-center bg-gray-900 text-white px-6 py-2 rounded-md font-medium hover:bg-gray-800 transition-colors group"
                >
                  Read Full Story
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/**
 * Category Navigation Component
 * 
 * @param categories - Array of category navigation items
 */
function CategoryNavigation({ categories }: { categories: Array<{ id: string; name: string; icon: LucideIcon }> }) {
  return (
    <section className="py-8 bg-gray-50 border-b border-gray-200">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Explore by Category</h2>
          <p className="text-gray-600 text-sm">Discover stories that resonate with your interests</p>
        </div>
        
        <nav className="flex flex-wrap gap-3 justify-center" aria-label="Category navigation">
          {categories.map((category) => {
            const IconComponent = category.icon
            return (
              <div
                key={category.id}
                className="group flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm bg-white text-gray-700 border border-gray-200"
              >
                <IconComponent className="w-4 h-4 text-gray-600" aria-hidden="true" />
                {category.name}
              </div>
            )
          })}
        </nav>
      </div>
    </section>
  )
}

/**
 * Culture Article Card Component
 * 
 * Reusable card component for displaying culture articles
 * 
 * @param article - Article object to display
 */
function CultureArticleCard({ article }: { article: Article }) {
  const IconComponent = getCategoryIcon(getArticleCategory(article))
  
  return (
    <Link href={getArticleUrl(article)} className="group block">
      <article className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
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
            <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true"></div>
          </div>
          <div className="md:col-span-2 p-8 space-y-4">
            <div className="flex items-center gap-4 text-sm">
              <span className="bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-2">
                <IconComponent className="w-3 h-3" aria-hidden="true" />
                {getArticleCategory(article)}
              </span>
              <time className="flex items-center gap-2 text-gray-500" dateTime={article.date || article.createdAt}>
                <Calendar className="w-4 h-4" aria-hidden="true" />
                {formatReadableDate(article.date || article.createdAt)}
              </time>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 group-hover:text-purple-600 transition-colors leading-tight">
              {getArticleTitle(article)}
            </h3>
            <p className="text-gray-600 leading-relaxed line-clamp-3">
              {getArticleExcerpt(article, 150)}
            </p>
            <div className="flex items-center gap-6 text-sm text-gray-500">
              {article.author && (
                <span className="flex items-center gap-2">
                  <Users className="w-4 h-4" aria-hidden="true" />
                  {article.author}
                </span>
              )}
              {article.location && (
                <span className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" aria-hidden="true" />
                  {article.location}
                </span>
              )}
            </div>
            <div className="pt-4">
              <span className="inline-flex items-center text-purple-600 font-semibold group-hover:text-purple-700 transition-colors">
                Read Story
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
 * 
 * Displays when no articles are found
 */
function EmptyState() {
  return (
    <div className="text-center py-16">
      <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <Sparkles className="w-12 h-12 text-purple-600" aria-hidden="true" />
      </div>
      <h3 className="text-2xl font-bold text-gray-900 mb-4">No stories found yet</h3>
      <p className="text-gray-600 max-w-md mx-auto">
        We're working on bringing you more amazing cultural stories. Check back soon!
      </p>
    </div>
  )
}

/**
 * Newsletter Sidebar Component
 */
function NewsletterSidebar() {
  return (
    <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
      <div className="text-center mb-4">
        <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
          <Heart className="w-6 h-6 text-gray-600" aria-hidden="true" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-1">Stay Connected</h3>
        <p className="text-gray-600 text-sm">
          Get the latest cultural events and community stories delivered to your inbox.
        </p>
      </div>
      <NewsletterSignup 
        title=""
        description=""
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
    <div className="bg-white rounded-lg p-6 border border-gray-200">
      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <Tag className="w-4 h-4 text-gray-600" aria-hidden="true" />
        Explore Categories
      </h3>
      <nav className="space-y-2" aria-label="Category links">
        {categories.slice(0, 8).map((category) => {
          const IconComponent = getCategoryIcon(category || '')
          return (
            <Link 
              key={category}
              href={`/culture?category=${category?.toLowerCase()}`}
              className="flex items-center gap-3 text-gray-600 hover:text-gray-900 transition-colors py-2 px-3 rounded-md hover:bg-gray-50 group"
            >
              <IconComponent className="w-4 h-4 text-gray-500" aria-hidden="true" />
              <span className="font-medium text-sm">{category}</span>
              <ArrowRight className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
            </Link>
          )
        })}
        {categories.length === 0 && (
          <p className="text-gray-500 text-sm text-center py-4">No categories available yet</p>
        )}
      </nav>
    </div>
  )
}

/**
 * Recent Stories Sidebar Component
 * 
 * @param articles - Array of recent articles
 */
function RecentStoriesSidebar({ articles }: { articles: Article[] }) {
  return (
    <div className="bg-white rounded-lg p-6 border border-gray-200">
      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-gray-600" aria-hidden="true" />
        Recent Stories
      </h3>
      <nav className="space-y-4" aria-label="Recent stories">
        {articles.length > 0 ? (
          articles.map((article) => {
            const IconComponent = getCategoryIcon(getArticleCategory(article))
            return (
              <Link 
                key={article.id}
                href={getArticleUrl(article)}
                className="block group"
              >
                <div className="flex gap-3">
                  <div className="relative w-16 h-16 flex-shrink-0 rounded-md overflow-hidden">
                    <Image
                      src={getArticleImage(article)}
                      alt={getArticleTitle(article)}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="64px"
                      loading="lazy"
                      quality={70}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <IconComponent className="w-3 h-3 text-gray-500" aria-hidden="true" />
                      <span className="text-xs text-gray-600 font-medium">{getArticleCategory(article)}</span>
                    </div>
                    <h4 className="text-sm font-semibold text-gray-900 group-hover:text-gray-700 transition-colors line-clamp-2 leading-tight">
                      {getArticleTitle(article)}
                    </h4>
                    <time className="text-xs text-gray-500 mt-1" dateTime={article.date || article.createdAt}>
                      {formatReadableDate(article.date || article.createdAt)}
                    </time>
                  </div>
                </div>
              </Link>
            )
          })
        ) : (
          <p className="text-gray-500 text-sm text-center py-4">No recent stories</p>
        )}
      </nav>
    </div>
  )
}

/**
 * Quote Section Component
 */
function QuoteSection() {
  return (
    <div className="bg-gray-900 rounded-lg p-6 text-white text-center">
      <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
        <Globe className="w-5 h-5" aria-hidden="true" />
      </div>
      <blockquote className="text-sm font-medium mb-2">
        "Culture is the widening of the mind and of the spirit."
      </blockquote>
      <p className="text-gray-300 text-xs">— Jawaharlal Nehru</p>
    </div>
  )
}
