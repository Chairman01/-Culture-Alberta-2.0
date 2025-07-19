"use client"

import { useEffect, useState } from "react"
import { getAllPosts, BlogPost } from "@/lib/posts"
import Link from "next/link"
import Image from "next/image"
import { ArrowRight, Calendar, MapPin } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Footer } from "@/components/footer"

// Extend BlogPost locally to include 'type' for filtering
interface CalgaryArticle extends BlogPost {
  type?: string;
  location?: string;
}

// Utility for 'Posted X days ago'
function timeAgo(dateString: string) {
  const now = new Date();
  const date = new Date(dateString);
  const diff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'Today';
  if (diff === 1) return '1 day ago';
  return `${diff} days ago`;
}

export default function CalgaryPage() {
  const [articles, setArticles] = useState<CalgaryArticle[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [featureArticle, setFeatureArticle] = useState<CalgaryArticle | null>(null)
  const [trendingArticles, setTrendingArticles] = useState<CalgaryArticle[]>([])
  const [upcomingEvents, setUpcomingEvents] = useState<CalgaryArticle[]>([])

  useEffect(() => {
    async function loadCalgaryArticles() {
      try {
        const allPosts = await getAllPosts()
        // Merge with events from localStorage
        let localEvents = []
        try {
          const keys = Object.keys(localStorage)
          const eventKeys = keys.filter((key) => key.startsWith("event_"))
          for (const key of eventKeys) {
            const savedEventJson = localStorage.getItem(key)
            if (savedEventJson) {
              const savedEvent = JSON.parse(savedEventJson)
              localEvents.push(savedEvent)
            }
          }
        } catch (e) { /* ignore localStorage errors */ }
        const combinedPosts = [...allPosts, ...localEvents]
        const calgaryPosts = combinedPosts.filter(
          (post) => post.category?.toLowerCase().includes("calgary")
        )
        setArticles(calgaryPosts)
        // Feature article: newest
        if (calgaryPosts.length > 0) {
          setFeatureArticle(calgaryPosts[0])
        }
        // Trending: next 3 newest with valid titles
        setTrendingArticles(
          calgaryPosts
            .slice(1)
            .filter(a => a.title && a.title.length > 2 && a.title.toLowerCase() !== 're')
            .slice(0, 3)
        )
        // Upcoming events: type 'event' and future date
        const now = new Date()
        setUpcomingEvents(
          calgaryPosts.filter(
            (a) => (a.type === 'event' || a.type === 'Event') && a.created_at && new Date(a.created_at) > now
          ).slice(0, 3)
        )
      } catch (error) {
        console.error("Error loading Calgary articles:", error)
      } finally {
        setIsLoading(false)
      }
    }
    loadCalgaryArticles()
  }, [])

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black"></div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-12 bg-muted/30">
          <div className="container mx-auto px-4 md:px-6 text-center">
            <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl mb-2">Calgary</h1>
            <p className="max-w-[900px] text-muted-foreground md:text-xl mx-auto">
              Discover the latest news, events, and stories from Alberta's largest city.
            </p>
          </div>
        </section>

        {/* Feature + Sidebar Section */}
        <section className="w-full py-8">
          <div className="container mx-auto px-4 md:px-6 grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-8">
            {/* Feature Article (left) */}
            {featureArticle && (
              <div className="w-full max-w-4xl mx-auto mb-6">
                <div className="aspect-[16/9] rounded-lg overflow-hidden">
                  <Image
                    src={featureArticle.image_url || "/placeholder.svg"}
                    alt={featureArticle.title}
                    width={800}
                    height={500}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="mt-4">
                  <span className="inline-block bg-red-100 text-red-600 text-xs px-2 py-1 rounded mr-2">Featured</span>
                  <span className="text-xs text-gray-500">
                    Posted {featureArticle.created_at ? timeAgo(featureArticle.created_at) : ""}
                  </span>
                  <h2 className="mt-2 text-3xl font-bold">{featureArticle.title}</h2>
                  <p className="mt-2 text-gray-600">{featureArticle.excerpt}</p>
                </div>
              </div>
            )}
            {/* Sidebar (right) */}
            <div className="space-y-6 w-full">
              {/* Trending in Calgary */}
              <div className="rounded-lg border bg-card p-4">
                <h3 className="mb-4 text-lg font-bold text-center">Trending in Calgary</h3>
                <div className="space-y-4">
                  {trendingArticles.map((article, index) => (
                    <Link 
                      key={`trending-${article.id}-${index}`} 
                      href={`/articles/${article.id}`} 
                      className="flex gap-4 group items-center justify-center"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold">
                        {index + 1}
                      </span>
                      <div className="text-center">
                        <h4 className="font-medium group-hover:text-primary">{article.title}</h4>
                        <p className="text-xs text-muted-foreground">{article.created_at ? new Date(article.created_at).toLocaleDateString() : ""}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
              {/* Upcoming Events */}
              <div className="rounded-lg border bg-card p-4">
                <h3 className="mb-4 text-lg font-bold text-center">Upcoming Events</h3>
                <div className="space-y-4">
                  {upcomingEvents.map((event) => (
                    <Link 
                      key={`event-${event.id}`}
                      href={`/articles/${event.id}`} 
                      className="flex flex-col space-y-1 group items-center text-center"
                    >
                      <h4 className="font-medium group-hover:text-primary">{event.title}</h4>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center">
                        <Calendar className="h-3 w-3" />
                        <span>{event.created_at ? new Date(event.created_at).toLocaleDateString() : ""}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center">
                        <MapPin className="h-3 w-3" />
                        <span>{event.location || "Calgary"}</span>
                      </div>
                    </Link>
                  ))}
                </div>
                <div className="mt-4 text-center">
                  <Link href="/events" className="w-full inline-block">
                    <button className="w-full bg-white border border-gray-300 rounded px-4 py-2 hover:bg-gray-100">View All Events</button>
                  </Link>
                </div>
              </div>
              {/* Newsletter Banner */}
              <div className="rounded-lg border bg-card p-4 mt-6">
                <h3 className="mb-4 text-lg font-bold">Newsletter</h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  Stay updated with the latest cultural news and events from across Alberta.
                </p>
                <form className="space-y-2">
                  <input
                    type="email"
                    placeholder="Enter your email"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <button className="w-full bg-black hover:bg-gray-800 text-white rounded-md py-2">Subscribe</button>
                </form>
                <div className="mt-4">
                  <p className="text-sm font-medium">Follow us:</p>
                  <div className="flex items-center gap-3 mt-2">
                    <a href="https://www.instagram.com/culturealberta._/" target="_blank" rel="noopener noreferrer" className="text-black hover:text-gray-700">
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
                    </a>
                    <a href="https://www.youtube.com/@CultureAlberta_" target="_blank" rel="noopener noreferrer" className="text-black hover:text-gray-700">
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"/><path d="m10 15 5-3-5-3z"/></svg>
                    </a>
                    <a href="#" className="text-black hover:text-gray-700">
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Tabs and article grid below */}
        <section className="w-full py-12">
          <div className="container mx-auto px-4 md:px-6 grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-8">
            <div>
              <Tabs defaultValue="all" className="w-full">
                <div className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4">
                  <TabsList className="mx-auto sm:mx-0">
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="food">Food & Drink</TabsTrigger>
                    <TabsTrigger value="arts">Arts & Culture</TabsTrigger>
                    <TabsTrigger value="outdoors">Outdoors</TabsTrigger>
                    <TabsTrigger value="guides">Guides</TabsTrigger>
                  </TabsList>
                </div>
                <TabsContent value="all" className="mt-8">
                  <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                    {articles.map((article) => (
                      <Link key={article.id} href={`/articles/${article.id}`} className="group block">
                        <div className="overflow-hidden rounded-lg">
                          <div className="aspect-[16/9] w-full bg-muted relative">
                            <Image
                              src={article.image_url || "/placeholder.svg"}
                              alt={article.title}
                              width={400}
                              height={225}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          </div>
                        </div>
                        <div className="mt-4 space-y-2">
                          <div className="text-xs text-gray-500">{article.category}</div>
                          <div className="text-xs text-gray-500">{article.created_at ? new Date(article.created_at).toLocaleDateString() : ""}</div>
                          <h3 className="font-bold text-lg group-hover:text-blue-600 line-clamp-2">{article.title}</h3>
                          {article.excerpt && <p className="text-sm text-gray-600 line-clamp-2">{article.excerpt}</p>}
                        </div>
                      </Link>
                    ))}
                  </div>
                </TabsContent>
                <TabsContent value="food" className="mt-8">
                  <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                    {articles.filter((article) => article.category?.toLowerCase().includes('food')).map((article) => (
                      <Link key={article.id} href={`/articles/${article.id}`} className="group block">
                        <div className="overflow-hidden rounded-lg">
                          <div className="aspect-[16/9] w-full bg-muted relative">
                            <Image
                              src={article.image_url || "/placeholder.svg"}
                              alt={article.title}
                              width={400}
                              height={225}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          </div>
                        </div>
                        <div className="mt-4 space-y-2">
                          <div className="text-xs text-gray-500">{article.category}</div>
                          <div className="text-xs text-gray-500">{article.created_at ? new Date(article.created_at).toLocaleDateString() : ""}</div>
                          <h3 className="font-bold text-lg group-hover:text-blue-600 line-clamp-2">{article.title}</h3>
                          {article.excerpt && <p className="text-sm text-gray-600 line-clamp-2">{article.excerpt}</p>}
                        </div>
                      </Link>
                    ))}
                  </div>
                </TabsContent>
                <TabsContent value="arts" className="mt-8">
                  <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                    {articles.filter((article) => article.category?.toLowerCase().includes('art')).map((article) => (
                      <Link key={article.id} href={`/articles/${article.id}`} className="group block">
                        <div className="overflow-hidden rounded-lg">
                          <div className="aspect-[16/9] w-full bg-muted relative">
                            <Image
                              src={article.image_url || "/placeholder.svg"}
                              alt={article.title}
                              width={400}
                              height={225}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          </div>
                        </div>
                        <div className="mt-4 space-y-2">
                          <div className="text-xs text-gray-500">{article.category}</div>
                          <div className="text-xs text-gray-500">{article.created_at ? new Date(article.created_at).toLocaleDateString() : ""}</div>
                          <h3 className="font-bold text-lg group-hover:text-blue-600 line-clamp-2">{article.title}</h3>
                          {article.excerpt && <p className="text-sm text-gray-600 line-clamp-2">{article.excerpt}</p>}
                        </div>
                      </Link>
                    ))}
                  </div>
                </TabsContent>
                <TabsContent value="outdoors" className="mt-8">
                  <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                    {articles.filter((article) => article.category?.toLowerCase().includes('outdoor')).map((article) => (
                      <Link key={article.id} href={`/articles/${article.id}`} className="group block">
                        <div className="overflow-hidden rounded-lg">
                          <div className="aspect-[16/9] w-full bg-muted relative">
                            <Image
                              src={article.image_url || "/placeholder.svg"}
                              alt={article.title}
                              width={400}
                              height={225}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          </div>
                        </div>
                        <div className="mt-4 space-y-2">
                          <div className="text-xs text-gray-500">{article.category}</div>
                          <div className="text-xs text-gray-500">{article.created_at ? new Date(article.created_at).toLocaleDateString() : ""}</div>
                          <h3 className="font-bold text-lg group-hover:text-blue-600 line-clamp-2">{article.title}</h3>
                          {article.excerpt && <p className="text-sm text-gray-600 line-clamp-2">{article.excerpt}</p>}
                        </div>
                      </Link>
                    ))}
                  </div>
                </TabsContent>
                <TabsContent value="guides" className="mt-8">
                  <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                    {articles.filter((article) => (article.type?.toLowerCase() || '').includes('guide')).map((article) => (
                      <Link key={article.id} href={`/articles/${article.id}`} className="group block">
                        <div className="overflow-hidden rounded-lg">
                          <div className="aspect-[16/9] w-full bg-muted relative">
                            <Image
                              src={article.image_url || "/placeholder.svg"}
                              alt={article.title}
                              width={400}
                              height={225}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          </div>
                        </div>
                        <div className="mt-4 space-y-2">
                          <Image
                            src={article.image_url || "/placeholder.svg"}
                            alt={article.title}
                            width={400}
                            height={225}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        </div>
                        <div className="mt-4 space-y-2">
                          <div className="text-xs text-gray-500">{article.category}</div>
                          <div className="text-xs text-gray-500">{article.created_at ? new Date(article.created_at).toLocaleDateString() : ""}</div>
                          <h3 className="font-bold text-lg group-hover:text-blue-600 line-clamp-2">{article.title}</h3>
                          {article.excerpt && <p className="text-sm text-gray-600 line-clamp-2">{article.excerpt}</p>}
                        </div>
                      </Link>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
