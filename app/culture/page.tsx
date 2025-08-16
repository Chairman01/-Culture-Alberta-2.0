"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { getAllArticles } from "@/lib/articles"
import { Footer } from "@/components/footer"
import NewsletterSignup from "@/components/newsletter-signup"
import { Article } from "@/lib/types/article"
import { ArrowRight, Clock, MapPin, Star, Users, Calendar, Tag } from "lucide-react"

interface ExtendedArticle extends Article {
  description?: string;
}

export default function CulturePage() {
  const [articles, setArticles] = useState<ExtendedArticle[]>([])
  const [featuredArticle, setFeaturedArticle] = useState<ExtendedArticle | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState("all")

  useEffect(() => {
    loadArticles()
  }, [])

  const loadArticles = async () => {
    try {
      const allArticles = await getAllArticles()
      
      // Filter for culture related articles
      const cultureArticles: ExtendedArticle[] = allArticles
        .filter(article => {
          // Exclude specific articles that shouldn't be on the Culture page
          if (article.title?.toLowerCase().includes('edmonton folk music festival') ||
              article.title?.toLowerCase().includes('edmonton folk festival')) {
            return false;
          }
          
          // Check if article has culture-related categories or tags
          const hasCultureCategory = article.category?.toLowerCase().includes('culture') || 
                                    article.category?.toLowerCase().includes('art') ||
                                    article.category?.toLowerCase().includes('music') ||
                                    article.category?.toLowerCase().includes('theater') ||
                                    article.category?.toLowerCase().includes('museum') ||
                                    article.category?.toLowerCase().includes('festival') ||
                                    article.category?.toLowerCase().includes('heritage') ||
                                    article.category?.toLowerCase().includes('indigenous') ||
                                    article.category?.toLowerCase().includes('community');
          
          // Check if article has culture-related categories in the new categories field
          const hasCultureCategories = article.categories?.some(cat => 
            cat.toLowerCase().includes('culture') || 
            cat.toLowerCase().includes('art') ||
            cat.toLowerCase().includes('music') ||
            cat.toLowerCase().includes('theater') ||
            cat.toLowerCase().includes('museum') ||
            cat.toLowerCase().includes('festival') ||
            cat.toLowerCase().includes('heritage') ||
            cat.toLowerCase().includes('indigenous') ||
            cat.toLowerCase().includes('community')
          );
          
          // Check if article has culture-related tags
          const hasCultureTags = article.tags?.some(tag => 
            tag.toLowerCase().includes('culture') || 
            tag.toLowerCase().includes('art') ||
            tag.toLowerCase().includes('music') ||
            tag.toLowerCase().includes('theater') ||
            tag.toLowerCase().includes('museum') ||
            tag.toLowerCase().includes('festival') ||
            tag.toLowerCase().includes('heritage') ||
            tag.toLowerCase().includes('indigenous') ||
            tag.toLowerCase().includes('community')
          );
          
          return hasCultureCategory || hasCultureCategories || hasCultureTags;
        })
        .map(article => ({
          ...article,
          description: article.content,
          category: article.category || 'Culture',
          date: article.date || article.createdAt || new Date().toISOString(),
          imageUrl: article.imageUrl || `/placeholder.svg?width=400&height=300&text=${encodeURIComponent(article.title)}`
        }))

      // Sort by date
      cultureArticles.sort((a, b) => {
        return new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()
      })

      // Set featured article (first one)
      if (cultureArticles.length > 0) {
        setFeaturedArticle(cultureArticles[0])
        setArticles(cultureArticles.slice(1)) // Rest of articles
      } else {
        setArticles(cultureArticles)
      }

      setIsLoading(false)
    } catch (error) {
      console.error('Error loading articles:', error)
      setIsLoading(false)
    }
  }

  const filterArticlesByCategory = (category: string) => {
    if (category === "all") return articles
    return articles.filter(article => 
      article.category?.toLowerCase().includes(category.toLowerCase())
    )
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

  // Get unique categories from actual articles
  const getUniqueCategories = () => {
    const categories = Array.from(new Set(articles.map(a => a.category).filter(Boolean)))
    return [
      { id: 'all', name: 'All Posts', icon: '📰' },
      ...categories.slice(0, 8).map(cat => ({
        id: cat?.toLowerCase() || '',
        name: cat || 'Culture',
        icon: '🎨'
      }))
    ]
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-600"></div>
      </div>
    )
  }

  const categories = getUniqueCategories()

  return (
    <div className="min-h-screen bg-white">
      {/* Header Section - Similar to Culture Days */}
      <header className="bg-white border-b border-gray-200 py-6">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
              Culture365 Blog
            </h1>
            <p className="max-w-2xl text-lg text-gray-600">
              Discover Alberta's rich cultural tapestry, from Indigenous heritage to contemporary arts and vibrant communities.
            </p>
          </div>
        </div>
      </header>

      {/* Featured Article - Large hero style */}
      {featuredArticle && (
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4 max-w-7xl">
            <div className="bg-white rounded-lg overflow-hidden shadow-lg">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
                <div className="relative aspect-[4/3] lg:aspect-square">
                  <Image
                    src={featuredArticle.imageUrl || "/placeholder.svg"}
                    alt={featuredArticle.title}
                    fill
                    className="object-cover"
                    priority
                  />
                </div>
                <div className="p-8 lg:p-12 flex flex-col justify-center">
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium text-xs uppercase tracking-wide">
                        {featuredArticle.category}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDate(featuredArticle.date || '')}
                      </span>
                    </div>
                    <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 leading-tight">
                      {featuredArticle.title}
                    </h2>
                    <p className="text-lg text-gray-600 leading-relaxed">
                      {featuredArticle.excerpt}
                    </p>
                    <Link 
                      href={`/articles/${featuredArticle.id}`}
                      className="inline-flex items-center text-blue-600 hover:text-blue-700 font-semibold group"
                    >
                      Read More 
                      <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Category Navigation - Clean horizontal layout */}
      {categories.length > 1 && (
        <section className="py-8 bg-white border-b border-gray-200">
          <div className="container mx-auto px-4 max-w-7xl">
            <div className="flex flex-wrap gap-3 justify-center">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`px-4 py-2 rounded-md font-medium text-sm transition-all ${
                    selectedCategory === category.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Main Content - Grid layout similar to Culture Days */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-12">
            {/* Articles Grid */}
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedCategory === 'all' ? 'All Posts' : categories.find(c => c.id === selectedCategory)?.name}
                </h2>
                <span className="text-gray-500 text-sm">
                  {filterArticlesByCategory(selectedCategory).length} articles
                </span>
              </div>

              <div className="space-y-8">
                {filterArticlesByCategory(selectedCategory).map((article) => (
                  <Link key={article.id} href={`/articles/${article.id}`} className="group">
                    <article className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-1 relative aspect-[4/3]">
                          <Image
                            src={article.imageUrl || "/placeholder.svg"}
                            alt={article.title}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="md:col-span-2 p-6 space-y-4">
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-medium">
                              {article.category}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDate(article.date || '')}
                            </span>
                          </div>
                          <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors leading-tight">
                            {article.title}
                          </h3>
                          <p className="text-gray-600 leading-relaxed line-clamp-3">
                            {article.excerpt}
                          </p>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            {article.author && (
                              <span className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {article.author}
                              </span>
                            )}
                            {article.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {article.location}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </article>
                  </Link>
                ))}
              </div>

              {filterArticlesByCategory(selectedCategory).length === 0 && (
                <div className="text-center py-12">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">No articles found</h3>
                  <p className="text-gray-600">Check back later for the latest cultural stories.</p>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-8">
              {/* Newsletter */}
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <NewsletterSignup 
                  title="Stay Connected"
                  description="Get the latest cultural events, art exhibitions, and community stories delivered to your inbox."
                  defaultCity=""
                />
              </div>

              {/* Categories */}
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Categories</h3>
                <div className="space-y-2">
                  {Array.from(new Set(articles.map(a => a.category).filter(Boolean))).slice(0, 8).map((category) => (
                    <Link 
                      key={category}
                      href={`/culture?category=${category?.toLowerCase()}`}
                      className="block text-gray-600 hover:text-blue-600 transition-colors py-2 text-sm"
                    >
                      {category}
                    </Link>
                  ))}
                  {articles.length === 0 && (
                    <p className="text-gray-500 text-sm">No categories available yet</p>
                  )}
                </div>
              </div>

              {/* Recent Posts */}
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Posts</h3>
                <div className="space-y-4">
                  {articles.slice(0, 3).map((article) => (
                    <Link 
                      key={article.id}
                      href={`/articles/${article.id}`}
                      className="block group"
                    >
                      <div className="flex gap-3">
                        <div className="relative w-16 h-16 flex-shrink-0">
                          <Image
                            src={article.imageUrl || "/placeholder.svg"}
                            alt={article.title}
                            fill
                            className="object-cover rounded"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                            {article.title}
                          </h4>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatDate(article.date || '')}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
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
