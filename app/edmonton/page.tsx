"use client"

import { useEffect, useState } from "react"
import { getAllArticles } from "@/lib/articles"
import { Article } from "@/lib/types/article"
import Link from "next/link"
import Image from "next/image"
import { ArrowRight, Calendar, MapPin } from "lucide-react"
import NewsletterSignup from "@/components/newsletter-signup"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Footer } from "@/components/footer"
import { PageSEO } from '@/components/seo/page-seo'
import { PageTracker } from '@/components/analytics/page-tracker'
import { trackLocationView } from '@/lib/analytics'

// Extend Article locally to include 'type' for filtering
interface EdmontonArticle extends Article {
  type?: string;
  location?: string;
}

export default function EdmontonPage() {
  const [articles, setArticles] = useState<EdmontonArticle[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [featureArticle, setFeatureArticle] = useState<EdmontonArticle | null>(null)
  const [trendingArticles, setTrendingArticles] = useState<EdmontonArticle[]>([])
  const [upcomingEvents, setUpcomingEvents] = useState<EdmontonArticle[]>([])

  useEffect(() => {
    async function loadEdmontonArticles() {
      try {
        // Set a timeout to prevent infinite loading
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Loading timeout')), 5000)
        )
        
        const loadPromise = getAllArticles()
        const allArticles = await Promise.race([loadPromise, timeoutPromise]) as EdmontonArticle[]
        
        // Debug: Log all articles to see what we have
        console.log('All articles from database:', allArticles.map(a => ({ 
          id: a.id, 
          title: a.title, 
          type: a.type, 
          location: a.location, 
          category: a.category, 
          date: a.date 
        })))
        
        // Filter for Edmonton articles (including events) - now supports multiple categories
        const edmontonPosts = allArticles.filter(
          (post) => {
            // Check main category
            const hasEdmontonCategory = post.category?.toLowerCase().includes("edmonton");
            
            // Check location
            const hasEdmontonLocation = post.location?.toLowerCase().includes("edmonton");
            
            // Check new categories field
            const hasEdmontonCategories = post.categories?.some(cat => 
              cat.toLowerCase().includes("edmonton")
            );
            
            // Check tags
            const hasEdmontonTags = post.tags?.some(tag => 
              tag.toLowerCase().includes("edmonton")
            );
            
            return hasEdmontonCategory || hasEdmontonLocation || hasEdmontonCategories || hasEdmontonTags;
          }
        )
        
        setArticles(edmontonPosts)
        
        // Featured article: first article with featuredEdmonton flag, or first Edmonton article (excluding events) as fallback
        const featuredArticle = edmontonPosts.find(post => post.featuredEdmonton === true) || 
                               edmontonPosts.find(post => post.type !== 'event' && post.type !== 'Event') || 
                               null
        
        // Debug logging
        console.log('All Edmonton posts:', edmontonPosts.map(p => ({ id: p.id, title: p.title, featuredEdmonton: p.featuredEdmonton, type: p.type })))
        console.log('Selected featured article:', featuredArticle ? { id: featuredArticle.id, title: featuredArticle.title, featuredEdmonton: featuredArticle.featuredEdmonton, type: featuredArticle.type } : 'None')
        
        setFeatureArticle(featuredArticle)
        
        // Trending: articles marked as trending for Edmonton (excluding events)
        setTrendingArticles(
          edmontonPosts
            .filter(a => a.trendingEdmonton === true && a.type !== 'event' && a.type !== 'Event')
            .slice(0, 4)
        )
        
        // Upcoming events: Edmonton events only, sorted by date
        const now = new Date()
        console.log('Current date:', now.toISOString())
        
        // First, get all events (regardless of date)
        const allEdmontonEvents = edmontonPosts.filter(
          (a) => (a.type === 'event' || a.type === 'Event')
        )
        console.log('All Edmonton events (before date filter):', allEdmontonEvents.map(e => ({ 
          id: e.id, 
          title: e.title, 
          type: e.type, 
          date: e.date,
          dateString: e.date,
          hasDate: !!e.date,
          isFuture: e.date ? new Date(e.date) > now : false
        })))
        
        // Then filter for future events
        const edmontonEvents = allEdmontonEvents.filter(
          (a) => {
            if (!a.date) return false
            
            // Handle date formats like "August 15 - 17, 2025" or "August 15, 2025"
            let dateToCheck = a.date
            if (a.date.includes(' - ')) {
              // Take the first date from a range
              dateToCheck = a.date.split(' - ')[0]
            }
            
            try {
              const eventDate = new Date(dateToCheck)
              return eventDate > now
            } catch (error) {
              console.warn('Could not parse date:', a.date, error)
              return false
            }
          }
        ).sort((a, b) => {
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
        
        // Debug logging for events
        console.log('All Edmonton posts:', edmontonPosts.map(p => ({ id: p.id, title: p.title, type: p.type, location: p.location, category: p.category, date: p.date })))
        console.log('Edmonton events found (after date filter):', edmontonEvents.map(e => ({ id: e.id, title: e.title, location: e.location, date: e.date })))
        
        setUpcomingEvents(edmontonEvents.slice(0, 3))
      } catch (error) {
        console.error("Error loading Edmonton articles:", error)
        // Set empty arrays to prevent infinite loading
        setArticles([])
        setFeatureArticle(null)
        setTrendingArticles([])
        setUpcomingEvents([])
      } finally {
        setIsLoading(false)
      }
    }
    loadEdmontonArticles()
  }, [])

  useEffect(() => {
    trackLocationView('edmonton')
  }, [])

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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black"></div>
      </div>
    )
  }

  return (
    <>
      <PageSEO
        title="Edmonton - Culture Alberta"
        description="Discover the latest news, events, and stories from Alberta's capital city. Explore Edmonton's vibrant neighborhoods, cultural venues, and outdoor activities."
      />
      <PageTracker title="Edmonton - Culture Alberta" />
      <div className="flex min-h-screen flex-col">
        <main className="flex-1">
          {/* Header Section */}
          <section className="w-full py-6 bg-blue-50">
            <div className="container mx-auto px-4 md:px-6">
              <div className="flex flex-col items-center justify-center space-y-2 text-center">
                <div className="space-y-1">
                  <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl">Edmonton</h1>
                  <p className="max-w-[900px] text-muted-foreground md:text-xl mx-auto">
                    Discover the latest news, events, and stories from Alberta's capital city.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Feature Article + Sidebar Section */}
          <section className="w-full py-6">
            <div className="container mx-auto px-4 md:px-6">
              <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
                {/* Feature Article (left) */}
                {featureArticle && (
                  <div className="w-full">
                    <Link href={`/articles/${featureArticle.id}`} className="group block">
                      <div className="aspect-[16/9] rounded-lg overflow-hidden bg-gray-200">
                        <Image
                          src={featureArticle.imageUrl || "/placeholder.svg"}
                          alt={featureArticle.title}
                          width={800}
                          height={500}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="mt-3">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="bg-red-500 text-white px-2 py-1 text-xs rounded">Featured</span>
                          <span className="text-sm text-gray-500">Posted {formatDate(featureArticle.date || '')}</span>
                        </div>
                        <h2 className="text-2xl font-bold leading-tight tracking-tighter md:text-3xl lg:text-4xl group-hover:text-blue-600">
                          {featureArticle.title}
                        </h2>
                        <p className="mt-2 text-gray-600">{featureArticle.excerpt}</p>
                      </div>
                    </Link>
                  </div>
                )}

                {/* Sidebar (right) */}
                <div className="space-y-6">
                  {/* Trending in Edmonton */}
                  <div className="bg-white rounded-xl shadow-sm p-6">
                    <h2 className="font-display text-2xl font-bold mb-4">Trending This Week</h2>
                    <div className="space-y-3">
                      {trendingArticles.length > 0 ? (
                        trendingArticles.map((article, index) => (
                          <Link
                            key={`trending-${article.id}-${index}`}
                            href={`/articles/${article.id}`}
                            className="block group"
                          >
                            <div className="flex items-start space-x-4">
                              <span className="text-lg font-bold text-gray-300 bg-gray-100 rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">{index + 1}</span>
                              <div>
                                <h3 className="font-display font-semibold text-base group-hover:text-gray-600 transition-colors duration-300 line-clamp-2 leading-tight mb-1">{article.title}</h3>
                                <p className="font-body text-sm text-gray-500">{formatDate(article.date || '')}</p>
                              </div>
                            </div>
                          </Link>
                        ))
                      ) : (
                        // Fallback: show recent Edmonton articles if no trending articles
                        articles.slice(0, 3).map((article, index) => (
                          <Link
                            key={`recent-${article.id}-${index}`}
                            href={`/articles/${article.id}`}
                            className="block group"
                          >
                            <div className="flex items-start space-x-4">
                              <span className="text-lg font-bold text-gray-300 bg-gray-100 rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">{index + 1}</span>
                              <div>
                                <h3 className="font-display font-semibold text-base group-hover:text-gray-600 transition-colors duration-300 line-clamp-2 leading-tight mb-1">{article.title}</h3>
                                <p className="font-body text-sm text-gray-500">{formatDate(article.date || '')}</p>
                              </div>
                            </div>
                          </Link>
                        ))
                      )}
                    </div>
                  </div>

                                     {/* Upcoming Events */}
                   <div className="bg-white rounded-xl shadow-sm p-6">
                     <h2 className="font-display text-2xl font-bold mb-4">Upcoming Events</h2>
                     <div className="space-y-3">
                       {upcomingEvents.map((event) => (
                         <Link
                           key={`event-${event.id}`}
                           href={`/articles/${event.id}`}
                           className="block group"
                         >
                           <h4 className="font-display font-semibold text-base group-hover:text-gray-600 transition-colors duration-300 mb-1">{event.title}</h4>
                           <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                             <Calendar className="h-4 w-4" />
                             <span>{formatEventDate(event.date || '')}</span>
                           </div>
                           <div className="flex items-center gap-2 text-sm text-gray-500">
                             <MapPin className="h-4 w-4" />
                             <span>{event.location || "Edmonton"}</span>
                           </div>
                         </Link>
                       ))}
                     </div>
                   </div>

                                  {/* Newsletter */}
                               <NewsletterSignup 
                  defaultCity="edmonton"
                  title="Newsletter"
                  description="Stay updated with the latest cultural news and events from Edmonton and across Alberta."
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
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Sort by:</span>
                    <select className="rounded-md border border-input bg-background px-3 py-1 text-sm">
                      <option value="newest">Newest</option>
                      <option value="popular">Popular</option>
                    </select>
                  </div>
                </div>

                <TabsContent value="all" className="mt-4">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {articles.slice(0, 3).map((article) => (
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
                          <h3 className="font-bold group-hover:text-blue-600">{article.title}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-2">{article.excerpt}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="food" className="mt-4">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {articles.filter((article) => article.category?.toLowerCase().includes('food')).slice(0, 3).map((article) => (
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
                          <h3 className="font-bold group-hover:text-blue-600">{article.title}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-2">{article.excerpt}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="arts" className="mt-4">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {articles.filter((article) => article.category?.toLowerCase().includes('art')).slice(0, 3).map((article) => (
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
                          <h3 className="font-bold group-hover:text-blue-600">{article.title}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-2">{article.excerpt}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="outdoors" className="mt-4">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {articles.filter((article) => article.category?.toLowerCase().includes('outdoor')).slice(0, 3).map((article) => (
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
                          <h3 className="font-bold group-hover:text-blue-600">{article.title}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-2">{article.excerpt}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </section>

          {/* Edmonton Neighborhoods Section */}
          <section className="w-full py-6">
            <div className="container mx-auto px-4 md:px-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-3xl font-bold">Edmonton Neighborhoods</h2>
                <Link href="/edmonton/neighborhoods" className="text-blue-600 hover:text-blue-700 flex items-center gap-2 font-body font-medium">
                  View All <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Whyte Avenue */}
                <Link href="/edmonton/neighborhoods/whyte-avenue" className="group block">
                  <div className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300">
                    <div className="aspect-[4/3] w-full bg-gray-200 relative">
                      <Image
                        src="/images/neighborhoods/whyte-avenue.svg"
                        alt="Whyte Avenue"
                        width={300}
                        height={225}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-3">
                      <h3 className="font-display font-bold text-lg group-hover:text-blue-600">Whyte Avenue</h3>
                      <p className="text-sm text-gray-600 mt-1">Historic district known for its vibrant arts scene, boutique shopping, and nightlife.</p>
                    </div>
                  </div>
                </Link>

                {/* Downtown */}
                <Link href="/edmonton/neighborhoods/downtown" className="group block">
                  <div className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300">
                    <div className="aspect-[4/3] w-full bg-gray-200 relative">
                      <Image
                        src="/images/neighborhoods/downtown-edmonton.svg"
                        alt="Downtown Edmonton"
                        width={300}
                        height={225}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-3">
                      <h3 className="font-display font-bold text-lg group-hover:text-blue-600">Downtown</h3>
                      <p className="text-sm text-gray-600 mt-1">The heart of the city featuring modern architecture, cultural venues, and dining options.</p>
                    </div>
                  </div>
                </Link>

                {/* Old Strathcona */}
                <Link href="/edmonton/neighborhoods/old-strathcona" className="group block">
                  <div className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300">
                    <div className="aspect-[4/3] w-full bg-gray-200 relative">
                      <Image
                        src="/images/neighborhoods/old-strathcona.svg"
                        alt="Old Strathcona"
                        width={300}
                        height={225}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-3">
                      <h3 className="font-display font-bold text-lg group-hover:text-blue-600">Old Strathcona</h3>
                      <p className="text-sm text-gray-600 mt-1">A charming historic district with theaters, independent shops, and farmers' market.</p>
                    </div>
                  </div>
                </Link>

                {/* 124 Street */}
                <Link href="/edmonton/neighborhoods/124-street" className="group block">
                  <div className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300">
                    <div className="aspect-[4/3] w-full bg-gray-200 relative">
                      <Image
                        src="/images/neighborhoods/124-street.svg"
                        alt="124 Street"
                        width={300}
                        height={225}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-3">
                      <h3 className="font-display font-bold text-lg group-hover:text-blue-600">124 Street</h3>
                      <p className="text-sm text-gray-600 mt-1">Trendy area with art galleries, specialty shops, and upscale restaurants.</p>
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          </section>

          {/* Edmonton Guides Section */}
          <section className="w-full py-6 bg-gray-50">
            <div className="container mx-auto px-4 md:px-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-3xl font-bold">Edmonton Guides</h2>
                <Link href="/edmonton/guides" className="text-blue-600 hover:text-blue-700 flex items-center gap-2 font-body font-medium">
                  View All <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {/* Guide cards will be added here when you create them */}
                <div className="bg-white rounded-lg overflow-hidden shadow-sm p-4">
                  <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl">📖</span>
                  </div>
                  <h3 className="font-display font-bold text-lg text-center mb-2">Coming Soon</h3>
                  <p className="text-sm text-gray-600 text-center">Edmonton guides will be available here soon.</p>
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
