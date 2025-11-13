/**
 * Optimized Calgary City Page
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
 * Used as: Calgary city page route (/calgary)
 */

import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Calendar } from 'lucide-react'
import NewsletterSignup from '@/components/newsletter-signup'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageSEO } from '@/components/seo/page-seo'
import { getArticleUrl } from '@/lib/utils/article-url'
import { getCityPageData } from '@/lib/data/city-data'
import { formatRelativeDate } from '@/lib/utils/date'
import { getArticleTitle, getArticleExcerpt, getArticleImage, getArticleCategory, filterFoodDrinkArticles } from '@/lib/utils/article-helpers'
import { Article } from '@/lib/types/article'

// PERFORMANCE: Use ISR with aggressive caching for instant loads
// Revalidates every 2 minutes - faster updates while maintaining speed
export const revalidate = 120

/**
 * Calgary City Page Component
 * 
 * Displays Calgary-specific articles, events, and content
 * 
 * Performance:
 * - Server-side rendered with ISR
 * - Optimized data fetching
 * - Efficient filtering and sorting
 */
export default async function CalgaryPage() {
  const { articles, featuredArticle, trendingArticles, upcomingEvents } = await getCityPageData('calgary')

  // Filter articles by category for tabs
  const foodArticles = filterFoodDrinkArticles(articles).slice(0, 3)
  const artsArticles = articles.filter(article => 
    article.category?.toLowerCase().includes('art') || 
    article.category?.toLowerCase().includes('culture')
  ).slice(0, 3)
  const outdoorsArticles = articles.filter(article => 
    article.category?.toLowerCase().includes('outdoor')
  ).slice(0, 3)

  // Filter neighborhood and guide articles
  const neighborhoodArticles = articles.filter(article => 
    article.category?.toLowerCase().includes('neighborhood') ||
    article.categories?.some(cat => cat.toLowerCase().includes('neighborhood')) ||
    article.tags?.some(tag => tag.toLowerCase().includes('neighborhood'))
  ).slice(0, 4)

  const guideArticles = articles.filter(article => 
    article.category?.toLowerCase().includes('guide') ||
    article.categories?.some(cat => cat.toLowerCase().includes('guide')) ||
    article.tags?.some(tag => tag.toLowerCase().includes('guide')) ||
    article.type?.toLowerCase().includes('guide')
  ).slice(0, 3)

  return (
    <>
      <PageSEO
        title="Calgary - Culture Alberta"
        description="Discover the latest news, events, and stories from Alberta's largest city. Explore Calgary's vibrant neighborhoods, unique attractions, and local culture."
      />
      <div className="flex min-h-screen flex-col">
        <main className="flex-1">
          {/* Header Section */}
          <section className="w-full py-6 bg-red-50">
            <div className="container mx-auto px-4 md:px-6">
              <div className="flex flex-col items-center justify-center space-y-2 text-center">
                <div className="space-y-1">
                  <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl">Calgary</h1>
                  <p className="max-w-[900px] text-muted-foreground md:text-xl mx-auto">
                    Discover the latest news, events, and stories from Alberta's largest city.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Feature Article + Sidebar Section */}
          <section className="w-full py-6">
            <div className="container mx-auto px-4 md:px-6">
              <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
                {/* Feature Article */}
                {featuredArticle && (
                  <FeaturedArticleCard article={featuredArticle} city="calgary" />
                )}

                {/* Sidebar */}
                <div className="space-y-6">
                  {/* Trending Articles */}
                  <TrendingSidebar articles={trendingArticles.length > 0 ? trendingArticles : articles.slice(0, 3)} />

                  {/* Upcoming Events */}
                  <EventsSidebar city="calgary" events={upcomingEvents} />

                  {/* Newsletter */}
                  <NewsletterSignup 
                    defaultCity="calgary"
                    title="Newsletter"
                    description="Stay updated with the latest cultural news and events from Calgary and across Alberta."
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Articles Section with Tabs */}
          <section className="w-full py-6 bg-gray-50">
            <div className="container mx-auto px-4 md:px-6">
              <Tabs defaultValue="all" className="w-full">
                <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
                  <TabsList className="mx-auto sm:mx-0">
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="food">Food & Drink</TabsTrigger>
                    <TabsTrigger value="arts">Arts & Culture</TabsTrigger>
                    <TabsTrigger value="outdoors">Outdoors</TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="all" className="mt-4">
                  <ArticlesGrid articles={articles.slice(0, 3)} />
                  {articles.length > 3 && (
                    <ViewAllLink href="/calgary/all-articles" count={articles.length} color="red" />
                  )}
                </TabsContent>

                <TabsContent value="food" className="mt-4">
                  <ArticlesGrid articles={foodArticles} />
                  {foodArticles.length > 0 && (
                    <ViewAllLink href="/calgary/food-drink" count={foodArticles.length} color="red" />
                  )}
                </TabsContent>

                <TabsContent value="arts" className="mt-4">
                  <ArticlesGrid articles={artsArticles} />
                  {artsArticles.length > 0 && (
                    <ViewAllLink href="/calgary/arts-culture" count={artsArticles.length} color="red" />
                  )}
                </TabsContent>

                <TabsContent value="outdoors" className="mt-4">
                  <ArticlesGrid articles={outdoorsArticles} />
                  {outdoorsArticles.length > 0 && (
                    <ViewAllLink href="/calgary/outdoors" count={outdoorsArticles.length} color="red" />
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </section>

          {/* Neighborhoods Section */}
          <NeighborhoodsSection articles={neighborhoodArticles} city="calgary" />

          {/* Guides Section */}
          <GuidesSection articles={guideArticles} city="calgary" />
        </main>
      </div>
    </>
  )
}

/**
 * Featured Article Card Component
 */
function FeaturedArticleCard({ article, city }: { article: Article; city: 'edmonton' | 'calgary' }) {
  const colorClass = city === 'edmonton' ? 'bg-blue-500' : 'bg-red-500'
  const hoverColor = city === 'edmonton' ? 'group-hover:text-blue-600' : 'group-hover:text-red-600'

  return (
    <div className="w-full">
      <Link href={getArticleUrl(article)} className="group block">
        <div className="aspect-[16/9] rounded-lg overflow-hidden bg-gray-200 relative">
          <Image
            src={getArticleImage(article)}
            alt={getArticleTitle(article)}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 66vw, 800px"
            priority
            quality={85}
          />
        </div>
        <div className="mt-3">
          <div className="flex items-center gap-2 mb-2">
            <span className={`${colorClass} text-white px-2 py-1 text-xs rounded`}>Featured</span>
            <time className="text-sm text-gray-500" dateTime={article.date || article.createdAt}>
              {formatRelativeDate(article.date || article.createdAt)}
            </time>
          </div>
          <h2 className={`text-2xl font-bold leading-tight tracking-tighter md:text-3xl lg:text-4xl ${hoverColor} transition-colors`}>
            {getArticleTitle(article)}
          </h2>
          <p className="mt-2 text-gray-600">{getArticleExcerpt(article, 150)}</p>
        </div>
      </Link>
    </div>
  )
}

/**
 * Trending Sidebar Component
 */
function TrendingSidebar({ articles }: { articles: Article[] }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h2 className="font-display text-2xl font-bold mb-4">Trending This Week</h2>
      <nav className="space-y-3" aria-label="Trending articles">
        {articles.map((article, index) => (
          <Link
            key={article.id}
            href={getArticleUrl(article)}
            className="block group"
          >
            <div className="flex items-start space-x-4">
              <span className="text-lg font-bold text-gray-300 bg-gray-100 rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0" aria-hidden="true">
                {index + 1}
              </span>
              <div>
                <h3 className="font-display font-semibold text-base group-hover:text-gray-600 transition-colors duration-300 line-clamp-2 leading-tight mb-1">
                  {getArticleTitle(article)}
                </h3>
                <time className="font-body text-sm text-gray-500" dateTime={article.date || article.createdAt}>
                  {formatRelativeDate(article.date || article.createdAt)}
                </time>
              </div>
            </div>
          </Link>
        ))}
      </nav>
    </div>
  )
}

