import Link from "next/link"
import Image from "next/image"
import { ArrowRight, Calendar, MapPin, Clock, Mail } from "lucide-react"
import NewsletterSignup from "@/components/newsletter-signup"
import { SearchBar } from "@/components/search-bar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getArticleUrl, getEventUrl } from '@/lib/utils/article-url'
import { getCityArticlesWithFallback } from '@/lib/fallback-articles'
import { getTrendingByViews } from '@/lib/trending-articles'
import { getEventsByLocation } from '@/lib/events'
import { Article } from "@/lib/types/article"
import { isNeighborhoodArticle, isGuideArticle, isRegularArticle } from '@/lib/utils/article-filters'
import { Metadata } from 'next'

// Proper App Router metadata export (replaces broken PageSEO component)
export const metadata: Metadata = {
  title: 'Calgary - Culture Alberta',
  description: "Discover the latest news, events, and stories from Alberta's largest city. Explore Calgary's vibrant neighborhoods, unique attractions, and local culture.",
  openGraph: {
    title: 'Calgary - Culture Alberta',
    description: "Discover the latest news, events, and stories from Alberta's largest city.",
    url: 'https://www.culturealberta.com/calgary',
  },
}

// ISR: cache for 60s, revalidate in background
export const revalidate = 300

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

    // Get Calgary articles (events excluded at source - only on events page)
    const calgaryArticles = await getCityArticlesWithFallback('calgary') as CalgaryArticle[]
    console.log(`✅ Calgary articles loaded: ${calgaryArticles.length}`)

    // Regular articles only (exclude neighborhood + guide - those have dedicated pages)
    const regularArticles = calgaryArticles.filter(isRegularArticle)
    console.log(`📰 Regular articles (main section): ${regularArticles.length}, neighborhood/guide excluded`)

    // Sort by date (newest first)
    const sortedArticles = regularArticles.sort((a, b) => {
      const dateA = new Date(a.date || a.createdAt || 0).getTime()
      const dateB = new Date(b.date || b.createdAt || 0).getTime()
      return dateB - dateA // Newest first
    })

    // Featured article: first article with featuredCalgary flag, or first Calgary article (excluding events) as fallback
    const featuredArticle = sortedArticles.find(post => post.featuredCalgary === true) ||
      sortedArticles.find(post => post.type !== 'event' && post.type !== 'Event') ||
      null

    // Trending: use actual view data when available, else manual flags, else recent
    const eligibleArticles = sortedArticles.filter(a => a.type !== 'event' && a.type !== 'Event')
    const trendingByViews = await getTrendingByViews(eligibleArticles, { days: 7, limit: 4 })
    const trendingByFlag = eligibleArticles.filter(a => a.trendingCalgary === true)
    const trendingArticles = trendingByViews.length > 0
      ? trendingByViews
      : trendingByFlag.length > 0
        ? trendingByFlag.slice(0, 4)
        : eligibleArticles.slice(0, 4)
    const topStoriesByViews = await getTrendingByViews(eligibleArticles, { days: 7, limit: 6 })
    const topStories = topStoriesByViews.length > 0
      ? topStoriesByViews
      : trendingByFlag.length > 0
        ? trendingByFlag.slice(0, 6)
        : eligibleArticles.slice(0, 6)

    // Get Calgary events from events table (not articles - events only on events page)
    const calgaryEventsRaw = await getEventsByLocation('Calgary')
    const now = new Date()
    const calgaryEvents = calgaryEventsRaw
      .filter(e => {
        const d = e.event_date || (e as any).event_date
        if (!d) return false
        try {
          return new Date(d) >= now
        } catch { return false }
      })
      .sort((a, b) => {
        const dA = new Date(a.event_date || 0).getTime()
        const dB = new Date(b.event_date || 0).getTime()
        return dA - dB
      })
      .slice(0, 5)

    console.log(`🔍 Calgary events found: ${calgaryEvents.length}`)

    const neighborhoodArticles = calgaryArticles.filter(isNeighborhoodArticle)
    const guideArticles = calgaryArticles.filter(isGuideArticle)

    console.log(`📊 Calgary page data: ${sortedArticles.length} articles, ${trendingArticles.length} trending, ${featuredArticle ? '1' : '0'} featured`)

    return {
      articles: sortedArticles,
      neighborhoodArticles,
      guideArticles,
      featuredArticle,
      trendingArticles,
      topStories,
      upcomingEvents: calgaryEvents
    }
  } catch (error) {
    console.error('❌ Error loading Calgary data:', error)
    return {
      articles: [],
      neighborhoodArticles: [],
      guideArticles: [],
      featuredArticle: null,
      trendingArticles: [],
      topStories: [],
      upcomingEvents: []
    }
  }
}

