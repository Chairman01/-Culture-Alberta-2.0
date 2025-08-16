"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { getAllArticles } from "@/lib/articles"
import { Footer } from "@/components/footer"
import NewsletterSignup from "@/components/newsletter-signup"
import { Article } from "@/lib/types/article"
import { ArrowRight, Clock, MapPin, Star, Users } from "lucide-react"

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
      
      // Filter for culture related articles (excluding specific festivals that don't belong)
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
      { id: 'all', name: 'All Culture', icon: '🎭' },
      ...categories.slice(0, 6).map(cat => ({
        id: cat?.toLowerCase() || '',
        name: cat || 'Culture',
        icon: '🎨'
      }))
    ]
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  const categories = getUniqueCategories()

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 py-6">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-2 text-center">
            <div className="space-y-1">
              <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl">Culture</h1>
              <p className="max-w-[900px] text-muted-foreground md:text-xl mx-auto">
                Explore Alberta's rich cultural tapestry, from Indigenous heritage to contemporary arts and vibrant communities.
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
                  <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full font-medium">
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
                  className="inline-flex items-center text-purple-600 hover:text-purple-700 font-semibold text-lg group"
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

      {/* Category Navigation */}
      {categories.length > 1 && (
        <section className="py-8 bg-gray-50 border-b border-gray-200">
          <div className="container mx-auto px-4 max-w-7xl">
            <div className="flex flex-wrap gap-4 justify-center">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-all ${
                    selectedCategory === category.id
                      ? 'bg-purple-600 text-white shadow-lg'
                      : 'bg-white text-gray-700 hover:bg-purple-50 border border-gray-200'
                  }`}
                >
                  <span className="text-lg">{category.icon}</span>
                  {category.name}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Main Content */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-12">
            {/* Articles Grid */}
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold text-gray-900">
                  {selectedCategory === 'all' ? 'All Stories' : categories.find(c => c.id === selectedCategory)?.name}
                </h2>
                <span className="text-gray-500">
                  {filterArticlesByCategory(selectedCategory).length} articles
                </span>
              </div>

              <div className="grid gap-8">
                {filterArticlesByCategory(selectedCategory).map((article) => (
                  <Link key={article.id} href={`/articles/${article.id}`} className="group">
                    <article className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow border border-gray-100">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="relative aspect-[4/3]">
                          <Image
                            src={article.imageUrl || "/placeholder.svg"}
                            alt={article.title}
                            fill
                            className="object-cover"
                          />
                          <div className="absolute top-4 left-4">
                            <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">
                              {article.category}
                            </span>
                          </div>
                        </div>
                        <div className="p-6 space-y-4">
                          <div className="flex items-center gap-3 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {formatDate(article.date || '')}
                            </span>
                            {article.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                {article.location}
                              </span>
                            )}
                          </div>
                          <h3 className="text-2xl font-bold text-gray-900 group-hover:text-purple-600 transition-colors leading-tight">
                            {article.title}
                          </h3>
                          <p className="text-gray-600 leading-relaxed line-clamp-3">
                            {article.excerpt}
                          </p>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            {article.author && (
                              <span className="flex items-center gap-1">
                                <Users className="w-4 h-4" />
                                {article.author}
                              </span>
                            )}
                            {article.rating && (
                              <span className="flex items-center gap-1">
                                <Star className="w-4 h-4 text-yellow-500" />
                                {article.rating}/5
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
                  <h3 className="text-2xl font-semibold text-gray-900 mb-4">No articles found</h3>
                  <p className="text-gray-600">Check back later for the latest cultural stories.</p>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-8">
              {/* Newsletter */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 shadow-lg border border-purple-100">
                <NewsletterSignup 
                  title="Stay Cultural"
                  description="Get the latest cultural events, art exhibitions, and community stories delivered to your inbox."
                  defaultCity=""
                />
              </div>

              {/* Categories - Dynamic from actual articles */}
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Categories</h3>
                <div className="space-y-3">
                  {Array.from(new Set(articles.map(a => a.category).filter(Boolean))).slice(0, 6).map((category) => (
                    <Link 
                      key={category}
                      href={`/culture?category=${category?.toLowerCase()}`}
                      className="block text-gray-600 hover:text-purple-600 transition-colors py-2 border-b border-gray-100 last:border-b-0"
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
