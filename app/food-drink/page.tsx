"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { getAllArticles } from "@/lib/articles"
import { Footer } from "@/components/footer"
import NewsletterSignup from "@/components/newsletter-signup"
import { Article } from "@/lib/types/article"
import { ArrowRight, Clock, MapPin } from "lucide-react"

interface ExtendedArticle extends Article {
  description?: string;
}

export default function FoodDrinkPage() {
  const [articles, setArticles] = useState<ExtendedArticle[]>([])
  const [featuredArticle, setFeaturedArticle] = useState<ExtendedArticle | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedSort, setSelectedSort] = useState("newest")

  useEffect(() => {
    loadArticles()
  }, [])

  const loadArticles = async () => {
    try {
      const allArticles = await getAllArticles()
      
      // Filter for food & drink related articles - now supports multiple categories
      const foodArticles: ExtendedArticle[] = allArticles
        .filter(article => {
          // Check main category
          const hasFoodCategory = article.category?.toLowerCase().includes('food') || 
                                 article.category?.toLowerCase().includes('drink') ||
                                 article.category?.toLowerCase().includes('restaurant') ||
                                 article.category?.toLowerCase().includes('cafe') ||
                                 article.category?.toLowerCase().includes('brewery') ||
                                 article.category?.toLowerCase().includes('food & drink');
          
          // Check new categories field
          const hasFoodCategories = article.categories?.some(cat => 
            cat.toLowerCase().includes('food') || 
            cat.toLowerCase().includes('drink') ||
            cat.toLowerCase().includes('restaurant') ||
            cat.toLowerCase().includes('cafe') ||
            cat.toLowerCase().includes('brewery') ||
            cat.toLowerCase().includes('food & drink')
          );
          
          // Check tags
          const hasFoodTags = article.tags?.some(tag => 
            tag.toLowerCase().includes('food') || 
            tag.toLowerCase().includes('drink') ||
            tag.toLowerCase().includes('restaurant') ||
            tag.toLowerCase().includes('cafe') ||
            tag.toLowerCase().includes('brewery') ||
            tag.toLowerCase().includes('food & drink')
          );
          
          return hasFoodCategory || hasFoodCategories || hasFoodTags;
        })
        .map(article => ({
          ...article,
          description: article.content,
          category: article.category || 'Food & Drink',
          date: article.date || article.createdAt || new Date().toISOString(),
          imageUrl: article.imageUrl || `/placeholder.svg?width=400&height=300&text=${encodeURIComponent(article.title)}`
        }))

      // Sort articles based on selected sort option
      foodArticles.sort((a, b) => {
        if (selectedSort === "newest") {
          return new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()
        }
        return 0
      })

      // Set featured article (first one)
      if (foodArticles.length > 0) {
        setFeaturedArticle(foodArticles[0])
        setArticles(foodArticles.slice(1)) // Rest of articles
      } else {
        setArticles(foodArticles)
      }

      setIsLoading(false)
    } catch (error) {
      console.error('Error loading articles:', error)
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      })
    } catch {
      return 'Recently'
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
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-orange-50 to-red-50 py-6">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-2 text-center">
            <div className="space-y-1">
              <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl">Food & Drink</h1>
              <p className="max-w-[900px] text-muted-foreground md:text-xl mx-auto">
                Discover Alberta's vibrant culinary scene, from farm-to-table restaurants to craft breweries and everything in between.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Article */}
      {featuredArticle && (
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4 max-w-7xl">
            <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-12 items-center">
              <div className="space-y-6">
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full font-medium">
                    {featuredArticle.category}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {formatDate(featuredArticle.date || '')}
                  </span>
                </div>
                <h2 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
                  {featuredArticle.title}
                </h2>
                <p className="text-xl text-gray-600 leading-relaxed">
                  {featuredArticle.excerpt}
                </p>
                <Link 
                  href={`/articles/${featuredArticle.id}`}
                  className="inline-flex items-center text-orange-600 hover:text-orange-700 font-semibold text-lg group"
                >
                  Read More 
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
              <div className="relative">
                <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl">
                  <Image
                    src={featuredArticle.imageUrl || "/placeholder.svg"}
                    alt={featuredArticle.title}
                    fill
                    className="object-cover"
                    priority
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Main Content */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-12">
            {/* Articles Grid */}
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold text-gray-900">Latest Stories</h2>
                <select 
                  className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  value={selectedSort}
                  onChange={(e) => {
                    setSelectedSort(e.target.value)
                    loadArticles()
                  }}
                >
                  <option value="newest">Newest First</option>
                  <option value="popular">Most Popular</option>
                </select>
              </div>

              <div className="grid gap-8">
                {articles.map((article) => (
                  <Link key={article.id} href={`/articles/${article.id}`} className="group">
                    <article className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="relative aspect-[4/3]">
                          <Image
                            src={article.imageUrl || "/placeholder.svg"}
                            alt={article.title}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="p-6 space-y-4">
                          <div className="flex items-center gap-3 text-sm text-gray-600">
                            <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full font-medium">
                              {article.category}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {formatDate(article.date || '')}
                            </span>
                          </div>
                          <h3 className="text-2xl font-bold text-gray-900 group-hover:text-orange-600 transition-colors leading-tight">
                            {article.title}
                          </h3>
                          <p className="text-gray-600 leading-relaxed line-clamp-3">
                            {article.excerpt}
                          </p>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <MapPin className="w-4 h-4" />
                            <span>{article.location || 'Alberta'}</span>
                          </div>
                        </div>
                      </div>
                    </article>
                  </Link>
                ))}
              </div>

              {articles.length === 0 && (
                <div className="text-center py-12">
                  <h3 className="text-2xl font-semibold text-gray-900 mb-4">No articles found</h3>
                  <p className="text-gray-600">Check back later for the latest food and drink stories.</p>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-8">
              {/* Newsletter */}
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                <NewsletterSignup 
                  title="Stay Hungry"
                  description="Get the latest restaurant reviews, food trends, and dining guides delivered to your inbox."
                  defaultCity=""
                />
              </div>

              {/* Categories - Dynamic from actual articles */}
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Categories</h3>
                <div className="space-y-3">
                  {Array.from(new Set(articles.map(a => a.category).filter(Boolean))).slice(0, 5).map((category) => (
                    <Link 
                      key={category}
                      href={`/food-drink?category=${category?.toLowerCase()}`}
                      className="block text-gray-600 hover:text-orange-600 transition-colors py-2 border-b border-gray-100 last:border-b-0"
                    >
                      {category}
                    </Link>
                  ))}
                  {articles.length === 0 && (
                    <p className="text-gray-500 text-sm">No categories available yet</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
