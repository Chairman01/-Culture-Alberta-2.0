"use client"
// Culture Alberta - Homepage

import { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowRight, MapPin, Youtube, Instagram, Facebook, Twitter } from "lucide-react"
import { getAllPosts, BlogPost } from "@/lib/posts"

import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BestOfSection } from "@/components/best-of-section"
import { ReliableImage } from "@/components/reliable-image"

// Define types for our data
interface Article {
  id: string
  title: string
  excerpt?: string
  description?: string
  image?: string
  category?: string
  location?: string
  date?: string
  type?: string
  featured?: boolean
}

interface BestOfItem {
  id: string
  name: string
  title: string
  category: string
  description: string
  image: string
  location: string
  rating: number
}

interface SpotlightArticle {
  id: string
  title: string
  image: string
  date: string
}

interface Event {
  id: string
  title: string
  location: string
  date: string
  description: string
}

interface FoodDrinkArticle {
  id: string
  title: string
  image: string
  category: string
  date: string
}

interface ArticleState {
  latest: Article[]
  edmonton: Article[]
  calgary: Article[]
  food: Article[]
}

// Helper function to get article ID for links
const getArticleId = (article: Article) => {
  if (!article.id) return ''
  // If the ID is already a timestamp or numeric, use it as is
  if (/^\d+$/.test(article.id)) return article.id
  // If it has a prefix, remove it
  return article.id.replace(/^(article[-_]|post[-_]|event[-_])/, '')
}

// Add this helper function after the getArticleId function
const formatDate = (dateString: string) => {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  } catch (error) {
    return dateString
  }
}

