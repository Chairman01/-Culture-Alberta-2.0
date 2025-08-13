"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Footer } from '@/components/footer'
import { ArrowRight } from 'lucide-react'
import NewsletterSignup from '@/components/newsletter-signup'
import { Article } from '@/lib/types/article'
import { PageTracker } from '@/components/analytics/page-tracker'

interface HomePageClientProps {
  initialPosts: Article[]
  initialEvents: Article[]
}

export default function HomePageClient({ initialPosts, initialEvents }: HomePageClientProps) {
  const [posts, setPosts] = useState<Article[]>(initialPosts)
  const [events, setEvents] = useState<Article[]>(initialEvents)
  const [isClient, setIsClient] = useState(false)
  const [activeBestOfTab, setActiveBestOfTab] = useState('dentists')

  useEffect(() => {
    setIsClient(true)
  }, [])

  // Don't render anything until client-side hydration is complete
  if (!isClient) {
    return (
      <div className="flex min-h-screen flex-col">
        <main className="flex-1">
          <div className="flex justify-center items-center min-h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black"></div>
          </div>
        </main>
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

  // Get featured article (first article with featuredHome flag, or first article as fallback)
  const featuredArticle = posts.find(post => post.featuredHome === true) || posts[0] || null

  // Get trending posts (articles marked as trending for homepage)
  const trendingPosts = posts.filter(post => post.trendingHome === true).slice(0, 4)

  // Get upcoming events (future events, sorted by date)
  const now = new Date()
  const upcomingEvents = events
    .filter(event => {
      if (!event.date) return false
      
      // Handle date formats like "August 15 - 17, 2025" or "August 15, 2025"
      let dateToCheck = event.date
      if (event.date.includes(' - ')) {
        dateToCheck = event.date.split(' - ')[0]
      }
      
      try {
        const eventDate = new Date(dateToCheck)
        return eventDate > now
      } catch (error) {
        console.warn('Could not parse date:', event.date, error)
        return false
      }
    })
    .sort((a, b) => {
      // Sort by date, handling date ranges
      const getDate = (dateStr: string) => {
        if (!dateStr) return new Date(0)
        let dateToCheck = dateStr
        if (dateStr.includes(' - ')) {
          dateToCheck = dateStr.split(' - ')[0]
        }
        try {
          return new Date(dateToCheck)
        } catch {
          return new Date(0)
        }
      }
      return getDate(a.date || '').getTime() - getDate(b.date || '').getTime()
    })
    .slice(0, 3)

  return (
    <>
      <PageTracker title="Culture Alberta - Discover Alberta's Culture, Events & Experiences" />
      <div className="flex min-h-screen flex-col">
        <main className="flex-1">
          {/* Hero Section */}
          <section className="w-full py-6 bg-gradient-to-br from-blue-50 to-indigo-50">
            <div className="container mx-auto px-4 md:px-6">
              <div className="flex flex-col items-center justify-center space-y-2 text-center">
                <div className="space-y-1">
                  <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl">Culture Alberta</h1>
                  <p className="max-w-[900px] text-muted-foreground md:text-xl mx-auto">
                    Discover the best of Alberta's culture, events, and experiences
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Featured Article */}
          {featuredArticle && (
            <section className="w-full py-6">
              <div className="container mx-auto px-4 md:px-6">
                <Link href={`/articles/${featuredArticle.id}`} className="group block">
                  <div className="aspect-[16/9] rounded-lg overflow-hidden bg-gray-200">
                    <Image
                      src={featuredArticle.imageUrl || "/placeholder.svg"}
                      alt={featuredArticle.title}
                      width={1200}
                      height={675}
                      className="w-full h-full object-cover"
                      priority
                    />
                  </div>
                  <div className="mt-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="bg-red-500 text-white px-2 py-1 text-xs rounded">Featured</span>
                      <span className="text-sm text-gray-500">Posted {formatDate(featuredArticle.date || '')}</span>
                    </div>
                    <h2 className="text-2xl font-bold leading-tight tracking-tighter md:text-3xl lg:text-4xl group-hover:text-gray-600">
                      {featuredArticle.title}
                    </h2>
                    <p className="mt-2 text-gray-600">{featuredArticle.excerpt}</p>
                  </div>
                </Link>
              </div>
            </section>
          )}

          {/* Main Content Grid */}
          <section className="w-full py-6">
            <div className="container mx-auto px-4 md:px-6">
              <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
                {/* Left Column - Articles */}
                <div className="space-y-6">
                  {/* Trending Articles */}
                  {trendingPosts.length > 0 && (
                    <div>
                      <h2 className="font-display text-2xl font-bold mb-4">Trending Now</h2>
                      <div className="grid gap-4 sm:grid-cols-2">
                        {trendingPosts.map((article) => (
                          <Link key={article.id} href={`/articles/${article.id}`} className="group block">
                            <div className="overflow-hidden rounded-lg">
                              <div className="aspect-[4/3] w-full bg-gray-200">
                                <Image
                                  src={article.imageUrl || "/placeholder.svg"}
                                  alt={article.title}
                                  width={400}
                                  height={300}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            </div>
                            <div className="mt-2 space-y-1">
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold">
                                  {article.category}
                                </span>
                                <span>{formatDate(article.date || '')}</span>
                              </div>
                              <h3 className="font-bold group-hover:text-gray-600">{article.title}</h3>
                              <p className="text-sm text-muted-foreground line-clamp-2">{article.excerpt}</p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recent Articles */}
                  <div>
                    <h2 className="font-display text-2xl font-bold mb-4">Latest Stories</h2>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {posts.slice(0, 4).map((article) => (
                        <Link key={article.id} href={`/articles/${article.id}`} className="group block">
                          <div className="overflow-hidden rounded-lg">
                            <div className="aspect-[4/3] w-full bg-gray-200">
                              <Image
                                src={article.imageUrl || "/placeholder.svg"}
                                alt={article.title}
                                width={400}
                                height={300}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          </div>
                          <div className="mt-2 space-y-1">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold">
                                {article.category}
                              </span>
                              <span>{formatDate(article.date || '')}</span>
                            </div>
                            <h3 className="font-bold group-hover:text-gray-600">{article.title}</h3>
                            <p className="text-sm text-muted-foreground line-clamp-2">{article.excerpt}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Column - Sidebar */}
                <div className="space-y-6">
                  {/* Upcoming Events */}
                  {upcomingEvents.length > 0 && (
                    <div className="bg-white rounded-xl shadow-sm p-6">
                      <h2 className="font-display text-2xl font-bold mb-4">Upcoming Events</h2>
                      <div className="space-y-3">
                        {upcomingEvents.map((event) => (
                          <Link
                            key={event.id}
                            href={`/articles/${event.id}`}
                            className="block group"
                          >
                            <h4 className="font-display font-semibold text-base group-hover:text-gray-600 transition-colors duration-300 mb-1">{event.title}</h4>
                            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                              <span>{formatEventDate(event.date || '')}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <span>{event.location || "Alberta"}</span>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Newsletter */}
                  <NewsletterSignup 
                    title="Newsletter"
                    description="Stay updated with the latest cultural news and events from across Alberta."
                  />
                </div>
              </div>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </>
  )
}
