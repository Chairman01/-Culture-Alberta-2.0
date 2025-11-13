"use client"

import { useState, useEffect, useRef } from "react"
import React from "react"
import Link from "next/link"
import { ArrowRight, MapPin } from "lucide-react"
import { Article } from "@/lib/data"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ReliableImage } from "@/components/reliable-image"
import { getArticleUrl } from '@/lib/utils/article-url'

interface ExtendedArticle extends Article {
  description?: string;
  rating?: number;
  name?: string;
}

export default function BestOfCategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const [category, setCategory] = useState<string>("")
  const [items, setItems] = useState<ExtendedArticle[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const hasLoadedRef = useRef(false)
  
  // Handle async params
  useEffect(() => {
    params.then(({ category: paramCategory }) => setCategory(paramCategory))
  }, [params])

  // Format the category name for display (capitalize first letter)
  const categoryName = category.charAt(0).toUpperCase() + category.slice(1)

  const loadBestOfItems = async () => {
    if (!category) return
    
    setIsLoading(true)
    try {
      // Use optimized API endpoint
      const params = new URLSearchParams({
        page: '1',
        limit: '50', // Get more items for category page
        category: category,
      })
      
      const response = await fetch(`/api/best-of?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.articles) {
        const formattedItems = data.articles.map((item: any) => ({
          ...item,
          name: item.title,
          rating: item.rating || 4.5,
          image: item.imageUrl || item.image || `/placeholder.svg?width=400&height=300&text=${encodeURIComponent(item.title)}`
        }))
        
        // Sort by rating (highest first)
        formattedItems.sort((a: any, b: any) => (b.rating || 0) - (a.rating || 0))
        
        setItems(formattedItems)
      }
    } catch (error) {
      console.error('Error loading best of items:', error)
      setItems([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (category && !hasLoadedRef.current) {
      hasLoadedRef.current = true
      loadBestOfItems()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category])

  return (
    <div className="flex min-h-screen flex-col">

      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 bg-muted/30">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl">Best {categoryName} in Alberta</h1>
                <p className="max-w-[900px] text-muted-foreground md:text-xl">
                  Discover the top-rated {categoryName.toLowerCase()} across Alberta, selected by our expert team.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="w-full py-12">
          <div className="container px-4 md:px-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Top {categoryName} in Alberta</h2>
              <Link
                href="/best-of"
                className="flex items-center text-sm font-medium text-muted-foreground hover:text-primary"
              >
                Back to All Categories
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-12">
                <h3 className="text-xl font-medium mb-2">No {categoryName} Found</h3>
                <p className="text-muted-foreground mb-6">
                  We couldn't find any {categoryName.toLowerCase()} in our database.
                </p>
                <Button asChild>
                  <Link href="/best-of">View All Categories</Link>
                </Button>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {items.map((item) => (
                  <Link key={item.id} href={getArticleUrl(item)} className="group">
                    <div className="overflow-hidden rounded-lg border bg-background">
                      <div className="relative">
                        <ReliableImage
                          src={item.image || `/placeholder.svg?height=225&width=400&text=${encodeURIComponent(item.name || item.title)}`}
                          alt={item.name || item.title}
                          className="aspect-[16/9] w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          width={400}
                          height={225}
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
          </div>
        </section>

        <section className="w-full py-12 bg-muted/30">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-8">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">Nominate a {categoryName.slice(0, -1)}</h2>
                <p className="text-muted-foreground max-w-[600px] mx-auto">
                  Know a great {categoryName.toLowerCase().slice(0, -1)} that should be featured in our Best of Alberta
                  guide? Let us know!
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
    </div>
  )
}
