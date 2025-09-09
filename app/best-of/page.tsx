"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowRight, MapPin, Search } from "lucide-react"
import { Article } from "@/lib/data"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getArticleUrl } from '@/lib/utils/article-url'

interface ExtendedArticle extends Article {
  description?: string;
  rating?: number;
  name?: string;
}

export default function BestOfPage() {
  const [items, setItems] = useState<ExtendedArticle[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Categories for the Best of Alberta section
  const categories = [
    "Dentists",
    "Lawyers",
    "Accountants",
    "Restaurants",
    "Doctors",
    "Real Estate Agents",
    "Home Services",
    "Auto Services",
  ]

  useEffect(() => {
    loadBestOfItems()
  }, [])

  const loadBestOfItems = () => {
    try {
      const keys = Object.keys(localStorage)
      const postKeys = keys.filter(key => key.startsWith('post_') && !key.startsWith('post_image_'))
      const articleKeys = keys.filter(key => key.startsWith('article_') && !key.startsWith('article_image_'))
      
      const bestOfItems: ExtendedArticle[] = []
      
      for (const key of [...postKeys, ...articleKeys]) {
        const savedJson = localStorage.getItem(key)
        if (savedJson) {
          const item = JSON.parse(savedJson)
          
          // Only include items marked as "best-of" or with a rating
          if (item.type === 'best-of' || item.rating) {
            // Handle image loading
            if (item.image && item.image.startsWith('__BASE64_IMAGE_')) {
              const imageId = item.image.replace('__BASE64_IMAGE_', '').replace('__', '')
              const savedImage = localStorage.getItem(`post_image_${imageId}`) || 
                               localStorage.getItem(`article_image_${imageId}`)
              if (savedImage) {
                item.image = savedImage
              }
            }

            bestOfItems.push({
              ...item,
              id: key.replace('post_', '').replace('article_', ''),
              name: item.name || item.title,
              category: item.category || 'General',
              location: item.location || 'Alberta',
              rating: item.rating || 4.5,
              image: item.image || `/placeholder.svg?width=400&height=300&text=${encodeURIComponent(item.title || item.name)}`
            })
          }
        }
      }

      // Sort by rating (highest first)
      bestOfItems.sort((a, b) => (b.rating || 0) - (a.rating || 0))

      setItems(bestOfItems)
      setIsLoading(false)
    } catch (error) {
      console.error('Error loading best of items:', error)
      setIsLoading(false)
    }
  }

  const filterItemsByCategory = (category: string) => {
    if (category === "all") return items
    return items.filter(item => 
      item.category?.toLowerCase() === category.toLowerCase()
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        <section className="w-full py-2 bg-transparent">
          <div className="container mx-auto max-w-7xl px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-2 text-center">
              <div className="space-y-1">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl">Best of Alberta</h1>
                <p className="max-w-[900px] text-muted-foreground md:text-xl mx-auto">
                  Discover the top-rated businesses and services across Alberta.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="w-full py-12">
          <div className="container mx-auto max-w-7xl px-4 md:px-6">
            <Tabs defaultValue="all" className="w-full">
              <div className="flex items-center justify-center mb-6">
                <TabsList className="flex flex-wrap justify-center">
                  <TabsTrigger value="all">All Categories</TabsTrigger>
                  {categories.map((category) => (
                    <TabsTrigger key={category} value={category.toLowerCase()}>
                      {category}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              <TabsContent value="all" className="mt-6">
                {isLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                  </div>
                ) : items.length === 0 ? (
                  <div className="text-center py-12">
                    <h3 className="text-lg font-semibold">No items found</h3>
                    <p className="text-muted-foreground">Check back later for updates or nominate a business below.</p>
                  </div>
                ) : (
                  <div className="grid gap-8 max-w-7xl mx-auto">
                    {categories.map((category) => {
                      const categoryItems = filterItemsByCategory(category.toLowerCase())
                      if (categoryItems.length === 0) return null

                      return (
                        <div key={category} className="space-y-6">
                          <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-bold">{category}</h2>
                            <Link
                              href={`/best-of/${category.toLowerCase()}`}
                              className="flex items-center text-sm font-medium text-muted-foreground hover:text-primary"
                            >
                              View All
                              <ArrowRight className="ml-1 h-4 w-4" />
                            </Link>
                          </div>
                          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {categoryItems.slice(0, 3).map((item) => (
                              <Link
                                key={item.id}
                                href={getArticleUrl(item)}
                                className="group"
                              >
                                <div className="overflow-hidden rounded-lg border bg-background">
                                  <div className="relative">
                                    <img
                                      src={item.image || "/placeholder.svg"}
                                      alt={item.name || item.title}
                                      className="aspect-[16/9] w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                      width={400}
                                      height={225}
                                      onError={(e) => {
                                        const img = e.target as HTMLImageElement
                                        img.src = `/placeholder.svg?width=400&height=225&text=${encodeURIComponent(item.name || item.title)}`
                                      }}
                                    />
                                    <div className="absolute top-2 right-2 bg-black text-white text-sm font-bold rounded-full h-8 w-8 flex items-center justify-center">
                                      {item.rating?.toFixed(1)}
                                    </div>
                                  </div>
                                  <div className="p-4">
                                    <h3 className="font-bold text-lg group-hover:text-primary">{item.name || item.title}</h3>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                                      <MapPin className="h-3 w-3" />
                                      <span>{item.location}</span>
                                    </div>
                                    <p className="text-sm text-muted-foreground line-clamp-2">{item.description || item.excerpt}</p>
                                  </div>
                                </div>
                              </Link>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </TabsContent>

              {categories.map((category) => (
                <TabsContent key={category} value={category.toLowerCase()} className="mt-6">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                    </div>
                  ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {filterItemsByCategory(category.toLowerCase()).map((item) => (
                        <Link key={item.id} href={getArticleUrl(item)} className="group">
                          <div className="overflow-hidden rounded-lg border bg-background">
                            <div className="relative">
                              <img
                                src={item.image || "/placeholder.svg"}
                                alt={item.name || item.title}
                                className="aspect-[16/9] w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                width={400}
                                height={225}
                                onError={(e) => {
                                  const img = e.target as HTMLImageElement
                                  img.src = `/placeholder.svg?width=400&height=225&text=${encodeURIComponent(item.name || item.title)}`
                                }}
                              />
                              <div className="absolute top-2 right-2 bg-black text-white text-sm font-bold rounded-full h-8 w-8 flex items-center justify-center">
                                {item.rating?.toFixed(1)}
                              </div>
                            </div>
                            <div className="p-4">
                              <h3 className="font-bold text-lg group-hover:text-primary">{item.name || item.title}</h3>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                                <MapPin className="h-3 w-3" />
                                <span>{item.location}</span>
                              </div>
                              <p className="text-sm text-muted-foreground line-clamp-2">{item.description || item.excerpt}</p>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </section>

        <section className="w-full py-12 bg-muted/30">
          <div className="container mx-auto max-w-7xl px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-8">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">Nominate a Business</h2>
                <p className="text-muted-foreground max-w-[600px] mx-auto">
                  Know a great business or professional that should be featured in our Best of Alberta guide? Let us
                  know!
                </p>
              </div>
            </div>
            <div className="mx-auto max-w-[600px]">
              <form className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="your-name" className="text-sm font-medium">
                      Your Name
                    </label>
                    <Input id="your-name" placeholder="Enter your name" />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="your-email" className="text-sm font-medium">
                      Your Email
                    </label>
                    <Input id="your-email" type="email" placeholder="Enter your email" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="business-name" className="text-sm font-medium">
                    Business Name
                  </label>
                  <Input id="business-name" placeholder="Enter business name" />
                </div>
                <div className="space-y-2">
                  <label htmlFor="business-category" className="text-sm font-medium">
                    Business Category
                  </label>
                  <select
                    id="business-category"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="">Select a category</option>
                    {categories.map((category) => (
                      <option key={category} value={category.toLowerCase()}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label htmlFor="business-location" className="text-sm font-medium">
                    Business Location
                  </label>
                  <Input id="business-location" placeholder="City, AB" />
                </div>
                <div className="space-y-2">
                  <label htmlFor="why-nominate" className="text-sm font-medium">
                    Why are you nominating this business?
                  </label>
                  <textarea
                    id="why-nominate"
                    className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    placeholder="Tell us what makes this business special..."
                  />
                </div>
                <Button type="submit" className="w-full">Submit Nomination</Button>
              </form>
            </div>
          </div>
        </section>
      </main>
      <footer className="w-full border-t bg-background py-6">
        <div className="container px-4 md:px-6">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <h3 className="text-lg font-bold mb-4">Culture Alberta</h3>
              <p className="text-sm text-muted-foreground">
                Celebrating and preserving Alberta's rich cultural heritage through stories, events, and community.
              </p>
              <div className="mt-4 flex gap-4">
                <Button variant="outline" size="icon">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5"
                  >
                    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                  </svg>
                  <span className="sr-only">Facebook</span>
                </Button>
                <Button variant="outline" size="icon">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5"
                  >
                    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
                  </svg>
                  <span className="sr-only">Twitter</span>
                </Button>
                <Button variant="outline" size="icon">
                  <Link href="https://www.instagram.com/culturealberta._/" target="_blank" rel="noopener noreferrer">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-5 w-5"
                    >
                      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                    </svg>
                    <span className="sr-only">Instagram</span>
                  </Link>
                </Button>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-bold mb-4">Explore</h3>
              <nav className="flex flex-col space-y-2">
                <Link href="/edmonton" className="text-sm text-muted-foreground hover:text-primary">
                  Edmonton
                </Link>
                <Link href="/calgary" className="text-sm text-muted-foreground hover:text-primary">
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
            <div>
              <h3 className="text-lg font-bold mb-4">About</h3>
              <nav className="flex flex-col space-y-2">
                <Link href="/about" className="text-sm text-muted-foreground hover:text-primary">
                  About Us
                </Link>
                <Link href="/contact" className="text-sm text-muted-foreground hover:text-primary">
                  Contact
                </Link>
                <Link href="/advertise" className="text-sm text-muted-foreground hover:text-primary">
                  Advertise
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
            <div>
              <h3 className="text-lg font-bold mb-4">Newsletter</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Subscribe to our newsletter for the latest cultural news and events.
              </p>
              <form className="space-y-2">
                <Input placeholder="Enter your email" type="email" />
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
