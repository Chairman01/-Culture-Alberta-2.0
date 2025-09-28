"use client"

import Link from 'next/link'
import Image from 'next/image'
import { getHomepageArticles } from '@/lib/articles'
import { ArrowRight } from 'lucide-react'
import NewsletterSignup from '@/components/newsletter-signup'
import { PageSEO } from '@/components/seo/page-seo'
import { Article } from '@/lib/types/article'
import { PageTracker } from '@/components/analytics/page-tracker'
import { Suspense, useState, useEffect } from 'react'
import { BestOfSection } from '@/components/best-of-section'
import { getArticleUrl } from '@/lib/utils/article-url'
import { HomepageLoading } from '@/components/page-loading'

// Client-side data loading
function useHomePageData() {
  const [posts, setPosts] = useState<Article[]>([])
  const [events, setEvents] = useState<Article[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true)
        setError(null)
        
        // Use the optimized homepage articles function for better performance
        const apiArticles = await getHomepageArticles()
        const allPosts = apiArticles
        
        // Separate events from regular articles
        const regularPosts = allPosts.filter(post => post.type !== 'event')
        const eventPosts = allPosts.filter(post => post.type === 'event')
        
        // CRITICAL: If no posts are found, create fallback content to prevent empty homepage
        if (regularPosts.length === 0) {
          console.warn('⚠️ No articles found in database, creating fallback content')
          const fallbackPosts = [
            {
              id: 'fallback-client-empty-1',
              title: 'Welcome to Culture Alberta',
              excerpt: 'Discover the best of Alberta\'s culture, events, and experiences. From Calgary to Edmonton, we bring you the stories that matter.',
              content: 'Welcome to Culture Alberta! We\'re working on bringing you amazing content about Alberta\'s vibrant culture, events, and experiences.',
              category: 'Culture',
              location: 'Alberta',
              imageUrl: '/images/culture-alberta-og.jpg',
              author: 'Culture Alberta',
              date: new Date().toISOString(),
              createdAt: new Date().toISOString(),
              featuredHome: true,
              trendingHome: true,
              type: 'article',
              status: 'published'
            }
          ]
          setPosts(fallbackPosts)
          setEvents([])
        } else {
          setPosts(regularPosts)
          setEvents(eventPosts)
        }
      } catch (err) {
        console.error("Error loading posts:", err)
        setError(err instanceof Error ? err.message : 'Failed to load articles')
        
        // CRITICAL: Set fallback content instead of leaving empty
        console.warn('⚠️ Database error, using fallback content to prevent empty homepage')
        const fallbackPosts = [
          {
            id: 'fallback-client-1',
            title: 'Welcome to Culture Alberta',
            excerpt: 'Discover the best of Alberta\'s culture, events, and experiences. From Calgary to Edmonton, we bring you the stories that matter.',
            content: 'Welcome to Culture Alberta! We\'re working on bringing you amazing content about Alberta\'s vibrant culture, events, and experiences.',
            category: 'Culture',
            location: 'Alberta',
            imageUrl: '/images/culture-alberta-hero.jpg',
            author: 'Culture Alberta',
            date: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            featuredHome: true,
            trendingHome: true,
            type: 'article',
            status: 'published'
          }
        ]
        setPosts(fallbackPosts)
        setEvents([])
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  return { posts, events, isLoading, error }
}