export default function Home() {
  const [isClient, setIsClient] = useState(false)
  const [articles, setArticles] = useState<{
    latest: Article[]
    edmonton: Article[]
    calgary: Article[]
    food: Article[]
  }>({
    latest: [],
    edmonton: [],
    calgary: [],
    food: []
  })
  const [edmontonSpotlight, setEdmontonSpotlight] = useState<BlogPost[]>([])
  const [calgarySpotlight, setCalgarySpotlight] = useState<BlogPost[]>([])
  const [featuredArticle, setFeaturedArticle] = useState<Article | null>(null)
  const [bestOfItems, setBestOfItems] = useState<BestOfItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsClient(true)
    loadArticles()
  }, [])

  const loadArticles = async () => {
    try {
      const allPosts: BlogPost[] = await getAllPosts()
      // Sort by date
      allPosts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      // Set featured article - either the explicitly featured one or the newest one
      const featured = allPosts[0]
      if (featured) {
        setFeaturedArticle(featured)
      }

      setArticles({
        latest: allPosts.slice(0, 6),
        edmonton: allPosts.filter(article =>
          article.category?.toLowerCase() === 'edmonton' ||
          article.category?.toLowerCase().includes('edmonton')
        ).slice(0, 6),
        calgary: allPosts.filter(article =>
          article.category?.toLowerCase() === 'calgary' ||
          article.category?.toLowerCase().includes('calgary')
        ).slice(0, 6),
        food: allPosts.filter(article =>
          article.category?.toLowerCase().includes('food')
        ).slice(0, 6)
      })

      setEdmontonSpotlight(
        allPosts.filter(article =>
          article.category?.toLowerCase() === 'edmonton' ||
          article.category?.toLowerCase().includes('edmonton')
        ).slice(0, 4)
      )

      setCalgarySpotlight(
        allPosts.filter(article =>
          article.category?.toLowerCase() === 'calgary' ||
          article.category?.toLowerCase().includes('calgary')
        ).slice(0, 4)
      )

      setIsLoading(false)
    } catch (error) {
      console.error('Error loading articles:', error)
    }
  }

  const getImageUrl = (article: any) => {
    return article?.image_url || article?.image || '/placeholder.svg'
  }

  // Sample data for Best of Alberta section with correct types
  const bestOfCategories = [
    "Dentists",
    "Lawyers",
    "Accountants",
    "Restaurants"
  ]

  if (!isClient) {
    return (
      <div className="flex min-h-screen flex-col">
        <main className="flex-1">
          <div className="container px-4 md:px-6 py-6">
            <div className="animate-pulse">
              <div className="h-64 bg-gray-200 rounded-lg"></div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        <section className="w-full py-6">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
              <div>
                {featuredArticle ? (
                  <Link href={`/articles/${getArticleId(featuredArticle)}`} className="group block">
                    <div className="w-full max-w-4xl mx-auto aspect-[16/9] rounded-lg overflow-hidden mb-6">
                      <ReliableImage
                        src={getImageUrl(featuredArticle)}
                        alt={featuredArticle.title}
                        width={800}
                        height={500}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="mt-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">
                          {featuredArticle.category}
                        </span>
                        <span className="text-xs text-gray-500">{formatDate(featuredArticle.date || '')}</span>
                      </div>
                      <h2 className="mt-2 text-2xl font-bold leading-tight tracking-tighter md:text-3xl lg:text-4xl group-hover:text-blue-600">
                        {featuredArticle.title}
                      </h2>
                      <p className="mt-2 text-gray-600">{featuredArticle.excerpt}</p>
                    </div>
                  </Link>
                ) : (
                  <div className="animate-pulse">
                    <div className="aspect-[16/9] w-full bg-gray-200 rounded-lg"></div>
                    <div className="mt-4 space-y-3">
                      <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                      <div className="h-8 bg-gray-200 rounded"></div>
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-6">
                <div className="rounded-lg border bg-card p-4">
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
                    <Button className="w-full bg-black hover:bg-gray-800">Subscribe</Button>
                  </form>
                  <div className="mt-4">
                    <p className="text-sm font-medium">Follow us:</p>
                    <div className="flex items-center gap-3 mt-2">
                      <Link
                        href="https://www.instagram.com/culturealberta._/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-black hover:text-gray-700"
                      >
                        <Instagram className="h-5 w-5" />
                      </Link>
                      <Link
                        href="https://www.youtube.com/@CultureAlberta_"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-black hover:text-gray-700"
                      >
                        <Youtube className="h-5 w-5" />
                      </Link>
                      <Link href="#" className="text-black hover:text-gray-700">
                        <Facebook className="h-5 w-5" />
                      </Link>
                      <Link href="#" className="text-black hover:text-gray-700">
                        <Twitter className="h-5 w-5" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="w-full py-12">
          <div className="container mx-auto px-4 md:px-6">
            <Tabs defaultValue="latest" className="w-full">
              <div className="flex items-center justify-between mb-8">
                <TabsList>
                  <TabsTrigger value="latest">Latest</TabsTrigger>
                  <TabsTrigger value="edmonton" className="text-blue-600">Edmonton</TabsTrigger>
                  <TabsTrigger value="calgary" className="text-red-600">Calgary</TabsTrigger>
                  <TabsTrigger value="food">Food & Drink</TabsTrigger>
                </TabsList>
                <Link
                  href="/articles"
                  className="flex items-center text-sm font-medium text-muted-foreground hover:text-primary"
                >
                  View All
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </div>
              <TabsContent value="latest" className="mt-8">
                <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                  {articles.latest.map((article) => (
                    <Link key={article.id} href={`/articles/${getArticleId(article)}`} className="group">
                      <div className="overflow-hidden rounded-lg">
                        <div className="aspect-[16/9] w-full bg-muted relative">
                          <ReliableImage
                            src={getImageUrl(article)}
                            alt={article.title}
                            width={400}
                            height={225}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        </div>
                      </div>
                      <div className="mt-4 space-y-2">
                        <div className="space-y-1">
                          <div className="text-xs text-gray-500">
                            {article.category}
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatDate(article.date || '')}
                          </div>
                        </div>
                        <h3 className="font-bold text-lg group-hover:text-blue-600 line-clamp-2">{article.title}</h3>
                        {article.excerpt && (
                          <p className="text-sm text-gray-600 line-clamp-2">{article.excerpt}</p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="edmonton" className="mt-8">
                <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                  {articles.edmonton.map((article) => (
                    <Link key={article.id} href={`/articles/${getArticleId(article)}`} className="group">
                      <div className="overflow-hidden rounded-lg">
                        <div className="aspect-[16/9] w-full bg-muted relative">
                          <ReliableImage
                            src={getImageUrl(article)}
                            alt={article.title}
                            width={400}
                            height={225}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        </div>
                      </div>
                      <div className="mt-4 space-y-2">
                        <div className="space-y-1">
                          <div className="text-xs text-gray-500">
                            {article.category}
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatDate(article.date || '')}
                          </div>
                        </div>
                        <h3 className="font-bold text-lg group-hover:text-blue-600 line-clamp-2">{article.title}</h3>
                        {article.excerpt && (
                          <p className="text-sm text-gray-600 line-clamp-2">{article.excerpt}</p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="calgary" className="mt-8">
                <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                  {articles.calgary.map((article) => (
                    <Link key={article.id} href={`/articles/${getArticleId(article)}`} className="group">
                      <div className="overflow-hidden rounded-lg">
                        <div className="aspect-[16/9] w-full bg-muted relative">
                          <ReliableImage
                            src={getImageUrl(article)}
                            alt={article.title}
                            width={400}
                            height={225}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        </div>
                      </div>
                      <div className="mt-4 space-y-2">
                        <div className="space-y-1">
                          <div className="text-xs text-gray-500">
                            {article.category}
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatDate(article.date || '')}
                          </div>
                        </div>
                        <h3 className="font-bold text-lg group-hover:text-blue-600 line-clamp-2">{article.title}</h3>
                        {article.excerpt && (
                          <p className="text-sm text-gray-600 line-clamp-2">{article.excerpt}</p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="food" className="mt-8">
                {/* Remove the map over foodAndDrink and leave a placeholder comment */}
              </TabsContent>
            </Tabs>
          </div>
        </section>

        <section className="w-full py-6 bg-blue-50">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-blue-600">Edmonton Spotlight</h2>
              <Link href="/edmonton" className="flex items-center text-sm font-medium text-blue-600 hover:text-blue-700">
                View All
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 justify-items-center">
              {edmontonSpotlight.map((article) => (
                <Link 
                  key={article.id} 
                  href={`/best-of/${(article.category || 'general').toLowerCase()}/${article.id}`} 
                  className="group"
                >
                  <div className="overflow-hidden rounded-lg">
                    <ReliableImage
                      src={getImageUrl(article)}
                      alt={article.title}
                      width={400}
                      height={300}
                      className="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                  <div className="mt-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3 text-blue-600" />
                      <span className="text-blue-600">Edmonton</span>
                      <span>•</span>
                      <span>{formatDate(article.created_at || '')}</span>
                    </div>
                    <h3 className="mt-1 font-bold group-hover:text-blue-600 line-clamp-2">{article.title}</h3>
                    {article.excerpt && <p className="text-sm text-muted-foreground line-clamp-2">{article.excerpt}</p>}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="w-full py-6 bg-red-50">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-red-600">Calgary Spotlight</h2>
              <Link href="/calgary" className="flex items-center text-sm font-medium text-red-600 hover:text-red-700">
                View All
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 justify-items-center">
              {calgarySpotlight.map((article) => (
                <Link 
                  key={article.id} 
                  href={`/best-of/${(article.category || 'general').toLowerCase()}/${article.id}`} 
                  className="group"
                >
                  <div className="overflow-hidden rounded-lg">
                    <ReliableImage
                      src={getImageUrl(article)}
                      alt={article.title}
                      width={400}
                      height={300}
                      className="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                  <div className="mt-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3 text-red-600" />
                      <span className="text-red-600">Calgary</span>
                      <span>•</span>
                      <span>{formatDate(article.created_at || '')}</span>
                    </div>
                    <h3 className="mt-1 font-bold group-hover:text-red-600 line-clamp-2">{article.title}</h3>
                    {article.excerpt && <p className="text-sm text-muted-foreground line-clamp-2">{article.excerpt}</p>}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="w-full py-6 bg-muted/30">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center text-center mb-10">
              <h2 className="text-2xl font-bold mb-4">Upcoming Events</h2>
              <div className="flex justify-center w-full">
                <Link
                  href="/events"
                  className="flex items-center text-sm font-medium text-muted-foreground hover:text-primary"
                >
                  View All
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </div>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 justify-items-center">
              {/* Add your upcoming events here */}
            </div>
          </div>
        </section>

        <section className="w-full py-6">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Food & Drink</h2>
              <Link
                href="/food-drink"
                className="flex items-center text-sm font-medium text-muted-foreground hover:text-primary"
              >
                View All
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </div>
            {/* Remove the map over foodAndDrink and leave a placeholder comment */}
          </div>
        </section>

        {/* Centered Best of Alberta section - inlined for home page */}
        <section className="w-full py-12">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center text-center mb-12">
              <h2 className="text-2xl font-bold mb-4">Best of Alberta</h2>
              <p className="text-muted-foreground mx-auto max-w-3xl mb-6">Discover the top-rated professionals and businesses across Alberta.</p>
              <div className="flex justify-center space-x-6 mx-auto mb-4">
                {bestOfCategories.map((category) => (
                  <Link
                    key={category}
                    href="/best-of"
                    className={`text-sm transition-colors ${
                      category === "Dentists" 
                        ? "text-black font-medium" 
                        : "text-gray-500 hover:text-black"
                    }`}
                  >
                    {category}
                  </Link>
                ))}
              </div>
              <div className="flex justify-center">
                <Link
                  href="/best-of"
                  className="flex items-center text-sm text-gray-500 hover:text-black"
                >
                  View All
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="w-full border-t bg-background py-6">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4 justify-items-center text-center">
            <div className="flex flex-col items-center">
              <h3 className="text-lg font-bold mb-4">Culture Alberta</h3>
              <p className="text-sm text-muted-foreground text-center max-w-sm">
                Celebrating and preserving Alberta's rich cultural heritage through stories, events, and community.
              </p>
              <div className="mt-4 flex justify-center gap-4">
                <div className="flex items-center justify-center gap-3">
                  <Link
                    href="https://www.instagram.com/culturealberta._/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-black hover:text-gray-700"
                  >
                    <Instagram className="h-5 w-5" />
                  </Link>
                  <Link
                    href="https://www.youtube.com/@CultureAlberta_"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-black hover:text-gray-700"
                  >
                    <Youtube className="h-5 w-5" />
                  </Link>
                  <Link href="#" className="text-black hover:text-gray-700">
                    <Facebook className="h-5 w-5" />
                  </Link>
                  <Link href="#" className="text-black hover:text-gray-700">
                    <Twitter className="h-5 w-5" />
                  </Link>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-center">
              <h3 className="text-lg font-bold mb-4">Explore</h3>
              <nav className="flex flex-col items-center space-y-2">
                <Link href="/edmonton" className="text-sm text-blue-600 hover:text-blue-700">
                  Edmonton
                </Link>
                <Link href="/calgary" className="text-sm text-red-600 hover:text-red-700">
                  Calgary
                </Link>
                <Link href="/food-drink" className="text-sm text-muted-foreground hover:text-primary">
                  Food & Drink
                </Link>
                <Link href="/events" className="text-sm text-muted-foreground hover:text-primary">
                  Events
                </Link>
                <Link href="/arts" className="text-sm text-muted-foreground hover:text-primary">
                  Arts
                </Link>
                <Link href="/best-of" className="text-sm text-muted-foreground hover:text-primary">
                  Best of Alberta
                </Link>
              </nav>
            </div>
            <div className="flex flex-col items-center">
              <h3 className="text-lg font-bold mb-4">About</h3>
              <nav className="flex flex-col items-center space-y-2">
                <Link href="/about" className="text-sm text-muted-foreground hover:text-primary">
                  About Us
                </Link>
                <Link href="/contact" className="text-sm text-muted-foreground hover:text-primary">
                  Contact
                </Link>
                <Link href="/partner" className="text-sm text-muted-foreground hover:text-primary">
                  Partner with Us
                </Link>
                <Link href="/careers" className="text-sm text-muted-foreground hover:text-primary">
                  Careers
                </Link>
                <Link href="/privacy" className="text-sm text-muted-foreground hover:text-primary">
                  Privacy Policy
                </Link>
                <Link href="/terms" className="text-sm text-muted-foreground hover:text-primary">
                  Terms of Service
                </Link>
              </nav>
            </div>
            <div className="flex flex-col items-center">
              <h3 className="text-lg font-bold mb-4">Newsletter</h3>
              <p className="text-sm text-muted-foreground mb-4 text-center max-w-sm">
                Subscribe to our newsletter for the latest cultural news and events.
              </p>
              <form className="space-y-2 w-full max-w-sm">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <Button className="w-full bg-black hover:bg-gray-800">Subscribe</Button>
              </form>
            </div>
          </div>
          <div className="mt-8 border-t pt-6">
            <p className="text-center text-sm text-muted-foreground">© 2025 Culture Alberta. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
