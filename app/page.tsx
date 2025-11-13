/**
 * Optimized Homepage Component
 * 
 * Performance optimizations:
 * - Uses ISR (Incremental Static Regeneration) for fast loads
 * - Parallel data fetching (articles + events)
 * - Efficient filtering with utility functions
 * - Optimized images with Next.js Image component
 * - No console.logs in production
 * - Proper TypeScript types
 * 
 * Caching strategy:
 * - Revalidates every 60 seconds (fresh content)
 * - Falls back to cached version if fetch fails
 * - Reduces server load and improves TTFB
 * 
 * Used as: Main homepage route
 */

import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'
import NewsletterSignup from '@/components/newsletter-signup'
import { PageSEO } from '@/components/seo/page-seo'
import { BestOfSection } from '@/components/best-of-section'
import { Article } from '@/lib/types/article'
import { getArticleUrl, getEventUrl } from '@/lib/utils/article-url'
import {
  getArticleTitle,
  getArticleExcerpt,
  getArticleImage,
  getArticleCategory,
  filterArticlesByCity,
  filterFoodDrinkArticles,
  filterEvents,
  sortArticlesByDate,
} from '@/lib/utils/article-helpers'
import {
  formatRelativeDate,
  formatEventDate,
  getItemDate,
} from '@/lib/utils/date'

// PERFORMANCE: Use ISR with aggressive caching for instant loads
// Revalidates every 30 seconds - faster updates while maintaining speed
export const revalidate = 30

/**
 * Homepage Component
 * 
 * Renders the main homepage with:
 * - Featured article
 * - Trending articles sidebar
 * - Edmonton spotlight
 * - Calgary spotlight
 * - Upcoming events
 * - Food & Drink section
 * - Best of Alberta section
 * 
 * Performance:
 * - Server-side rendered with ISR
 * - Optimized image loading
 * - Efficient data filtering
 * - Minimal layout shift
 */