// Loading component for better UX
function HomePageSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 md:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl overflow-hidden shadow-sm animate-pulse">
              <div className="aspect-[16/9] w-full bg-gray-200"></div>
              <div className="p-6">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-3"></div>
                <div className="h-8 bg-gray-200 rounded w-3/4 mb-3"></div>
                <div className="h-4 bg-gray-200 rounded w-full"></div>
              </div>
            </div>
          </div>
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-start space-x-4">
                    <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-1"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  // Load data using client-side hook
  const { posts, events, isLoading, error } = useHomePageData()

  // Show loading state
  if (isLoading) {
    return <HomepageLoading />
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Error Loading Articles</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      const now = new Date()
      const diffTime = Math.abs(now.getTime() - date.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      
      if (diffDays === 1) return '1 day ago'
      if (diffDays < 7) return `${diffDays} days ago`
      if (diffDays < 14) return '1 week ago'
      if (diffDays < 21) return '2 weeks ago'
      return '3 weeks ago'
    } catch {
      return 'Recently'
    }
  }

  const formatEventDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', { 
        month: 'long',
        day: 'numeric', 
        year: 'numeric' 
      })
    } catch {
      return 'Date TBA'
    }
  }

  const getPostTitle = (post: Article) => {
    return post.title || 'Untitled Article'
  }

  const getPostExcerpt = (post: Article) => {
    if (post.excerpt) return post.excerpt
    if (post.content && post.content.trim()) {
      return post.content.substring(0, 150) + '...'
    }
    return 'Article content coming soon...'
  }

  const getPostImage = (post: Article) => {
    return post.imageUrl || '/placeholder.svg'
  }

  const getPostCategory = (post: Article) => {
    return post.category || 'General'
  }

  const getPostDate = (post: Article) => {
    return post.date || post.createdAt || new Date().toISOString()
  }

  const getPostAuthor = (post: Article) => {
    return post.author || 'Culture Alberta'
  }

  const featuredPost = posts.find(post => post.featuredHome === true) || posts[0] || null
  // Use the same flexible filtering logic as getCityArticles
  const edmontonPosts = posts.filter(post => {
    const hasCityCategory = post.category?.toLowerCase().includes('edmonton');
    const hasCityLocation = post.location?.toLowerCase().includes('edmonton');
    const hasCityCategories = post.categories?.some((cat: string) => 
      cat.toLowerCase().includes('edmonton')
    );
    const hasCityTags = post.tags?.some((tag: string) => 
      tag.toLowerCase().includes('edmonton')
    );
    
    return hasCityCategory || hasCityLocation || hasCityCategories || hasCityTags;
  }).slice(0, 3)
  
  const calgaryPosts = posts.filter(post => {
    const hasCityCategory = post.category?.toLowerCase().includes('calgary');
    const hasCityLocation = post.location?.toLowerCase().includes('calgary');
    const hasCityCategories = post.categories?.some((cat: string) => 
      cat.toLowerCase().includes('calgary')
    );
    const hasCityTags = post.tags?.some((tag: string) => 
      tag.toLowerCase().includes('calgary')
    );
    
    return hasCityCategory || hasCityLocation || hasCityCategories || hasCityTags;
  }).slice(0, 3)
  const foodDrinkPosts = posts.filter(post => post.category === 'Food & Drink').slice(0, 2)
  const trendingPosts = posts.filter(post => post.trendingHome === true).slice(0, 5)
  const upcomingEvents = events.slice(0, 3) // Get the first 3 events
  
  // Debug logging for Edmonton posts
  console.log('Total posts loaded:', posts.length)
  console.log('Edmonton posts found:', edmontonPosts.length)
  console.log('Edmonton posts:', edmontonPosts.map(p => ({ title: p.title, category: p.category, location: p.location })))

  return (
    <>
      <PageSEO
        title="Culture Alberta - Home"
        description="Discover the best of Alberta's culture, events, and local businesses. Stay informed with the latest news and updates."
      />
      <PageTracker title="Culture Alberta - Home" />
      <Suspense fallback={<HomePageSkeleton />}>
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
                      <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300">
                        <div className="aspect-[16/9] w-full bg-gray-200 relative">
                          <Image
                            src={getPostImage(featuredPost)}
                            alt={getPostTitle(featuredPost)}
                            width={800}
                            height={450}
                            className="w-full h-full object-cover"
                            priority
                            placeholder="blur"
                            blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
                          />
                        </div>
                        <div className="p-6">
                          <div className="flex items-center gap-3 text-sm text-gray-500 mb-3">
                            <span className="rounded-full bg-black text-white px-4 py-1.5 font-medium">{getPostCategory(featuredPost)}</span>
                            <span className="font-medium">{formatDate(getPostDate(featuredPost))}</span>
                          </div>
                          <h1 className="font-display text-4xl font-bold group-hover:text-gray-600 transition-colors duration-300 mb-3 leading-tight">{getPostTitle(featuredPost)}</h1>
                          <p className="font-body text-gray-600 text-lg leading-relaxed">{getPostExcerpt(featuredPost)}</p>
                        </div>
                      </div>
                    </Link>
                  ) : (
                    <div className="bg-white rounded-xl overflow-hidden shadow-sm p-6">
                      <div className="aspect-[16/9] w-full bg-gray-200 relative flex items-center justify-center">
                        <div className="text-gray-400 text-center">
                          <div className="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center mx-auto mb-3">
                            <span className="text-2xl">📷</span>
                          </div>
                          <p className="font-body">No featured article available</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Trending Sidebar */}
                <div className="space-y-6">
                  {/* Trending This Week */}
                  <div className="bg-white rounded-xl shadow-sm p-6">
                    <h2 className="font-display text-2xl font-bold mb-4">Trending This Week</h2>
                    <div className="space-y-3">
                      {trendingPosts.length > 0 ? (
                        trendingPosts.map((post, index) => (
                          <Link key={post.id} href={getArticleUrl(post)} className="block group">
                            <div className="flex items-start space-x-4">
                              <span className="text-lg font-bold text-gray-300 bg-gray-100 rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">{index + 1}</span>
                              <div>
                                <h3 className="font-display font-semibold text-base group-hover:text-gray-600 transition-colors duration-300 line-clamp-2 leading-tight mb-1">{getPostTitle(post)}</h3>
                                <p className="font-body text-sm text-gray-500">{formatDate(getPostDate(post))}</p>
                              </div>
                            </div>
                          </Link>
                        ))
                      ) : (
                        // Fallback: show recent articles if no trending articles
                        posts.slice(0, 3).map((post, index) => (
                          <Link key={post.id} href={getArticleUrl(post)} className="block group">
                            <div className="flex items-start space-x-4">
                              <span className="text-lg font-bold text-gray-300 bg-gray-100 rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">{index + 1}</span>
                              <div>
                                <h3 className="font-display font-semibold text-base group-hover:text-gray-600 transition-colors duration-300 line-clamp-2 leading-tight mb-1">{getPostTitle(post)}</h3>
                                <p className="font-body text-sm text-gray-500">{formatDate(getPostDate(post))}</p>
                              </div>
                            </div>
                          </Link>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Newsletter */}
                  <NewsletterSignup 
                    title="Newsletter"
                    description="Stay updated with the latest cultural news and events from across Alberta."
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Edmonton Spotlight */}
          <section className="w-full py-8">
            <div className="container mx-auto px-4 md:px-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-4xl font-bold text-blue-600">Edmonton Spotlight</h2>
                <Link href="/edmonton" className="text-blue-600 hover:text-blue-700 flex items-center gap-2 font-body font-medium">
                  View All <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {edmontonPosts.map((post) => (
                  <Link key={post.id} href={getArticleUrl(post)} className="group block">
                    <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300">
                      <div className="aspect-[16/9] w-full bg-gray-200 relative">
                        <Image
                          src={getPostImage(post)}
                          alt={getPostTitle(post)}
                          width={400}
                          height={225}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-4">
                        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                          <span className="rounded-full bg-blue-100 text-blue-800 px-3 py-1.5 font-medium">Edmonton</span>
                          <span className="font-medium">{formatDate(getPostDate(post))}</span>
                        </div>
                        <h3 className="font-display font-bold text-xl group-hover:text-gray-600 transition-colors duration-300 line-clamp-2 leading-tight">{getPostTitle(post)}</h3>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>

          {/* Calgary Spotlight */}
          <section className="w-full py-8 bg-gray-50">
            <div className="container mx-auto px-4 md:px-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-4xl font-bold text-red-600">Calgary Spotlight</h2>
                <Link href="/calgary" className="text-red-600 hover:text-red-700 flex items-center gap-2 font-body font-medium">
                  View All <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {calgaryPosts.map((post) => (
                  <Link key={post.id} href={getArticleUrl(post)} className="group block">
                    <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300">
                      <div className="aspect-[16/9] w-full bg-gray-200 relative">
                        <Image
                          src={getPostImage(post)}
                          alt={getPostTitle(post)}
                          width={400}
                          height={225}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-4">
                        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                          <span className="rounded-full bg-red-100 text-red-800 px-3 py-1.5 font-medium">Calgary</span>
                          <span className="font-medium">{formatDate(getPostDate(post))}</span>
                        </div>
                        <h3 className="font-display font-bold text-xl group-hover:text-red-600 transition-colors duration-300 line-clamp-2 leading-tight">{getPostTitle(post)}</h3>
                      </div>
                    </div>
                  </Link>
                ))}
            </div>
          </div>
        </section>

          {/* Upcoming Events */}
          <section className="w-full py-8">
          <div className="container mx-auto px-4 md:px-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-4xl font-bold">Upcoming Events</h2>
                <Link href="/events" className="text-blue-600 hover:text-blue-700 flex items-center gap-2 font-body font-medium">
                  View All <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {upcomingEvents.length > 0 ? (
                  upcomingEvents.map((event) => (
                    <div key={event.id} className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300">
                      <div className="aspect-[16/9] w-full bg-gray-200 relative">
                        <Image
                          src={getPostImage(event)}
                          alt={getPostTitle(event)}
                          width={400}
                          height={225}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-3 left-3 bg-black text-white px-3 py-1.5 text-sm rounded-lg font-medium">
                          {formatEventDate(getPostDate(event))}
                        </div>
                      </div>
                      <div className="p-4">
                        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                          <span className="rounded-full bg-gray-100 px-3 py-1.5 font-medium">{event.location || 'Alberta'}</span>
                        </div>
                        <h3 className="font-display font-bold text-xl leading-tight mb-2">{getPostTitle(event)}</h3>
                        <p className="font-body text-sm text-gray-600 line-clamp-2 mb-3">{getPostExcerpt(event)}</p>
                        <Link href={getArticleUrl(event)}>
                          <button className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded text-sm hover:bg-gray-50 transition-colors font-body">
                            View Details
                </button>
                        </Link>
                      </div>
                    </div>
                  ))
                ) : (
                  // Show placeholder when no events are available
                  <>
                    <div className="bg-white rounded-xl overflow-hidden shadow-sm">
                      <div className="aspect-[16/9] w-full bg-gray-200 relative">
                        <div className="absolute top-3 left-3 bg-black text-white px-3 py-1.5 text-sm rounded-lg font-medium">
                          Coming Soon
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-gray-400 text-center">
                            <div className="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center mx-auto mb-2">
                              <span className="text-2xl">🎬</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="p-4">
                        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                          <span className="rounded-full bg-gray-100 px-3 py-1.5 font-medium">Alberta</span>
                        </div>
                        <h3 className="font-display font-bold text-xl mb-2">No Events Yet</h3>
                        <p className="font-body text-sm text-gray-600 mb-3">Check back soon for upcoming cultural events!</p>
                        <button className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded text-sm hover:bg-gray-50 transition-colors font-body">
                          View Details
                  </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </section>

          {/* Food & Drink */}
          <section className="w-full py-8 bg-gray-50">
            <div className="container mx-auto px-4 md:px-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-4xl font-bold">Food & Drink</h2>
                <Link href="/food-drink" className="text-blue-600 hover:text-blue-700 flex items-center gap-2 font-body font-medium">
                  View All <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {foodDrinkPosts.map((post) => (
                  <Link key={post.id} href={getArticleUrl(post)} className="group block">
                    <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300">
                      <div className="aspect-[16/9] w-full bg-gray-200 relative">
                        <Image
                          src={getPostImage(post)}
                          alt={getPostTitle(post)}
                          width={400}
                          height={225}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-4">
                        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                          <span className="rounded-full bg-orange-100 text-orange-800 px-3 py-1.5 font-medium">Food & Drink</span>
                          <span className="font-medium">{formatDate(getPostDate(post))}</span>
                        </div>
                        <h3 className="font-display font-bold text-xl group-hover:text-gray-600 transition-colors duration-300 line-clamp-2 leading-tight">{getPostTitle(post)}</h3>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
          </div>
        </section>

          {/* Best of Alberta */}
          <BestOfSection />
        </main>
      </div>
      </Suspense>
    </>
  )
}
