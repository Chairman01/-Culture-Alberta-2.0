"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { getAllArticles } from "@/lib/articles"
import { Footer } from "@/components/footer"
import NewsletterSignup from "@/components/newsletter-signup"
import { Article } from "@/lib/types/article"
import { ArrowRight, Clock, MapPin, Star, Users, Calendar, Tag, Palette, Music, Theater, Museum, Heart, Sparkles, Globe, Award } from "lucide-react"

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

  // Enhanced categories with icons
  const getCategoryIcon = (category: string) => {
    const cat = category.toLowerCase()
    if (cat.includes('art') || cat.includes('painting') || cat.includes('sculpture')) return Palette
    if (cat.includes('music') || cat.includes('concert') || cat.includes('festival')) return Music
    if (cat.includes('theater') || cat.includes('drama') || cat.includes('performance')) return Theater
    if (cat.includes('museum') || cat.includes('gallery') || cat.includes('exhibition')) return Museum
    if (cat.includes('heritage') || cat.includes('indigenous') || cat.includes('tradition')) return Globe
    if (cat.includes('community') || cat.includes('local')) return Heart
    if (cat.includes('award') || cat.includes('recognition')) return Award
    return Sparkles
  }

  // Get unique categories from actual articles
  const getUniqueCategories = () => {
    const categories = Array.from(new Set(articles.map(a => a.category).filter(Boolean)))
    return [
      { id: 'all', name: 'All Stories', icon: Sparkles },
      ...categories.slice(0, 8).map(cat => ({
        id: cat?.toLowerCase() || '',
        name: cat || 'Culture',
        icon: getCategoryIcon(cat || '')
      }))
    ]
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-200 border-t-purple-600 mx-auto mb-4"></div>
          <p className="text-purple-600 font-medium">Discovering Alberta's culture...</p>
        </div>
      </div>
    )
  }

  const categories = getUniqueCategories()

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      {/* Hero Section with Cultural Elements */}
      <header className="relative overflow-hidden bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-700 py-20">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}></div>
        </div>
        
        <div className="container mx-auto px-4 max-w-7xl relative z-10">
          <div className="flex flex-col items-center justify-center space-y-6 text-center text-white">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Palette className="w-6 h-6" />
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Music className="w-6 h-6" />
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Theater className="w-6 h-6" />
              </div>
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
              Alberta's Cultural
              <span className="block bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent">
                Tapestry
              </span>
            </h1>
            
            <p className="max-w-3xl text-xl text-purple-100 leading-relaxed">
              From Indigenous heritage to contemporary arts, discover the vibrant stories, 
              traditions, and creative expressions that make Alberta truly special.
            </p>
            
            <div className="flex flex-wrap gap-4 justify-center mt-8">
              <div className="bg-white/10 backdrop-blur-sm rounded-full px-6 py-2 text-sm font-medium">
                🎨 Visual Arts
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-full px-6 py-2 text-sm font-medium">
                🎵 Music & Festivals
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-full px-6 py-2 text-sm font-medium">
                🎭 Theater & Performance
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-full px-6 py-2 text-sm font-medium">
                🏛️ Museums & Heritage
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Featured Article - Enhanced Design */}
      {featuredArticle && (
        <section className="py-20 bg-white">
          <div className="container mx-auto px-4 max-w-7xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Featured Story</h2>
              <div className="w-24 h-1 bg-gradient-to-r from-purple-500 to-blue-500 mx-auto rounded-full"></div>
            </div>
            
            <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl overflow-hidden shadow-2xl border border-gray-100">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
                <div className="relative aspect-[4/3] lg:aspect-square group">
                  <Image
                    src={featuredArticle.imageUrl || "/placeholder.svg"}
                    alt={featuredArticle.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                  <div className="absolute top-6 left-6">
                    <span className="bg-white/90 backdrop-blur-sm text-purple-700 px-4 py-2 rounded-full font-semibold text-sm">
                      ✨ Featured
                    </span>
                  </div>
                </div>
                <div className="p-8 lg:p-12 flex flex-col justify-center">
                  <div className="space-y-6">
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="bg-gradient-to-r from-purple-100 to-blue-100 text-purple-800 px-4 py-2 rounded-full font-semibold text-sm">
                        {featuredArticle.category}
                      </span>
                      <span className="flex items-center gap-2 text-gray-500">
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
                      className="inline-flex items-center bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-3 rounded-full font-semibold hover:from-purple-700 hover:to-blue-700 transition-all duration-300 group shadow-lg hover:shadow-xl"
                    >
                      Read Full Story
                      <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Interactive Category Navigation */}
      {categories.length > 1 && (
        <section className="py-12 bg-gradient-to-r from-purple-50 to-blue-50">
          <div className="container mx-auto px-4 max-w-7xl">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Explore by Category</h2>
              <p className="text-gray-600">Discover stories that resonate with your interests</p>
            </div>
            
            <div className="flex flex-wrap gap-4 justify-center">
              {categories.map((category) => {
                const IconComponent = category.icon
                return (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`group flex items-center gap-3 px-6 py-4 rounded-xl font-medium text-sm transition-all duration-300 ${
                      selectedCategory === category.id
                        ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg scale-105'
                        : 'bg-white text-gray-700 hover:bg-purple-50 hover:shadow-md border border-gray-200'
                    }`}
                  >
                    <IconComponent className={`w-5 h-5 ${
                      selectedCategory === category.id ? 'text-white' : 'text-purple-600'
                    }`} />
                    {category.name}
                  </button>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* Main Content - Enhanced Grid Layout */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-16">
            {/* Articles Grid */}
            <div className="space-y-12">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">
                    {selectedCategory === 'all' ? 'All Cultural Stories' : categories.find(c => c.id === selectedCategory)?.name}
                  </h2>
                  <p className="text-gray-600">
                    {filterArticlesByCategory(selectedCategory).length} stories to explore
                  </p>
                </div>
                <div className="bg-gradient-to-r from-purple-100 to-blue-100 px-4 py-2 rounded-full">
                  <span className="text-purple-700 font-semibold text-sm">
                    {filterArticlesByCategory(selectedCategory).length} articles
                  </span>
                </div>
              </div>

              <div className="space-y-8">
                {filterArticlesByCategory(selectedCategory).map((article, index) => {
                  const IconComponent = getCategoryIcon(article.category || '')
                  return (
                    <Link key={article.id} href={`/articles/${article.id}`} className="group block">
                      <article className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
                          <div className="md:col-span-1 relative aspect-[4/3] group-hover:scale-105 transition-transform duration-300">
                            <Image
                              src={article.imageUrl || "/placeholder.svg"}
                              alt={article.title}
                              fill
                              className="object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                          </div>
                          <div className="md:col-span-2 p-8 space-y-4">
                            <div className="flex items-center gap-4 text-sm">
                              <span className="bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-2">
                                <IconComponent className="w-3 h-3" />
                                {article.category}
                              </span>
                              <span className="flex items-center gap-2 text-gray-500">
                                <Calendar className="w-4 h-4" />
                                {formatDate(article.date || '')}
                              </span>
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 group-hover:text-purple-600 transition-colors leading-tight">
                              {article.title}
                            </h3>
                            <p className="text-gray-600 leading-relaxed line-clamp-3">
                              {article.excerpt}
                            </p>
                            <div className="flex items-center gap-6 text-sm text-gray-500">
                              {article.author && (
                                <span className="flex items-center gap-2">
                                  <Users className="w-4 h-4" />
                                  {article.author}
                                </span>
                              )}
                              {article.location && (
                                <span className="flex items-center gap-2">
                                  <MapPin className="w-4 h-4" />
                                  {article.location}
                                </span>
                              )}
                            </div>
                            <div className="pt-4">
                              <span className="inline-flex items-center text-purple-600 font-semibold group-hover:text-purple-700 transition-colors">
                                Read Story
                                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                              </span>
                            </div>
                          </div>
                        </div>
                      </article>
                    </Link>
                  )
                })}
              </div>

              {filterArticlesByCategory(selectedCategory).length === 0 && (
                <div className="text-center py-16">
                  <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Sparkles className="w-12 h-12 text-purple-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">No stories found yet</h3>
                  <p className="text-gray-600 max-w-md mx-auto">
                    We're working on bringing you more amazing cultural stories. Check back soon!
                  </p>
                </div>
              )}
            </div>

            {/* Enhanced Sidebar */}
            <div className="space-y-8">
              {/* Newsletter with Cultural Theme */}
              <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl p-8 border border-purple-100">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Heart className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Stay Connected</h3>
                  <p className="text-gray-600 text-sm">
                    Get the latest cultural events, art exhibitions, and community stories delivered to your inbox.
                  </p>
                </div>
                <NewsletterSignup 
                  title=""
                  description=""
                  defaultCity=""
                />
              </div>

              {/* Cultural Categories */}
              <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-lg">
                <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                  <Tag className="w-5 h-5 text-purple-600" />
                  Explore Categories
                </h3>
                <div className="space-y-3">
                  {Array.from(new Set(articles.map(a => a.category).filter(Boolean))).slice(0, 8).map((category) => {
                    const IconComponent = getCategoryIcon(category || '')
                    return (
                      <Link 
                        key={category}
                        href={`/culture?category=${category?.toLowerCase()}`}
                        className="flex items-center gap-3 text-gray-600 hover:text-purple-600 transition-colors py-3 px-4 rounded-lg hover:bg-purple-50 group"
                      >
                        <IconComponent className="w-4 h-4 text-purple-500 group-hover:scale-110 transition-transform" />
                        <span className="font-medium">{category}</span>
                        <ArrowRight className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                    )
                  })}
                  {articles.length === 0 && (
                    <p className="text-gray-500 text-sm text-center py-4">No categories available yet</p>
                  )}
                </div>
              </div>

              {/* Recent Cultural Stories */}
              <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-lg">
                <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  Recent Stories
                </h3>
                <div className="space-y-6">
                  {articles.slice(0, 4).map((article) => {
                    const IconComponent = getCategoryIcon(article.category || '')
                    return (
                      <Link 
                        key={article.id}
                        href={`/articles/${article.id}`}
                        className="block group"
                      >
                        <div className="flex gap-4">
                          <div className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden">
                            <Image
                              src={article.imageUrl || "/placeholder.svg"}
                              alt={article.title}
                              fill
                              className="object-cover group-hover:scale-110 transition-transform duration-300"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <IconComponent className="w-3 h-3 text-purple-500" />
                              <span className="text-xs text-purple-600 font-medium">{article.category}</span>
                            </div>
                            <h4 className="text-sm font-semibold text-gray-900 group-hover:text-purple-600 transition-colors line-clamp-2 leading-tight">
                              {article.title}
                            </h4>
                            <p className="text-xs text-gray-500 mt-1">
                              {formatDate(article.date || '')}
                            </p>
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>

              {/* Cultural Quote */}
              <div className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl p-8 text-white text-center">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Globe className="w-6 h-6" />
                </div>
                <blockquote className="text-lg font-medium mb-4">
                  "Culture is the widening of the mind and of the spirit."
                </blockquote>
                <p className="text-purple-100 text-sm">— Jawaharlal Nehru</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
