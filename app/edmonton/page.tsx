import { getCityArticles, getAllArticles } from "@/lib/articles"
import { Article } from "@/lib/types/article"

import Link from "next/link"
import Image from "next/image"
import { ArrowRight, Calendar, MapPin } from "lucide-react"
import NewsletterSignup from "@/components/newsletter-signup"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageSEO } from '@/components/seo/page-seo'
import { getArticleUrl, getEventUrl } from '@/lib/utils/article-url'

// Extend Article locally to include 'type' for filtering
interface EdmontonArticle extends Article {
  type?: string;
  location?: string;
}

export default async function EdmontonPage() {
  console.log('🔄 Loading Edmonton articles...')
  let allArticles: EdmontonArticle[] = []
  
  // ROBUST FALLBACK: Try multiple approaches to get articles
  try {
    // First try to get city-specific articles
    allArticles = await getCityArticles('edmonton') as EdmontonArticle[]
    console.log(`✅ City-specific articles loaded: ${allArticles.length}`)
  } catch (cityError) {
    console.warn('⚠️ City-specific articles failed, trying fallback...', cityError)
  }
  
  // If no city-specific articles found, fall back to all articles and filter
  if (allArticles.length === 0) {
    console.log('🔄 No Edmonton-specific articles found, falling back to all articles with filtering')
    try {
      const allArticlesData = await getAllArticles()
      console.log(`✅ All articles loaded: ${allArticlesData.length}`)
      
      // Filter for Edmonton-related articles only
      allArticles = allArticlesData.filter((article: any) => {
        const hasEdmontonCategory = article.category?.toLowerCase().includes('edmonton')
        const hasEdmontonLocation = article.location?.toLowerCase().includes('edmonton')
        const hasEdmontonCategories = article.categories?.some((cat: string) => 
          cat.toLowerCase().includes('edmonton')
        )
        const hasEdmontonTags = article.tags?.some((tag: string) => 
          tag.toLowerCase().includes('edmonton')
        )
        const hasEdmontonInTitle = article.title?.toLowerCase().includes('edmonton')
        
        return hasEdmontonCategory || hasEdmontonLocation || hasEdmontonCategories || hasEdmontonTags || hasEdmontonInTitle
      }) as EdmontonArticle[]
      console.log(`✅ Filtered Edmonton articles: ${allArticles.length}`)
    } catch (fallbackError) {
      console.error('❌ Fallback articles failed:', fallbackError)
      // Create fallback content to prevent empty page
      allArticles = [{
        id: 'fallback-edmonton',
        title: 'Welcome to Edmonton',
        excerpt: 'Discover the latest news, events, and stories from Alberta\'s capital city.',
        content: 'We\'re working on bringing you amazing Edmonton content. Check back soon!',
        category: 'Edmonton',
        categories: ['Edmonton'],
        location: 'Edmonton',
        imageUrl: '/images/edmonton-fallback.jpg',
        author: 'Culture Alberta',
        date: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        type: 'article',
        status: 'published'
      }]
    }
  }
  
  console.log(`Loaded ${allArticles.length} articles for Edmonton page`)
  
  // Debug: Show all Edmonton articles with their dates
  console.log('🔍 Edmonton articles found:', allArticles.map(article => ({
    id: article.id,
    title: article.title,
    category: article.category,
    location: article.location,
    date: article.date || article.createdAt,
    type: article.type
  })))
  
  // Sort by date (newest first) to ensure latest articles appear first
  const edmontonPosts = allArticles.sort((a, b) => {
    const dateA = new Date(a.date || a.createdAt || 0).getTime()
    const dateB = new Date(b.date || b.createdAt || 0).getTime()
    return dateB - dateA // Newest first
  })
  
  // Debug: Show sorted articles
  console.log('🔍 Sorted Edmonton articles (newest first):', edmontonPosts.slice(0, 5).map(article => ({
    id: article.id,
    title: article.title,
    date: article.date || article.createdAt,
    category: article.category
  })))
  
  // Featured article: first article with featuredEdmonton flag, or first Edmonton article (excluding events) as fallback
  const featuredArticle = edmontonPosts.find(post => post.featuredEdmonton === true) || 
                         edmontonPosts.find(post => post.type !== 'event' && post.type !== 'Event') || 
                         null
  
  // Debug logging
  console.log('All Edmonton posts:', edmontonPosts.map(p => ({ id: p.id, title: p.title, featuredEdmonton: p.featuredEdmonton, type: p.type })))
  console.log('Selected featured article:', featuredArticle ? { id: featuredArticle.id, title: featuredArticle.title, featuredEdmonton: featuredArticle.featuredEdmonton, type: featuredArticle.type } : 'None')
  
  // Trending: articles marked as trending for Edmonton (excluding events)
  const trendingArticles = edmontonPosts
    .filter(a => a.trendingEdmonton === true && a.type !== 'event' && a.type !== 'Event')
    .slice(0, 4)
  
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
  
  const upcomingEvents = edmontonEvents.slice(0, 3)

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

  return (
    <>
      <PageSEO
        title="Edmonton - Culture Alberta"
        description="Discover the latest news, events, and stories from Alberta's capital city. Explore Edmonton's vibrant neighborhoods, cultural venues, and outdoor activities."
      />
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
                {featuredArticle && (
                  <div className="w-full">
                    <Link href={getArticleUrl(featuredArticle)} className="group block">
                      <div className="aspect-[16/9] rounded-lg overflow-hidden bg-gray-200">
                        <Image
                          src={featuredArticle.imageUrl || "/placeholder.svg"}
                          alt={featuredArticle.title}
                          width={800}
                          height={500}
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="mt-3">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="bg-red-500 text-white px-2 py-1 text-xs rounded">Featured</span>
                          <span className="text-sm text-gray-500">Posted {formatDate(featuredArticle.date || '')}</span>
                        </div>
                        <h2 className="text-2xl font-bold leading-tight tracking-tighter md:text-3xl lg:text-4xl group-hover:text-blue-600">
                          {featuredArticle.title}
                        </h2>
                        <p className="mt-2 text-gray-600">{featuredArticle.excerpt}</p>
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
                        // Fallback: show recent Edmonton articles if no trending articles
                        edmontonPosts.slice(0, 3).map((article, index) => (
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
                   <div className="bg-white rounded-xl shadow-sm p-6">
                     <h2 className="font-display text-2xl font-bold mb-4">Upcoming Events</h2>
                     <div className="space-y-3">
                       {upcomingEvents.map((event) => (
                         <Link
                           key={`event-${event.id}`}
                           href={getEventUrl(event)}
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
                    {edmontonPosts.slice(0, 3).map((article) => (
                      <Link key={article.id} href={getArticleUrl(article)} className="group block">
                        <div className="overflow-hidden rounded-lg">
                          <div className="aspect-[4/3] w-full bg-gray-200">
                            <Image
                              src={article.imageUrl || "/placeholder.svg"}
                              alt={article.title}
                              width={400}
                              height={300}
                              loading="lazy"
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
                  {edmontonPosts.length > 3 && (
                    <div className="mt-6 text-center">
                      <Link 
                        href="/edmonton/all-articles" 
                        className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                      >
                        View All Edmonton Articles ({edmontonPosts.length})
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="food" className="mt-4">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {edmontonPosts.filter((article) => article.category?.toLowerCase().includes('food')).slice(0, 3).map((article) => (
                      <Link key={article.id} href={getArticleUrl(article)} className="group block">
                        <div className="overflow-hidden rounded-lg">
                          <div className="aspect-[4/3] w-full bg-gray-200">
                            <Image
                              src={article.imageUrl || "/placeholder.svg"}
                              alt={article.title}
                              width={400}
                              height={300}
                              loading="lazy"
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
                  {edmontonPosts.filter((article) => article.category?.toLowerCase().includes('food')).length > 3 && (
                    <div className="mt-6 text-center">
                      <Link 
                        href="/edmonton/food-drink" 
                        className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                      >
                        View All Food & Drink Articles ({edmontonPosts.filter((article) => article.category?.toLowerCase().includes('food')).length})
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="arts" className="mt-4">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {edmontonPosts.filter((article) => article.category?.toLowerCase().includes('art')).slice(0, 3).map((article) => (
                      <Link key={article.id} href={getArticleUrl(article)} className="group block">
                        <div className="overflow-hidden rounded-lg">
                          <div className="aspect-[4/3] w-full bg-gray-200">
                            <Image
                              src={article.imageUrl || "/placeholder.svg"}
                              alt={article.title}
                              width={400}
                              height={300}
                              loading="lazy"
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
                  {edmontonPosts.filter((article) => article.category?.toLowerCase().includes('art')).length > 3 && (
                    <div className="mt-6 text-center">
                      <Link 
                        href="/edmonton/arts-culture" 
                        className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                      >
                        View All Arts & Culture Articles ({edmontonPosts.filter((article) => article.category?.toLowerCase().includes('art')).length})
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="outdoors" className="mt-4">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {edmontonPosts.filter((article) => article.category?.toLowerCase().includes('outdoor')).slice(0, 3).map((article) => (
                      <Link key={article.id} href={getArticleUrl(article)} className="group block">
                        <div className="overflow-hidden rounded-lg">
                          <div className="aspect-[4/3] w-full bg-gray-200">
                            <Image
                              src={article.imageUrl || "/placeholder.svg"}
                              alt={article.title}
                              width={400}
                              height={300}
                              loading="lazy"
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
                  {edmontonPosts.filter((article) => article.category?.toLowerCase().includes('outdoor')).length > 3 && (
                    <div className="mt-6 text-center">
                      <Link 
                        href="/edmonton/outdoors" 
                        className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                      >
                        View All Outdoors Articles ({edmontonPosts.filter((article) => article.category?.toLowerCase().includes('outdoor')).length})
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </section>

          {/* Edmonton Neighborhoods Section */}
          <section className="w-full py-6">
            <div className="container mx-auto px-4 md:px-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-3xl font-bold">Edmonton Neighborhoods</h2>
                <Link href="/edmonton/all-articles" className="text-blue-600 hover:text-blue-700 flex items-center gap-2 font-body font-medium">
                  View All <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {(() => {
                  const neighborhoodArticles = edmontonPosts.filter(article => 
                    article.category?.toLowerCase().includes('neighborhood') ||
                    article.category?.toLowerCase().includes('neighbourhood') ||
                    article.categories?.some(cat => cat.toLowerCase().includes('neighborhood')) ||
                    article.categories?.some(cat => cat.toLowerCase().includes('neighbourhood')) ||
                    article.tags?.some(tag => tag.toLowerCase().includes('neighborhood')) ||
                    article.tags?.some(tag => tag.toLowerCase().includes('neighbourhood')) ||
                    article.title?.toLowerCase().includes('neighbourhood') ||
                    article.title?.toLowerCase().includes('neighborhood')
                  )
                  
                  console.log('All articles:', edmontonPosts.map(a => ({ 
                    id: a.id, 
                    title: a.title, 
                    category: a.category, 
                    categories: a.categories, 
                    tags: a.tags 
                  })))
                  console.log('Neighborhood articles found:', neighborhoodArticles.length)
                  console.log('Neighborhood articles:', neighborhoodArticles.map(a => ({ 
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
                            loading="lazy"
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
                {edmontonPosts.filter(article => 
                  article.category?.toLowerCase().includes('neighborhood') ||
                  article.category?.toLowerCase().includes('neighbourhood') ||
                  article.categories?.some(cat => cat.toLowerCase().includes('neighborhood')) ||
                  article.categories?.some(cat => cat.toLowerCase().includes('neighbourhood')) ||
                  article.tags?.some(tag => tag.toLowerCase().includes('neighborhood')) ||
                  article.tags?.some(tag => tag.toLowerCase().includes('neighbourhood')) ||
                  article.title?.toLowerCase().includes('neighbourhood') ||
                  article.title?.toLowerCase().includes('neighborhood')
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

          {/* Edmonton Guides Section */}
          <section className="w-full py-6 bg-gray-50">
            <div className="container mx-auto px-4 md:px-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-3xl font-bold">Edmonton Guides</h2>
                <Link href="/edmonton/all-articles" className="text-blue-600 hover:text-blue-700 flex items-center gap-2 font-body font-medium">
                  View All <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {(() => {
                  const guideArticles = edmontonPosts.filter(article => 
                    article.category?.toLowerCase().includes('guide') ||
                    article.categories?.some(cat => cat.toLowerCase().includes('guide')) ||
                    article.tags?.some(tag => tag.toLowerCase().includes('guide')) ||
                    article.type?.toLowerCase().includes('guide')
                  )
                  
                  console.log('Edmonton guide articles found:', guideArticles.length)
                  console.log('Edmonton guide articles:', guideArticles.map(a => ({ 
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
                {edmontonPosts.filter(article => 
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