export default async function CalgaryPage() {
  const { articles, neighborhoodArticles, guideArticles, featuredArticle, trendingArticles, topStories, upcomingEvents } = await getCalgaryData()

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
    if (!dateString) return 'Date TBA'

    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return 'Date TBA'

      const datePart = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/Edmonton' })
      const timeMatch = dateString.match(/T(\d{1,2}):(\d{2})/)
      const isMidnight = timeMatch && parseInt(timeMatch[1], 10) === 0 && parseInt(timeMatch[2], 10) === 0
      const timePart = timeMatch && !isMidnight
        ? date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/Edmonton' })
        : ''

      return timePart ? `${datePart} at ${timePart}` : datePart
    } catch {
      return 'Date TBA'
    }
  }

  return (
    <>
      {/* Metadata is now handled by the metadata export above */}
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
          <section className="w-full pt-6 pb-3">
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
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
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
                  {/* Search */}
                  <div className="bg-white rounded-xl shadow-sm p-6">
                    <SearchBar variant="calgary" className="mb-0" />
                  </div>
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

                  {/* Calgary Events */}
                  <div className="bg-white rounded-xl shadow-sm p-4">
                    <h2 className="font-display text-xl font-bold mb-3">Calgary Events</h2>
                    {upcomingEvents.length > 0 ? (
                      <div className="space-y-3">
                        {upcomingEvents.slice(0, 3).map((event) => (
                          <div key={event.id} className="flex gap-3 p-3 rounded-lg border bg-gray-50/50 hover:bg-gray-50">
                            <div className="w-20 h-20 flex-shrink-0 rounded overflow-hidden bg-gray-200">
                              <Image
                                src={(event as any).image_url || (event as any).imageUrl || "/placeholder.svg"}
                                alt={event.title}
                                width={80}
                                height={80}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-display font-semibold text-sm line-clamp-2">{event.title}</h3>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {formatEventDate((event as any).event_date || (event as any).eventDate || '')} · {(event as any).location || 'Calgary'}
                              </p>
                              <div className="flex gap-2 mt-2">
                                <Link href={getEventUrl(event as any)}>
                                  <span className="text-xs font-medium text-red-600 hover:underline">View Details</span>
                                </Link>
                                {(event as any).website_url && (
                                  <a href={(event as any).website_url} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-red-600 hover:underline">
                                    Register
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                        <Link
                          href="/events"
                          className="block text-center text-sm text-red-600 hover:underline font-medium py-2"
                        >
                          View all events →
                        </Link>
                      </div>
                    ) : (
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
                    )}
                  </div>

                  {/* Newsletter */}
                  <div className="bg-gradient-to-br from-slate-50 to-red-50/40 rounded-2xl shadow-sm border border-slate-200/80 p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                        <Mail className="w-4 h-4 text-red-600" />
                      </div>
                      <div>
                        <h2 className="font-display text-base font-bold text-gray-900 leading-tight">Newsletter</h2>
                        <p className="font-body text-xs text-gray-500 leading-snug">Stay updated with the latest cultural news and events from Calgary and across Alberta.</p>
                      </div>
                    </div>
                    <NewsletterSignup
                      defaultCity="calgary"
                      compact={true}
                      accentColor="red"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Articles Section with Tabs */}
          <section className="w-full pt-3 pb-6 bg-gray-50">
            <div className="container mx-auto px-4 md:px-6">
              <Tabs defaultValue="all" className="w-full">
                <div className="mb-6 overflow-x-auto -mx-4 px-4 pb-1">
                  <TabsList className="inline-flex min-w-max">
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="top">Top Stories</TabsTrigger>
                    <TabsTrigger value="food">Food & Drink</TabsTrigger>
                    <TabsTrigger value="arts">Arts & Culture</TabsTrigger>
                    <TabsTrigger value="sports">Sports</TabsTrigger>
                    <TabsTrigger value="realestate">Real Estate</TabsTrigger>
                    <TabsTrigger value="crime">Crime</TabsTrigger>
                    <TabsTrigger value="politics">Politics</TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="all" className="mt-4">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {articles.slice(0, 6).map((article) => (
                      <Link key={article.id} href={getArticleUrl(article)} className="group block">
                        <div className="overflow-hidden rounded-lg">
                          <div className="aspect-[4/3] w-full bg-gray-200">
                            <Image src={article.imageUrl || "/placeholder.svg"} alt={article.title} width={400} height={300} className="w-full h-full object-cover" loading="lazy" />
                          </div>
                        </div>
                        <div className="mt-2 space-y-1">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold">{article.category}</span>
                            <span>{formatDate(article.date || '')}</span>
                          </div>
                          <h3 className="font-bold group-hover:text-red-600">{article.title}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-2">{article.excerpt}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                  {articles.length > 6 && (
                    <div className="mt-6 text-center">
                      <Link href="/calgary/all-articles" className="inline-flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors font-medium">
                        View All Calgary Articles ({articles.length}) <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="top" className="mt-4">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {topStories.slice(0, 6).map((article) => (
                      <Link key={article.id} href={getArticleUrl(article)} className="group block">
                        <div className="overflow-hidden rounded-lg">
                          <div className="aspect-[4/3] w-full bg-gray-200">
                            <Image src={article.imageUrl || "/placeholder.svg"} alt={article.title} width={400} height={300} className="w-full h-full object-cover" loading="lazy" />
                          </div>
                        </div>
                        <div className="mt-2 space-y-1">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="rounded-full bg-red-100 text-red-800 px-2.5 py-0.5 text-xs font-semibold">Top Story</span>
                            <span>{formatDate(article.date || '')}</span>
                          </div>
                          <h3 className="font-bold group-hover:text-red-600">{article.title}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-2">{article.excerpt}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                  {topStories.length === 0 && (
                    <p className="text-center text-muted-foreground py-12">No top stories yet.</p>
                  )}
                </TabsContent>

                <TabsContent value="food" className="mt-4">
                  {(() => {
                    const filtered = articles.filter(a => {
                      const cat = (a.category || '').toLowerCase()
                      const cats = (a.categories || []).map((c: string) => c.toLowerCase())
                      return cat.includes('food') || cat.includes('drink') || cats.some((c: string) => c.includes('food') || c.includes('drink'))
                    }).slice(0, 6)
                    return filtered.length > 0 ? (
                      <>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          {filtered.map((article) => (
                            <Link key={article.id} href={getArticleUrl(article)} className="group block">
                              <div className="overflow-hidden rounded-lg">
                                <div className="aspect-[4/3] w-full bg-gray-200">
                                  <Image src={article.imageUrl || "/placeholder.svg"} alt={article.title} width={400} height={300} className="w-full h-full object-cover" loading="lazy" />
                                </div>
                              </div>
                              <div className="mt-2 space-y-1">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <span className="rounded-full bg-orange-100 text-orange-800 px-2.5 py-0.5 text-xs font-semibold">Food & Drink</span>
                                  <span>{formatDate(article.date || '')}</span>
                                </div>
                                <h3 className="font-bold group-hover:text-red-600">{article.title}</h3>
                                <p className="text-sm text-muted-foreground line-clamp-2">{article.excerpt}</p>
                              </div>
                            </Link>
                          ))}
                        </div>
                        <div className="mt-6 text-center">
                          <Link href="/calgary/food-drink" className="inline-flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors font-medium">
                            View All Food & Drink <ArrowRight className="w-4 h-4" />
                          </Link>
                        </div>
                      </>
                    ) : <p className="text-center text-muted-foreground py-12">No Food & Drink articles yet.</p>
                  })()}
                </TabsContent>

                <TabsContent value="arts" className="mt-4">
                  {(() => {
                    const filtered = articles.filter(a => {
                      const cat = (a.category || '').toLowerCase()
                      const cats = (a.categories || []).map((c: string) => c.toLowerCase())
                      return cat.includes('art') || cat.includes('culture') || cats.some((c: string) => c.includes('art') || c.includes('culture'))
                    }).slice(0, 6)
                    return filtered.length > 0 ? (
                      <>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          {filtered.map((article) => (
                            <Link key={article.id} href={getArticleUrl(article)} className="group block">
                              <div className="overflow-hidden rounded-lg">
                                <div className="aspect-[4/3] w-full bg-gray-200">
                                  <Image src={article.imageUrl || "/placeholder.svg"} alt={article.title} width={400} height={300} className="w-full h-full object-cover" loading="lazy" />
                                </div>
                              </div>
                              <div className="mt-2 space-y-1">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <span className="rounded-full bg-purple-100 text-purple-800 px-2.5 py-0.5 text-xs font-semibold">Arts & Culture</span>
                                  <span>{formatDate(article.date || '')}</span>
                                </div>
                                <h3 className="font-bold group-hover:text-red-600">{article.title}</h3>
                                <p className="text-sm text-muted-foreground line-clamp-2">{article.excerpt}</p>
                              </div>
                            </Link>
                          ))}
                        </div>
                        <div className="mt-6 text-center">
                          <Link href="/calgary/arts-culture" className="inline-flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors font-medium">
                            View All Arts & Culture <ArrowRight className="w-4 h-4" />
                          </Link>
                        </div>
                      </>
                    ) : <p className="text-center text-muted-foreground py-12">No Arts & Culture articles yet.</p>
                  })()}
                </TabsContent>

                <TabsContent value="sports" className="mt-4">
                  {(() => {
                    const filtered = articles.filter(a => {
                      const cat = (a.category || '').toLowerCase()
                      const cats = (a.categories || []).map((c: string) => c.toLowerCase())
                      const tags = ((a as any).tags || []).map((t: string) => t.toLowerCase())
                      return cat.includes('sport') || cats.some((c: string) => c.includes('sport')) || tags.some((t: string) => t.includes('sport'))
                    }).slice(0, 6)
                    return filtered.length > 0 ? (
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {filtered.map((article) => (
                          <Link key={article.id} href={getArticleUrl(article)} className="group block">
                            <div className="overflow-hidden rounded-lg">
                              <div className="aspect-[4/3] w-full bg-gray-200">
                                <Image src={article.imageUrl || "/placeholder.svg"} alt={article.title} width={400} height={300} className="w-full h-full object-cover" loading="lazy" />
                              </div>
                            </div>
                            <div className="mt-2 space-y-1">
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span className="rounded-full bg-yellow-100 text-yellow-800 px-2.5 py-0.5 text-xs font-semibold">Sports</span>
                                <span>{formatDate(article.date || '')}</span>
                              </div>
                              <h3 className="font-bold group-hover:text-red-600">{article.title}</h3>
                              <p className="text-sm text-muted-foreground line-clamp-2">{article.excerpt}</p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    ) : <p className="text-center text-muted-foreground py-12">No Sports articles yet.</p>
                  })()}
                </TabsContent>

                <TabsContent value="realestate" className="mt-4">
                  {(() => {
                    const filtered = articles.filter(a => {
                      const cat = (a.category || '').toLowerCase()
                      const cats = (a.categories || []).map((c: string) => c.toLowerCase())
                      const tags = ((a as any).tags || []).map((t: string) => t.toLowerCase())
                      return cat.includes('real estate') || cat.includes('housing') || cat.includes('property') || cat.includes('mortgage') ||
                        cats.some((c: string) => c.includes('real estate') || c.includes('housing') || c.includes('property')) ||
                        tags.some((t: string) => t.includes('real estate') || t.includes('housing') || t.includes('property'))
                    }).slice(0, 6)
                    return filtered.length > 0 ? (
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {filtered.map((article) => (
                          <Link key={article.id} href={getArticleUrl(article)} className="group block">
                            <div className="overflow-hidden rounded-lg">
                              <div className="aspect-[4/3] w-full bg-gray-200">
                                <Image src={article.imageUrl || "/placeholder.svg"} alt={article.title} width={400} height={300} className="w-full h-full object-cover" loading="lazy" />
                              </div>
                            </div>
                            <div className="mt-2 space-y-1">
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span className="rounded-full bg-teal-100 text-teal-800 px-2.5 py-0.5 text-xs font-semibold">Real Estate</span>
                                <span>{formatDate(article.date || '')}</span>
                              </div>
                              <h3 className="font-bold group-hover:text-red-600">{article.title}</h3>
                              <p className="text-sm text-muted-foreground line-clamp-2">{article.excerpt}</p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    ) : <p className="text-center text-muted-foreground py-12">No Real Estate articles yet.</p>
                  })()}
                </TabsContent>

                <TabsContent value="crime" className="mt-4">
                  {(() => {
                    const filtered = articles.filter(a => {
                      const cat = (a.category || '').toLowerCase()
                      const cats = (a.categories || []).map((c: string) => c.toLowerCase())
                      const tags = ((a as any).tags || []).map((t: string) => t.toLowerCase())
                      return cat.includes('crime') || cat.includes('safety') || cats.some((c: string) => c.includes('crime') || c.includes('safety')) || tags.some((t: string) => t.includes('crime'))
                    }).slice(0, 6)
                    return filtered.length > 0 ? (
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {filtered.map((article) => (
                          <Link key={article.id} href={getArticleUrl(article)} className="group block">
                            <div className="overflow-hidden rounded-lg">
                              <div className="aspect-[4/3] w-full bg-gray-200">
                                <Image src={article.imageUrl || "/placeholder.svg"} alt={article.title} width={400} height={300} className="w-full h-full object-cover" loading="lazy" />
                              </div>
                            </div>
                            <div className="mt-2 space-y-1">
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span className="rounded-full bg-red-100 text-red-800 px-2.5 py-0.5 text-xs font-semibold">Crime</span>
                                <span>{formatDate(article.date || '')}</span>
                              </div>
                              <h3 className="font-bold group-hover:text-red-600">{article.title}</h3>
                              <p className="text-sm text-muted-foreground line-clamp-2">{article.excerpt}</p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    ) : <p className="text-center text-muted-foreground py-12">No Crime articles yet.</p>
                  })()}
                </TabsContent>

                <TabsContent value="politics" className="mt-4">
                  {(() => {
                    const filtered = articles.filter(a => {
                      const cat = (a.category || '').toLowerCase()
                      const cats = (a.categories || []).map((c: string) => c.toLowerCase())
                      const tags = ((a as any).tags || []).map((t: string) => t.toLowerCase())
                      return cat.includes('politic') || cat.includes('government') || cats.some((c: string) => c.includes('politic') || c.includes('government')) || tags.some((t: string) => t.includes('politic'))
                    }).slice(0, 6)
                    return filtered.length > 0 ? (
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {filtered.map((article) => (
                          <Link key={article.id} href={getArticleUrl(article)} className="group block">
                            <div className="overflow-hidden rounded-lg">
                              <div className="aspect-[4/3] w-full bg-gray-200">
                                <Image src={article.imageUrl || "/placeholder.svg"} alt={article.title} width={400} height={300} className="w-full h-full object-cover" loading="lazy" />
                              </div>
                            </div>
                            <div className="mt-2 space-y-1">
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span className="rounded-full bg-gray-100 text-gray-800 px-2.5 py-0.5 text-xs font-semibold">Politics</span>
                                <span>{formatDate(article.date || '')}</span>
                              </div>
                              <h3 className="font-bold group-hover:text-red-600">{article.title}</h3>
                              <p className="text-sm text-muted-foreground line-clamp-2">{article.excerpt}</p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    ) : <p className="text-center text-muted-foreground py-12">No Politics articles yet.</p>
                  })()}
                </TabsContent>
              </Tabs>
            </div>
          </section>

          {/* Calgary Neighborhoods Section */}
          <section className="w-full py-6">
            <div className="container mx-auto px-4 md:px-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-3xl font-bold">Calgary Neighborhoods</h2>
                <Link href="/neighborhoods?city=calgary" className="text-red-600 hover:text-red-700 flex items-center gap-2 font-body font-medium">
                  View All <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {neighborhoodArticles.slice(0, 4).map((article) => (
                  <Link key={article.id} href={getArticleUrl(article)} className="group block">
                    <div className="rounded-2xl overflow-hidden border border-gray-100 bg-white shadow-sm hover:shadow-lg transition-all duration-300">
                      <div className="aspect-[4/3] relative overflow-hidden">
                        <Image
                          src={article.imageUrl || "/placeholder.svg"}
                          alt={article.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-4">
                          <h3 className="font-semibold text-lg text-white drop-shadow-md line-clamp-2">{article.title}</h3>
                        </div>
                      </div>
                      <div className="p-4">
                        <p className="text-gray-600 text-sm line-clamp-2">{article.excerpt}</p>
                        <span className="inline-flex items-center gap-1 mt-2 text-red-600 font-medium text-sm group-hover:gap-2 transition-all">
                          Explore <ArrowRight className="w-4 h-4" />
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
                {neighborhoodArticles.length === 0 && (
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
                <Link href="/guides?city=calgary" className="text-red-600 hover:text-red-700 flex items-center gap-2 font-body font-medium">
                  View All <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {guideArticles.slice(0, 4).map((article) => (
                  <Link key={article.id} href={getArticleUrl(article)} className="group block">
                    <div className="rounded-2xl overflow-hidden border border-gray-100 bg-white shadow-sm hover:shadow-lg transition-all duration-300">
                      <div className="aspect-[4/3] relative overflow-hidden">
                        <Image
                          src={article.imageUrl || "/placeholder.svg"}
                          alt={article.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-4">
                          <h3 className="font-semibold text-lg text-white drop-shadow-md line-clamp-2">{article.title}</h3>
                        </div>
                      </div>
                      <div className="p-4">
                        <p className="text-gray-600 text-sm line-clamp-2">{article.excerpt}</p>
                        <span className="inline-flex items-center gap-1 mt-2 text-red-600 font-medium text-sm group-hover:gap-2 transition-all">
                          Read Guide <ArrowRight className="w-4 h-4" />
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
                {guideArticles.length === 0 && (
                  <div className="col-span-full text-center py-12">
                    <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl">📖</span>
                    </div>
                    <h3 className="font-semibold text-lg mb-2">No Guide Articles Yet</h3>
                    <p className="text-gray-600 text-sm">Create articles with "Guide" category to see them here.</p>
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
