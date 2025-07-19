"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Article } from "@/lib/data"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Footer } from "@/components/footer"

interface ExtendedArticle extends Article {
  description?: string;
  author?: string;
}

const mockArtsArticles: ExtendedArticle[] = []

export default function ArtsPage() {
  const [artsArticles, setArtsArticles] = useState<ExtendedArticle[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Start with the default articles
    const articlesData = [...mockArtsArticles]

    // Try to load any articles from localStorage
    try {
      // Get all localStorage keys
      const keys = Object.keys(localStorage)

      // Find keys that match our post pattern
      const postKeys = keys.filter((key) => key.startsWith("post_") && !key.startsWith("post_image_"))

      for (const key of postKeys) {
        const postId = key.replace("post_", "")
        const savedPostJson = localStorage.getItem(key)

        if (savedPostJson) {
          const savedPost = JSON.parse(savedPostJson)

          // Only include arts-related posts
          if (savedPost.category?.toLowerCase() === "arts") {
            // Check if we have a base64 image stored separately
            if (savedPost.image && savedPost.image === `__BASE64_IMAGE_${postId}__`) {
              const savedImage = localStorage.getItem(`post_image_${postId}`)
              if (savedImage) {
                savedPost.image = savedImage
              }
            }

            // Check if this post already exists in our array
            const existingIndex = articlesData.findIndex((a) => a.id === postId)
            if (existingIndex !== -1) {
              // Update existing post
              articlesData[existingIndex] = savedPost
            } else {
              // Add new post
              articlesData.push(savedPost)
            }
          }
        }
      }
    } catch (error) {
      console.error("Error loading saved posts data:", error)
    }

    // Sort articles by date (newest first)
    articlesData.sort((a, b) => {
      const getTime = (date: string | undefined) => {
        if (!date) return 0
        try {
          return new Date(date).getTime()
        } catch {
          return 0
        }
      }
      return getTime(b.date) - getTime(a.date)
    })

    setArtsArticles(articlesData)
    setIsLoading(false)
  }, [])

  const getImageUrl = (article: any) => {
    // If no image, return a placeholder
    if (!article.image) {
      return `/placeholder.svg?height=225&width=400&text=${encodeURIComponent(article.title || "Article")}`
    }

    // If it's a base64 image, use it directly
    if (typeof article.image === "string" && article.image.startsWith("data:image")) {
      // For base64 images, we'll use them directly but also provide a fallback
      try {
        // Check if the base64 string is valid
        atob(article.image.split(",")[1])
        return article.image
      } catch (e) {
        console.error("Invalid base64 image:", e)
        return `/placeholder.svg?height=225&width=400&text=${encodeURIComponent(article.title || "Article")}`
      }
    }

    // If it's a reference to localStorage
    if (typeof article.image === "string" && article.image.startsWith("__BASE64_IMAGE_")) {
      const postId = article.image.replace("__BASE64_IMAGE_", "").replace("__", "")
      try {
        const savedImage = localStorage.getItem(`post_image_${postId}`)
        if (savedImage) {
          return savedImage
        }
      } catch (error) {
        console.error("Error retrieving image from localStorage:", error)
      }
      // If we can't get the localStorage image, use a placeholder
      return `/placeholder.svg?height=225&width=400&text=${encodeURIComponent(article.title || "Article")}`
    }

    // For regular URLs, check if they're valid
    if (typeof article.image === "string" && (article.image.startsWith("http") || article.image.startsWith("/"))) {
      return article.image
    }

    // Default fallback
    return `/placeholder.svg?height=225&width=400&text=${encodeURIComponent(article.title || "Article")}`
  }

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 bg-gray-100">
          <div className="container mx-auto max-w-7xl px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2 max-w-[900px] mx-auto">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl">Arts & Culture in Alberta</h1>
                <p className="text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Discover the vibrant arts scene across Alberta, from visual arts and performances to music and
                  literature.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container mx-auto max-w-7xl px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2 max-w-[600px] mx-auto">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">Latest in Arts & Culture</h2>
                <p className="text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Stay updated with the latest happenings in Alberta's arts and culture scene.
                </p>
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center h-64 mt-8">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 mt-8 max-w-7xl mx-auto">
                {artsArticles.map((article) => (
                  <Link href={`/articles/${article.id}`} key={article.id} className="block h-full">
                    <Card className="h-full overflow-hidden transition-all hover:shadow-lg">
                      <div className="aspect-video w-full bg-muted relative">
                        <img
                          src={getImageUrl(article) || "/placeholder.svg"}
                          alt={article.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            console.error(`Failed to load image for article: ${article.id}`)
                            e.currentTarget.src = `/placeholder.svg?height=225&width=400&text=${encodeURIComponent(article.title || "Article")}`
                          }}
                        />
                      </div>
                      <CardHeader>
                        <CardTitle>{article.title}</CardTitle>
                        <CardDescription>
                          {article.category} • {article.date || 'No date'}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p>{article.excerpt || article.description || `Read more about ${article.title}`}</p>
                      </CardContent>
                      <CardFooter>
                        <p className="text-sm text-gray-500">By {article.author || "Culture Alberta"}</p>
                      </CardFooter>
                    </Card>
                  </Link>
                ))}
              </div>
            )}

            <div className="flex justify-center mt-10">
              <Button className="bg-black hover:bg-gray-800">
                Load More
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>

        <section className="w-full py-12 md:py-24 lg:py-32 bg-gray-100">
          <div className="container mx-auto max-w-7xl px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2 max-w-[600px] mx-auto">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">Upcoming Arts Events</h2>
                <p className="text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Don't miss these exciting arts events happening across Alberta.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 mt-8 max-w-7xl mx-auto">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="overflow-hidden">
                  <div className="aspect-video w-full bg-muted relative">
                    <img
                      src={`/placeholder.svg?height=225&width=400&text=Event+${i}`}
                      alt={`Event ${i}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <CardHeader>
                    <CardTitle>
                      {i === 1
                        ? "Art in the Park Festival"
                        : i === 2
                          ? "Edmonton Symphony Orchestra"
                          : "Calgary Theatre Festival"}
                    </CardTitle>
                    <CardDescription>
                      {i === 1
                        ? "April 15-17, 2024 • Hawrelak Park, Edmonton"
                        : i === 2
                          ? "April 22, 2024 • Winspear Centre, Edmonton"
                          : "May 5-12, 2024 • Various Venues, Calgary"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p>
                      {i === 1
                        ? "A three-day celebration of visual arts featuring over 100 artists from across Alberta."
                        : i === 2
                          ? "A special performance featuring works by Alberta composers."
                          : "A week-long festival showcasing the best in local and international theatre."}
                    </p>
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline">Get Tickets</Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
} 