export default async function HomePage() {
  // PERFORMANCE: Use optimized homepage data fetching
  const { getOptimizedHomepageData } = await import('@/lib/data/homepage-data')
  const { posts, events: upcomingEvents } = await getOptimizedHomepageData()

  // PERFORMANCE: Sort once, filter multiple times (O(n log n) + O(n) operations)
  const sortedPosts = sortArticlesByDate(posts)

  // PERFORMANCE: Filter in single pass using optimized utility functions
  const featuredPost = sortedPosts.find(
    post => post.featuredHome === true && post.type !== 'event'
  ) || sortedPosts[0] || null

  const trendingPosts = sortedPosts
    .filter(post => post.type !== 'event' && post.trendingHome === true)
    .slice(0, 5)

  const edmontonPosts = filterArticlesByCity(sortedPosts, 'edmonton').slice(0, 3)
  const calgaryPosts = filterArticlesByCity(sortedPosts, 'calgary').slice(0, 3)
  const foodDrinkPosts = filterFoodDrinkArticles(sortedPosts).slice(0, 3)

  return (
    <>
      <PageSEO
        title="Culture Alberta - Home"
        description="Discover the best of Alberta's culture, events, and local businesses. Stay informed with the latest news and updates."
      />
      <div className="flex min-h-screen flex-col">
        <main className="flex-1">
          {/* Featured Article + Trending Sidebar */}
          <section className="w-full py-8 md:py-10 lg:py-12 bg-gradient-to-b from-gray-50 to-white">
            <div className="container mx-auto px-4 md:px-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Featured Article */}
                <div className="lg:col-span-2">
                  {featuredPost ? (
                    <Link href={getArticleUrl(featuredPost)} className="group block">
                      <article className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300">
                        <div className="aspect-[16/9] w-full bg-gray-200 relative">
                          <Image
                            src={getArticleImage(featuredPost)}
                            alt={getArticleTitle(featuredPost)}
                            fill
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 66vw, 800px"
                            className="object-cover"
                            priority
                            placeholder="blur"
                            blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
                          />
                        </div>
                        <div className="p-6">
                          <div className="flex items-center gap-3 text-sm text-gray-500 mb-3">
                            <span className="rounded-full bg-black text-white px-4 py-1.5 font-medium">
                              {getArticleCategory(featuredPost)}
                            </span>
                            <time className="font-medium" dateTime={getItemDate(featuredPost)}>
                              {formatRelativeDate(getItemDate(featuredPost))}
                            </time>
                          </div>
                          <h1 className="font-display text-4xl font-bold group-hover:text-gray-600 transition-colors duration-300 mb-3 leading-tight">
                            {getArticleTitle(featuredPost)}
                          </h1>
                          <p className="font-body text-gray-600 text-lg leading-relaxed">
                            {getArticleExcerpt(featuredPost, 200)}
                          </p>
                        </div>
                      </article>
                    </Link>
                  ) : (
                    <div className="bg-white rounded-xl overflow-hidden shadow-sm p-6">
                      <div className="aspect-[16/9] w-full bg-gray-200 relative flex items-center justify-center">
                        <div className="text-gray-400 text-center">
                          <div className="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center mx-auto mb-3">
                            <span className="text-2xl" aria-hidden="true">📷</span>
                          </div>
                          <p className="font-body">No featured article available</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Trending Sidebar */}
                <div className="space-y-6">
                  <div className="bg-white rounded-xl shadow-sm p-6">
                    <h2 className="font-display text-2xl font-bold mb-4">Trending This Week</h2>
                    <nav className="space-y-3" aria-label="Trending articles">
                      {trendingPosts.length > 0 ? (
                        trendingPosts.map((post, index) => (
                          <Link 
                            key={post.id} 
                            href={getArticleUrl(post)} 
                            className="block group"
                            aria-label={`Trending article ${index + 1}: ${getArticleTitle(post)}`}
                          >
                            <div className="flex items-start space-x-4">
                              <span 
                                className="text-lg font-bold text-gray-300 bg-gray-100 rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0"
                                aria-hidden="true"
                              >
                                {index + 1}
                              </span>
                              <div>
                                <h3 className="font-display font-semibold text-base group-hover:text-gray-600 transition-colors duration-300 line-clamp-2 leading-tight mb-1">
                                  {getArticleTitle(post)}
                                </h3>
                                <time className="font-body text-sm text-gray-500" dateTime={getItemDate(post)}>
                                  {formatRelativeDate(getItemDate(post))}
                                </time>
                              </div>
                            </div>
                          </Link>
                        ))
                      ) : (
                        sortedPosts
                          .filter(post => post.type !== 'event')
                          .slice(0, 3)
                          .map((post, index) => (
                            <Link 
                              key={post.id} 
                              href={getArticleUrl(post)} 
                              className="block group"
                            >
                              <div className="flex items-start space-x-4">
                                <span className="text-lg font-bold text-gray-300 bg-gray-100 rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">
                                  {index + 1}
                                </span>
                                <div>
                                  <h3 className="font-display font-semibold text-base group-hover:text-gray-600 transition-colors duration-300 line-clamp-2 leading-tight mb-1">
                                    {getArticleTitle(post)}
                                  </h3>
                                  <time className="font-body text-sm text-gray-500" dateTime={getItemDate(post)}>
                                    {formatRelativeDate(getItemDate(post))}
                                  </time>
                                </div>
                              </div>
                            </Link>
                          ))
                      )}
                    </nav>
                  </div>

                  <NewsletterSignup 
                    title="Newsletter"
                    description="Stay updated with the latest cultural news and events from across Alberta."
                  />
                </div>
              </div>
            </div>
          </section>

          {/* City Spotlight Sections */}
          <CitySpotlightSection 
            city="Edmonton" 
            posts={edmontonPosts} 
            color="blue"
            href="/edmonton"
          />
          
          <CitySpotlightSection 
            city="Calgary" 
            posts={calgaryPosts} 
            color="red"
            href="/calgary"
          />

          {/* Upcoming Events */}
          <EventsSection events={upcomingEvents} />

          {/* Food & Drink */}
          <FoodDrinkSection posts={foodDrinkPosts} />

          {/* Best of Alberta */}
          <BestOfSection />
        </main>
      </div>
    </>
  )
}

/**
 * City Spotlight Section Component
 * 
 * Reusable component for displaying city-specific articles
 * 
 * @param city - City name
 * @param posts - Array of articles for the city
 * @param color - Color theme (blue for Edmonton, red for Calgary)
 * @param href - Link to city page
 */
function CitySpotlightSection({
  city,
  posts,
  color,
  href,
}: {
  city: string
  posts: Article[]
  color: 'blue' | 'red'
  href: string
}) {
  const colorClasses = {
    blue: {
      text: 'text-blue-600',
      hover: 'hover:text-blue-700',
      badge: 'bg-blue-100 text-blue-800',
    },
    red: {
      text: 'text-red-600',
      hover: 'hover:text-red-700',
      badge: 'bg-red-100 text-red-800',
    },
  }

  const colors = colorClasses[color]

  return (
    <section className={`w-full py-8 ${city === 'Calgary' ? 'bg-gray-50' : ''}`}>
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className={`font-display text-4xl font-bold ${colors.text}`}>
            {city} Spotlight
          </h2>
          <Link 
            href={href} 
            className={`${colors.text} ${colors.hover} flex items-center gap-2 font-body font-medium`}
          >
            View All <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {posts.length > 0 ? (
            posts.map((post) => (
              <ArticleCard key={post.id} article={post} badgeColor={colors.badge} />
            ))
          ) : (
            <div className="col-span-3 text-center text-gray-500 py-8">
              No {city} articles available yet.
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

/**
 * Events Section Component
 * 
 * Displays upcoming events in a grid layout
 * 
 * @param events - Array of event articles
 */
function EventsSection({ events }: { events: Article[] }) {
  return (
    <section className="w-full py-8">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-4xl font-bold">Upcoming Events</h2>
          <Link 
            href="/events" 
            className="text-blue-600 hover:text-blue-700 flex items-center gap-2 font-body font-medium"
          >
            View All <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {events.length > 0 ? (
            events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))
          ) : (
            <div className="col-span-3 bg-white rounded-xl overflow-hidden shadow-sm">
              <div className="aspect-[16/9] w-full bg-gray-200 relative">
                <div className="absolute top-3 left-3 bg-black text-white px-3 py-1.5 text-sm rounded-lg font-medium">
                  Coming Soon
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-gray-400 text-center">
                    <div className="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center mx-auto mb-2">
                      <span className="text-2xl" aria-hidden="true">🎬</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                  <span className="rounded-full bg-gray-100 px-3 py-1.5 font-medium">Alberta</span>
                </div>
                <h3 className="font-display font-bold text-xl mb-2">No Events Yet</h3>
                <p className="font-body text-sm text-gray-600 mb-3">
                  Check back soon for upcoming cultural events!
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

/**
 * Food & Drink Section Component
 * 
 * Displays food and drink articles
 * 
 * @param posts - Array of food & drink articles
 */
function FoodDrinkSection({ posts }: { posts: Article[] }) {
  return (
    <section className="w-full py-8 bg-gray-50">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-4xl font-bold">Food & Drink</h2>
          <Link 
            href="/food-drink" 
            className="text-blue-600 hover:text-blue-700 flex items-center gap-2 font-body font-medium"
          >
            View All <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {posts.length > 0 ? (
            posts.map((post) => (
              <ArticleCard 
                key={post.id} 
                article={post} 
                badgeColor="bg-orange-100 text-orange-800"
                badgeText="Food & Drink"
              />
            ))
          ) : (
            <div className="col-span-3 bg-white rounded-xl overflow-hidden shadow-sm">
              <div className="aspect-[16/9] w-full bg-gray-200 relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-gray-400 text-center">
                    <div className="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center mx-auto mb-2">
                      <span className="text-2xl" aria-hidden="true">🍽️</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                  <span className="rounded-full bg-orange-100 text-orange-800 px-3 py-1.5 font-medium">
                    Food & Drink
                  </span>
                  <span className="font-medium">Coming Soon</span>
                </div>
                <h3 className="font-display font-bold text-xl mb-2">No Food & Drink Articles Yet</h3>
                <p className="font-body text-sm text-gray-600 mb-3">
                  Check back soon for delicious Alberta dining recommendations!
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

/**
 * Article Card Component
 * 
 * Reusable card component for displaying articles
 * 
 * @param article - Article object
 * @param badgeColor - Tailwind classes for badge color
 * @param badgeText - Optional custom badge text (defaults to article category)
 */
function ArticleCard({
  article,
  badgeColor,
  badgeText,
}: {
  article: Article
  badgeColor: string
  badgeText?: string
}) {
  return (
    <Link href={getArticleUrl(article)} className="group block">
      <article className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300">
        <div className="aspect-[16/9] w-full bg-gray-200 relative">
          <Image
            src={getArticleImage(article)}
            alt={getArticleTitle(article)}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover"
            loading="lazy"
          />
        </div>
        <div className="p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <span className={`rounded-full ${badgeColor} px-3 py-1.5 font-medium`}>
              {badgeText || getArticleCategory(article)}
            </span>
            <time className="font-medium" dateTime={getItemDate(article)}>
              {formatRelativeDate(getItemDate(article))}
            </time>
          </div>
          <h3 className="font-display font-bold text-xl group-hover:text-gray-600 transition-colors duration-300 line-clamp-2 leading-tight">
            {getArticleTitle(article)}
          </h3>
        </div>
      </article>
    </Link>
  )
}

/**
 * Event Card Component
 * 
 * Specialized card component for displaying events
 * 
 * @param event - Event article object
 */
function EventCard({ event }: { event: Article }) {
  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300">
      <div className="aspect-[16/9] w-full bg-gray-200 relative">
        <Image
          src={getArticleImage(event)}
          alt={getArticleTitle(event)}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover"
          loading="lazy"
        />
        <div className="absolute top-3 left-3 bg-black text-white px-3 py-1.5 text-sm rounded-lg font-medium">
          {formatEventDate(getItemDate(event))}
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <span className="rounded-full bg-gray-100 px-3 py-1.5 font-medium">
            {event.location || 'Alberta'}
          </span>
        </div>
        <h3 className="font-display font-bold text-xl leading-tight mb-2">
          {getArticleTitle(event)}
        </h3>
        <p className="font-body text-sm text-gray-600 line-clamp-2 mb-3">
          {getArticleExcerpt(event, 100)}
        </p>
        <Link href={getEventUrl(event)}>
          <button className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded text-sm hover:bg-gray-50 transition-colors font-body">
            View Details
          </button>
        </Link>
      </div>
    </div>
  )
}
