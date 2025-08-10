"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Article } from "@/lib/data"
import { Footer } from "@/components/footer"

interface ExtendedArticle extends Article {
  description?: string;
}

export default function FoodDrinkPage() {
  const [articles, setArticles] = useState<ExtendedArticle[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedSort, setSelectedSort] = useState("newest")

  useEffect(() => {
    loadArticles()
  }, [])

  const loadArticles = () => {
    try {
      const keys = Object.keys(localStorage)
      const postKeys = keys.filter(key => key.startsWith('post_') && !key.startsWith('post_image_'))
      const articleKeys = keys.filter(key => key.startsWith('article_') && !key.startsWith('article_image_'))
      
      const foodArticles: ExtendedArticle[] = []
      
      for (const key of [...postKeys, ...articleKeys]) {
        const savedJson = localStorage.getItem(key)
        if (savedJson) {
          const article = JSON.parse(savedJson)
          
          // Only include food & drink related articles
          if (article.category?.toLowerCase().includes('food') || 
              article.category?.toLowerCase().includes('drink') ||
              article.category?.toLowerCase().includes('restaurant') ||
              article.category?.toLowerCase().includes('cafe') ||
              article.category?.toLowerCase().includes('brewery')) {
            
            // Handle image loading
            if (article.image && article.image.startsWith('__BASE64_IMAGE_')) {
              const imageId = article.image.replace('__BASE64_IMAGE_', '').replace('__', '')
              const savedImage = localStorage.getItem(`post_image_${imageId}`) || 
                               localStorage.getItem(`article_image_${imageId}`)
              if (savedImage) {
                article.image = savedImage
              }
            }

            foodArticles.push({
              ...article,
              id: key.replace('post_', '').replace('article_', ''),
              category: article.category || 'Food & Drink',
              date: article.date || new Date().toISOString(),
              image: article.image || `/placeholder.svg?width=400&height=300&text=${encodeURIComponent(article.title)}`
            })
          }
        }
      }

      // Sort articles based on selected sort option
      foodArticles.sort((a, b) => {
        if (selectedSort === "newest") {
          return new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()
        }
        // Add more sorting options here if needed
        return 0
      })

      setArticles(foodArticles)
      setIsLoading(false)
    } catch (error) {
      console.error('Error loading articles:', error)
      setIsLoading(false)
    }
  }

  const filterArticlesByTab = (tab: string) => {
    if (tab === "all") return articles
    return articles.filter(article => 
      article.category?.toLowerCase().includes(tab.toLowerCase())
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 bg-muted/40">
          <div className="container mx-auto max-w-7xl px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2 max-w-[900px] mx-auto">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl">Food & Drink</h1>
                <p className="text-muted-foreground md:text-xl">
                  Discover Alberta's culinary scene, from farm-to-table restaurants to craft breweries.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container mx-auto max-w-7xl px-4 md:px-6">
            <Tabs defaultValue="all" className="w-full">
              <div className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4">
                <TabsList className="mx-auto sm:mx-0">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="restaurants">Restaurants</TabsTrigger>
                  <TabsTrigger value="cafes">Cafes</TabsTrigger>
                  <TabsTrigger value="breweries">Breweries</TabsTrigger>
                  <TabsTrigger value="recipes">Recipes</TabsTrigger>
                </TabsList>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Sort by:</span>
                  <select 
                    className="rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={selectedSort}
                    onChange={(e) => {
                      setSelectedSort(e.target.value)
                      loadArticles()
                    }}
                  >
                    <option value="newest">Newest</option>
                    <option value="popular">Popular</option>
                    <option value="edmonton">Edmonton</option>
                    <option value="calgary">Calgary</option>
                  </select>
                </div>
              </div>

              {["all", "restaurants", "cafes", "breweries", "recipes"].map((tab) => (
                <TabsContent key={tab} value={tab} className="mt-6">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                    </div>
                  ) : filterArticlesByTab(tab).length === 0 ? (
                    <div className="text-center py-12">
                      <h3 className="text-lg font-semibold">No articles found</h3>
                      <p className="text-muted-foreground">Check back later for updates.</p>
                    </div>
                  ) : (
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-7xl mx-auto">
                      {filterArticlesByTab(tab).map((article) => (
                        <Link key={article.id} href={`/articles/${article.id}`} className="group">
                          <div className="overflow-hidden rounded-lg">
                            <div className="aspect-[4/3] w-full bg-gray-200">
                              <img
                                src={article.image || "/placeholder.svg"}
                                alt={article.title}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const img = e.target as HTMLImageElement
                                  img.src = `/placeholder.svg?width=400&height=300&text=${encodeURIComponent(article.title)}`
                                }}
                              />
                            </div>
                          </div>
                          <div className="mt-3 space-y-1">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold">
                                {article.category}
                              </span>
                              <span>{article.date}</span>
                            </div>
                            <h3 className="font-bold group-hover:text-primary">{article.title}</h3>
                            <p className="text-sm text-muted-foreground line-clamp-2">{article.excerpt}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>

            <div className="mt-12 flex justify-center">
              <Button variant="outline">Load More</Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