/**
 * Events Sidebar Component
 */
function EventsSidebar({ city, events }: { city: 'edmonton' | 'calgary'; events: Article[] }) {
  const colorClass = city === 'edmonton' ? 'blue' : 'red'
  const bgColor = city === 'edmonton' ? 'bg-blue-50' : 'bg-red-50'
  const textColor = city === 'edmonton' ? 'text-blue-600' : 'text-red-600'
  const buttonColor = city === 'edmonton' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'

  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <h2 className="font-display text-xl font-bold mb-3">Upcoming Events</h2>
      <div className={`flex items-center justify-between ${bgColor} rounded-lg p-4`}>
        <div className="flex items-center gap-3">
          <Calendar className={`h-8 w-8 ${textColor}`} aria-hidden="true" />
          <div>
            <h3 className="font-display font-semibold text-sm text-gray-900">
              Discover {city.charAt(0).toUpperCase() + city.slice(1)}'s Best Events
            </h3>
            <p className="text-gray-600 text-xs">From festivals to concerts</p>
          </div>
        </div>
        <Link 
          href="/events" 
          className={`inline-flex items-center gap-1 ${buttonColor} text-white font-medium px-4 py-2 rounded-md text-sm transition-colors duration-200`}
        >
          <span>Explore</span>
          <ArrowRight className="h-3 w-3" aria-hidden="true" />
        </Link>
      </div>
    </div>
  )
}

