import Link from "next/link"
import Image from "next/image"
import { ArrowRight, Calendar, MapPin, Clock } from "lucide-react"
import NewsletterSignup from "@/components/newsletter-signup"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageSEO } from '@/components/seo/page-seo'
import { getArticleUrl, getEventUrl } from '@/lib/utils/article-url'
import { getCityArticlesWithFallback } from '@/lib/fallback-articles'
import { Article } from "@/lib/types/article"

// Force dynamic rendering - fetch fresh data on EVERY request
export const revalidate = 0 // No caching - always fetch fresh data
export const dynamic = 'force-dynamic' // Force dynamic rendering
export const fetchCache = 'force-no-store' // Don't cache fetch requests

// Extend Article locally to include 'type' for filtering
interface CalgaryArticle extends Article {
  type?: string;
  location?: string;
  eventDate?: string;
}

// Server-side data loading with fallback
async function getCalgaryData() {
  try {
    console.log('🔄 Loading Calgary articles with fallback system...')
    
    // Get Calgary articles with fallback to articles.json (exclude events)
    const allCalgaryContent = await getCityArticlesWithFallback('calgary') as CalgaryArticle[]
    const calgaryArticles = allCalgaryContent.filter(item => item.type !== 'event' && item.type !== 'Event')
    console.log(`✅ Calgary articles loaded: ${calgaryArticles.length} (filtered out ${allCalgaryContent.length - calgaryArticles.length} events)`)
    
    // Sort by date (newest first)
    const sortedArticles = calgaryArticles.sort((a, b) => {
      const dateA = new Date(a.date || a.createdAt || 0).getTime()
      const dateB = new Date(b.date || b.createdAt || 0).getTime()
      return dateB - dateA // Newest first
    })
    
    // Featured article: first article with featuredCalgary flag, or first Calgary article (excluding events) as fallback
    const featuredArticle = sortedArticles.find(post => post.featuredCalgary === true) || 
                           sortedArticles.find(post => post.type !== 'event' && post.type !== 'Event') || 
                           null
    
    // Trending: articles marked as trending for Calgary (excluding events)
    const trendingArticles = sortedArticles
      .filter(a => a.trendingCalgary === true && a.type !== 'event' && a.type !== 'Event')
      .slice(0, 4)
    
    // Upcoming events: Calgary events only, sorted by date
    const now = new Date()
    const calgaryEvents = sortedArticles.filter(
      (a) => {
        // First check if it's an event type
        if (a.type !== 'event' && a.type !== 'Event') return false
        
        // Check if it's Calgary-related
        const isCalgaryEvent = a.location?.toLowerCase().includes('calgary') ||
                              a.category?.toLowerCase().includes('calgary') ||
                              a.categories?.some((cat: string) => cat.toLowerCase().includes('calgary')) ||
                              a.title.toLowerCase().includes('calgary')
        
        if (!isCalgaryEvent) return false
        
        // Check if it has a date and is in the future
        const dateToCheck = a.date || a.eventDate || a.createdAt
        if (!dateToCheck) return false
        
        // Handle date formats like "August 15 - 17, 2025" or "August 15, 2025"
        let dateStr = dateToCheck.toString()
        if (dateStr.includes(' - ')) {
          // Take the first date from a range
          dateStr = dateStr.split(' - ')[0]
        }
        
        try {
          const eventDate = new Date(dateStr)
          return eventDate > now
        } catch (error) {
          console.warn('Could not parse date:', dateToCheck, error)
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
      const dateA = getDate(a.date || a.eventDate || a.createdAt || '')
      const dateB = getDate(b.date || b.eventDate || b.createdAt || '')
      return dateA.getTime() - dateB.getTime()
    })
    
    console.log(`🔍 Calgary events found: ${calgaryEvents.length}`)
    calgaryEvents.forEach((event, index) => {
      console.log(`  ${index + 1}. ${event.title} (${event.location || event.category}) - ${event.date || event.eventDate}`)
    })
    
    return {
      articles: sortedArticles,
      featuredArticle,
      trendingArticles,
      upcomingEvents: calgaryEvents.slice(0, 3)
    }
  } catch (error) {
    console.error('❌ Error loading Calgary data:', error)
    return {
      articles: [],
      featuredArticle: null,
      trendingArticles: [],
      upcomingEvents: []
    }
  }
}

export default async function CalgaryPage() {
  const { articles, featuredArticle, trendingArticles, upcomingEvents } = await getCalgaryData()

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
      // Use UTC to avoid timezone conversion issues
      const month = date.toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC' })
      const day = date.getUTCDate()
      const year = date.getUTCFullYear()
      return `${month} ${day}, ${year}`
    } catch {
      return 'Date TBA'
    }
  }

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
                {/* Feature Article (left) */}
                {featuredArticle && (
                  <div className="w-full">
                    <Link href={getArticleUrl(featuredArticle)} className="group block">
                      <div className="aspect-[16/9] rounded-lg overflow-hidden bg-gray-200">
                        <Image
                          src={featuredArticle.imageUrl || "/placeholder.svg"}
                          alt={featuredArticle.title}
                          width={800}
                          height={500}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="mt-3">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="bg-red-500 text-white px-2 py-1 text-xs rounded">Featured</span>
                          <span className="text-sm text-gray-500">Posted {formatDate(featuredArticle.date || '')}</span>
                        </div>
                        <h2 className="text-2xl font-bold leading-tight tracking-tighter md:text-3xl lg:text-4xl group-hover:text-red-600">
                          {featuredArticle.title}
                        </h2>
                        <p className="mt-2 text-gray-600">{featuredArticle.excerpt}</p>
                      </div>
                    </Link>
                  </div>
                )}

                {/* Sidebar (right) */}
                <div className="space-y-6">
                  {/* Trending in Calgary */}
                  <div className="bg-white rounded-xl shadow-sm p-6">
                    <h2 className="font-display text-2xl font-bold mb-4">Trending This Week</h2>
                    <div className="space-y-3">
                      {trendingArticles.length > 0 ? (
                        trendingArticles.map((article, index) => (
                          <Link
                            key={`trending-${article.id}-${index}`}
                            href={getArticleUrl(article)}
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
                        // Fallback: show recent Calgary articles if no trending articles
                        articles.slice(0, 3).map((article, index) => (
                          <Link
                            key={`recent-${article.id}-${index}`}
                            href={getArticleUrl(article)}
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
                   <div className="bg-white rounded-xl shadow-sm p-4">
                     <h2 className="font-display text-xl font-bold mb-3">Upcoming Events</h2>
                     <div className="flex items-center justify-between bg-red-50 rounded-lg p-4">
                       <div className="flex items-center gap-3">
                         <Calendar className="h-8 w-8 text-red-600" />
                         <div>
                           <h3 className="font-display font-semibold text-sm text-gray-900">Discover Calgary's Best Events</h3>
                           <p className="text-gray-600 text-xs">From festivals to concerts</p>
                         </div>
                       </div>
                       <Link 
                         href="/events" 
                         className="inline-flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white font-medium px-4 py-2 rounded-md text-sm transition-colors duration-200"
                       >
                         <span>Explore</span>
                         <ArrowRight className="h-3 w-3" />
                       </Link>
                     </div>
                   </div>

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
                      <Link key={article.id} href={getArticleUrl(article)} className="group block">
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
                          <h3 className="font-bold group-hover:text-red-600">{article.title}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-2">{article.excerpt}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                  {articles.length > 3 && (
                    <div className="mt-6 text-center">
                      <Link 
                        href="/calgary/all-articles" 
                        className="inline-flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors font-medium"
                      >
                        View All Calgary Articles ({articles.length})
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="food" className="mt-4">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {articles.filter((article) => article.category?.toLowerCase().includes('food')).slice(0, 3).map((article) => (
                      <Link key={article.id} href={getArticleUrl(article)} className="group block">
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
                          <h3 className="font-bold group-hover:text-red-600">{article.title}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-2">{article.excerpt}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                  {articles.filter((article) => article.category?.toLowerCase().includes('food')).length > 3 && (
                    <div className="mt-6 text-center">
                      <Link 
                        href="/calgary/food-drink" 
                        className="inline-flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors font-medium"
                      >
                        View All Food & Drink Articles ({articles.filter((article) => article.category?.toLowerCase().includes('food')).length})
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="arts" className="mt-4">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {articles.filter((article) => article.category?.toLowerCase().includes('art')).slice(0, 3).map((article) => (
                      <Link key={article.id} href={getArticleUrl(article)} className="group block">
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
                          <h3 className="font-bold group-hover:text-red-600">{article.title}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-2">{article.excerpt}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                  {articles.filter((article) => article.category?.toLowerCase().includes('art')).length > 3 && (
                    <div className="mt-6 text-center">
                      <Link 
                        href="/calgary/arts-culture" 
                        className="inline-flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors font-medium"
                      >
                        View All Arts & Culture Articles ({articles.filter((article) => article.category?.toLowerCase().includes('art')).length})
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="outdoors" className="mt-4">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {articles.filter((article) => article.category?.toLowerCase().includes('outdoor')).slice(0, 3).map((article) => (
                      <Link key={article.id} href={getArticleUrl(article)} className="group block">
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
                          <h3 className="font-bold group-hover:text-red-600">{article.title}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-2">{article.excerpt}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                  {articles.filter((article) => article.category?.toLowerCase().includes('outdoor')).length > 3 && (
                    <div className="mt-6 text-center">
                      <Link 
                        href="/calgary/outdoors" 
                        className="inline-flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors font-medium"
                      >
                        View All Outdoors Articles ({articles.filter((article) => article.category?.toLowerCase().includes('outdoor')).length})
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </section>

          {/* Calgary Neighborhoods Section */}
          <section className="w-full py-6">
            <div className="container mx-auto px-4 md:px-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-3xl font-bold">Calgary Neighborhoods</h2>
                <Link href="/calgary/all-articles" className="text-red-600 hover:text-red-700 flex items-center gap-2 font-body font-medium">
                  View All <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {(() => {
                  const neighborhoodArticles = articles.filter(article => 
                    article.category?.toLowerCase().includes('neighborhood') ||
                    article.categories?.some(cat => cat.toLowerCase().includes('neighborhood')) ||
                    article.tags?.some(tag => tag.toLowerCase().includes('neighborhood'))
                  )
                  
                  console.log('All Calgary articles:', articles.map(a => ({ 
                    id: a.id, 
                    title: a.title, 
                    category: a.category, 
                    categories: a.categories, 
                    tags: a.tags 
                  })))
                  console.log('Calgary neighborhood articles found:', neighborhoodArticles.length)
                  console.log('Calgary neighborhood articles:', neighborhoodArticles.map(a => ({ 
                    id: a.id, 
                    title: a.title, 
                    category: a.category, 
                    categories: a.categories, 
                    tags: a.tags 
                  })))
                  
                  return neighborhoodArticles.slice(0, 4).map((article) => (
                    <Link key={article.id} href={getArticleUrl(article)}>
                      <div className="bg-white rounded-lg overflow-hidden shadow-sm p-6 text-center">
                        <div className="aspect-[4/3] w-full bg-gray-100 rounded-lg mb-4 flex items-center justify-center">
                          <Image
                            src={article.imageUrl || "/placeholder.svg"}
                            alt={article.title}
                            width={400}
                            height={300}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <h3 className="font-semibold text-lg mb-2">{article.title}</h3>
                        <p className="text-gray-600 text-sm">{article.excerpt}</p>
                      </div>
                    </Link>
                  ))
                })()}
                {/* Show placeholder if no neighborhood articles */}
                {articles.filter(article => 
                  article.category?.toLowerCase().includes('neighborhood') ||
                  article.categories?.some(cat => cat.toLowerCase().includes('neighborhood')) ||
                  article.tags?.some(tag => tag.toLowerCase().includes('neighborhood'))
                ).length === 0 && (
                  <div className="col-span-full text-center py-12">
                    <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl">🏘️</span>
                    </div>
                    <h3 className="font-semibold text-lg mb-2">No Neighborhood Articles Yet</h3>
                    <p className="text-gray-600 text-sm">Create articles with "Neighborhood" category to see them here.</p>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Calgary Guides Section */}
          <section className="w-full py-6 bg-gray-50">
            <div className="container mx-auto px-4 md:px-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-3xl font-bold">Calgary Guides</h2>
                <Link href="/calgary/all-articles" className="text-red-600 hover:text-red-700 flex items-center gap-2 font-body font-medium">
                  View All <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {(() => {
                  const guideArticles = articles.filter(article => 
                    article.category?.toLowerCase().includes('guide') ||
                    article.categories?.some(cat => cat.toLowerCase().includes('guide')) ||
                    article.tags?.some(tag => tag.toLowerCase().includes('guide')) ||
                    article.type?.toLowerCase().includes('guide')
                  )
                  
                  console.log('Calgary guide articles found:', guideArticles.length)
                  console.log('Calgary guide articles:', guideArticles.map(a => ({ 
                    id: a.id, 
                    title: a.title, 
                    category: a.category, 
                    categories: a.categories, 
                    tags: a.tags,
                    type: a.type
                  })))
                  
                  return guideArticles.slice(0, 3).map((article) => (
                    <Link key={article.id} href={getArticleUrl(article)}>
                      <div className="bg-white rounded-lg overflow-hidden shadow-sm p-4">
                        <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
                          <span className="text-2xl">📖</span>
                        </div>
                        <h3 className="font-display font-bold text-lg text-center mb-2">{article.title}</h3>
                        <p className="text-sm text-gray-600 text-center">{article.excerpt}</p>
                      </div>
                    </Link>
                  ))
                })()}
                {/* Show placeholder if no guide articles */}
                {articles.filter(article => 
                  article.category?.toLowerCase().includes('guide') ||
                  article.categories?.some(cat => cat.toLowerCase().includes('guide')) ||
                  article.tags?.some(tag => tag.toLowerCase().includes('guide')) ||
                  article.type?.toLowerCase().includes('guide')
                ).length === 0 && (
                  <div className="col-span-full text-center py-12">
                    <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl">📖</span>
                    </div>
                    <h3 className="font-semibold text-lg mb-2">No Guide Articles Yet</h3>
                    <p className="text-gray-600 text-sm">Create articles with "Guide" category or type to see them here.</p>
                  </div>
                )}
              </div>
            </div>
          </section>
        </main>
      </div>
    </>
  )
}