/**
 * Articles Grid Component
 */
function ArticlesGrid({ articles }: { articles: Article[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {articles.map((article) => (
        <Link key={article.id} href={getArticleUrl(article)} className="group block">
          <div className="overflow-hidden rounded-lg">
            <div className="aspect-[4/3] w-full bg-gray-200 relative">
              <Image
                src={getArticleImage(article)}
                alt={getArticleTitle(article)}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                loading="lazy"
                quality={75}
              />
            </div>
          </div>
          <div className="mt-2 space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold">
                {getArticleCategory(article)}
              </span>
              <time dateTime={article.date || article.createdAt}>
                {formatRelativeDate(article.date || article.createdAt)}
              </time>
            </div>
            <h3 className="font-bold group-hover:text-red-600 transition-colors">
              {getArticleTitle(article)}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {getArticleExcerpt(article, 100)}
            </p>
          </div>
        </Link>
      ))}
    </div>
  )
}

/**
 * View All Link Component
 */
function ViewAllLink({ href, count, color }: { href: string; count: number; color: 'blue' | 'red' }) {
  const colorClass = color === 'blue' 
    ? 'bg-blue-600 hover:bg-blue-700' 
    : 'bg-red-600 hover:bg-red-700'

  return (
    <div className="mt-6 text-center">
      <Link 
        href={href} 
        className={`inline-flex items-center gap-2 ${colorClass} text-white px-6 py-3 rounded-lg transition-colors font-medium`}
      >
        View All Articles ({count})
        <ArrowRight className="w-4 h-4" aria-hidden="true" />
      </Link>
    </div>
  )
}

/**
 * Neighborhoods Section Component
 */
function NeighborhoodsSection({ articles, city }: { articles: Article[]; city: 'edmonton' | 'calgary' }) {
  const colorClass = city === 'edmonton' ? 'text-blue-600 hover:text-blue-700' : 'text-red-600 hover:text-red-700'

  return (
    <section className="w-full py-6">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-3xl font-bold">
            {city.charAt(0).toUpperCase() + city.slice(1)} Neighborhoods
          </h2>
          <Link href={`/${city}/all-articles`} className={`${colorClass} flex items-center gap-2 font-body font-medium`}>
            View All <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {articles.length > 0 ? (
            articles.map((article) => (
              <Link key={article.id} href={getArticleUrl(article)}>
                <div className="bg-white rounded-lg overflow-hidden shadow-sm p-6 text-center">
                  <div className="aspect-[4/3] w-full bg-gray-100 rounded-lg mb-4 relative">
                    <Image
                      src={getArticleImage(article)}
                      alt={getArticleTitle(article)}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                      loading="lazy"
                      quality={70}
                    />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{getArticleTitle(article)}</h3>
                  <p className="text-gray-600 text-sm">{getArticleExcerpt(article, 80)}</p>
                </div>
              </Link>
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl" aria-hidden="true">🏘️</span>
              </div>
              <h3 className="font-semibold text-lg mb-2">No Neighborhood Articles Yet</h3>
              <p className="text-gray-600 text-sm">Create articles with "Neighborhood" category to see them here.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

/**
 * Guides Section Component
 */
function GuidesSection({ articles, city }: { articles: Article[]; city: 'edmonton' | 'calgary' }) {
  const colorClass = city === 'edmonton' ? 'text-blue-600 hover:text-blue-700' : 'text-red-600 hover:text-red-700'

  return (
    <section className="w-full py-6 bg-gray-50">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-3xl font-bold">
            {city.charAt(0).toUpperCase() + city.slice(1)} Guides
          </h2>
          <Link href={`/${city}/all-articles`} className={`${colorClass} flex items-center gap-2 font-body font-medium`}>
            View All <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {articles.length > 0 ? (
            articles.map((article) => (
              <Link key={article.id} href={getArticleUrl(article)}>
                <div className="bg-white rounded-lg overflow-hidden shadow-sm p-4">
                  <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl" aria-hidden="true">📖</span>
                  </div>
                  <h3 className="font-display font-bold text-lg text-center mb-2">{getArticleTitle(article)}</h3>
                  <p className="text-sm text-gray-600 text-center">{getArticleExcerpt(article, 80)}</p>
                </div>
              </Link>
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl" aria-hidden="true">📖</span>
              </div>
              <h3 className="font-semibold text-lg mb-2">No Guide Articles Yet</h3>
              <p className="text-gray-600 text-sm">Create articles with "Guide" category or type to see them here.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
