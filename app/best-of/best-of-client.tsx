/**
 * Best of Alberta Client Component
 * 
 * Handles client-side filtering, category selection, and nomination form
 * 
 * @param articles - Array of best-of articles
 */

"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import Link from 'next/link'
import Image from 'next/image'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowRight, Star, MapPin, Sparkles } from "lucide-react"
import { getArticleUrl } from '@/lib/utils/article-url'
import { getArticleTitle, getArticleImage, getArticleCategory } from '@/lib/utils/article-helpers'
import { Article } from '@/lib/types/article'

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

/**
 * Best of Alberta Client Component
 * 
 * Provides interactive filtering and nomination form with optimized API calls
 */
export function BestOfClient() {
  const [articles, setArticles] = useState<Article[]>([])
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false
  })
  const [isLoading, setIsLoading] = useState(true)
  const [categories, setCategories] = useState<string[]>([])
  const hasLoadedRef = useRef(false)
  const [nominationForm, setNominationForm] = useState({
    name: "",
    category: "",
    location: "",
    description: "",
    contact: ""
  })

  const loadArticles = async (page: number = currentPage) => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
      })
      
      if (selectedCategory && selectedCategory !== 'all') {
        params.append('category', selectedCategory)
      }
      
      const url = `/api/best-of?${params.toString()}`
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.articles && data.pagination) {
        setArticles(data.articles)
        setPagination(data.pagination)
        
        // Extract unique categories
        if (data.articles.length > 0) {
          const uniqueCategories = Array.from(new Set(
            data.articles.map((a: any) => a.category).filter((c: string) => c && c.trim() !== '')
          )) as string[]
          
          if (uniqueCategories.length > 0) {
            setCategories(prev => {
              const combined = [...new Set([...prev, ...uniqueCategories])]
              return combined.sort()
            })
          }
        }
      }
    } catch (error) {
      console.error('Error loading best-of articles:', error)
      setArticles([])
    } finally {
      setIsLoading(false)
    }
  }

  // Single useEffect to handle all loading - prevents multiple calls
  useEffect(() => {
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true
      loadArticles(1)
      return
    }

    const timeoutId = setTimeout(() => {
      if (selectedCategory !== 'all') {
        setCurrentPage(1)
        loadArticles(1)
      } else if (currentPage !== pagination.page) {
        loadArticles(currentPage)
      }
    }, 0)

    return () => clearTimeout(timeoutId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, currentPage])

  // Memoize filtered articles
  const filteredArticles = useMemo(() => {
    if (selectedCategory === "all") {
      return articles
    }
    return articles.filter(article => article.category === selectedCategory)
  }, [articles, selectedCategory])

  const handleNominationSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Implement nomination submission API call
    if (process.env.NODE_ENV === 'development') {
      console.log('Nomination submitted:', nominationForm)
    }
    setNominationForm({ name: "", category: "", location: "", description: "", contact: "" })
    // Show success message (could use toast notification)
    alert('Thank you for your nomination! We will review it and add it to our Best of Alberta list.')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gray-50 py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold mb-4 text-gray-900">Best of Alberta</h1>
          <p className="text-lg text-gray-600 mb-8 max-w-3xl mx-auto">
            Discover the top-rated professionals and businesses across Alberta, from healthcare providers to legal services.
          </p>
        </div>
      </section>

      {/* Category Filter */}
      <section className="py-8 bg-white border-b">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap gap-2 justify-center">
            <Button
              variant={selectedCategory === "all" ? "default" : "outline"}
              onClick={() => setSelectedCategory("all")}
              className="mb-2"
            >
              All Categories
            </Button>
            {categories.map(category => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                onClick={() => setSelectedCategory(category)}
                className="mb-2"
              >
                {category}
              </Button>
            ))}
          </div>
        </div>
      </section>

      {/* Industry Sections */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : filteredArticles.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-16">
              {selectedCategory === "all" ? (
                // Show all categories when "All Categories" is selected
                categories.map(category => {
                  const categoryArticles = articles.filter(article => article.category === category)
                  if (categoryArticles.length === 0) return null
                  return (
                    <CategorySection 
                      key={category} 
                      category={category} 
                      articles={categoryArticles} 
                    />
                  )
                })
              ) : (
                // Show only selected category
                <CategorySection 
                  category={selectedCategory} 
                  articles={filteredArticles} 
                />
              )}
            </div>
          )}
        </div>
      </section>

      {/* Nomination Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <div className="text-6xl mb-6" aria-hidden="true">💡</div>
            <h2 className="text-3xl font-bold mb-4">Know a Hidden Gem?</h2>
            <p className="text-gray-600 mb-8">
              Help us discover the best of Alberta! Nominate your favorite restaurants, attractions, or experiences.
            </p>
            
            <Card className="text-left">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-yellow-500" aria-hidden="true" />
                  Submit a Nomination
                </CardTitle>
                <CardDescription>
                  Share your favorite Alberta spots with the community
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleNominationSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="nomination-name" className="block text-sm font-medium mb-2">
                        Name/Title *
                      </label>
                      <Input
                        id="nomination-name"
                        value={nominationForm.name}
                        onChange={(e) => setNominationForm({...nominationForm, name: e.target.value})}
                        placeholder="e.g., The Best Pizza in Calgary"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="nomination-category" className="block text-sm font-medium mb-2">
                        Category *
                      </label>
                      <Select 
                        value={nominationForm.category} 
                        onValueChange={(value) => setNominationForm({...nominationForm, category: value})}
                      >
                        <SelectTrigger id="nomination-category">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="restaurant">Restaurant</SelectItem>
                          <SelectItem value="attraction">Attraction</SelectItem>
                          <SelectItem value="experience">Experience</SelectItem>
                          <SelectItem value="shop">Shop</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="nomination-location" className="block text-sm font-medium mb-2">
                      Location *
                    </label>
                    <Input
                      id="nomination-location"
                      value={nominationForm.location}
                      onChange={(e) => setNominationForm({...nominationForm, location: e.target.value})}
                      placeholder="e.g., Calgary, AB"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="nomination-description" className="block text-sm font-medium mb-2">
                      Description *
                    </label>
                    <Textarea
                      id="nomination-description"
                      value={nominationForm.description}
                      onChange={(e) => setNominationForm({...nominationForm, description: e.target.value})}
                      placeholder="Tell us why this place is special..."
                      rows={4}
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="nomination-contact" className="block text-sm font-medium mb-2">
                      Contact (Optional)
                    </label>
                    <Input
                      id="nomination-contact"
                      value={nominationForm.contact}
                      onChange={(e) => setNominationForm({...nominationForm, contact: e.target.value})}
                      placeholder="Website, phone, or social media"
                    />
                  </div>
                  <Button type="submit" className="w-full">Submit Nomination</Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  )
}

/**
 * Category Section Component
 * 
 * Displays articles for a specific category
 * 
 * @param category - Category name
 * @param articles - Array of articles in this category
 */
function CategorySection({ 
  category, 
  articles 
}: { 
  category: string
  articles: Article[] 
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold text-gray-900">{category}</h2>
        <Link href={`/best-of/${category.toLowerCase()}`}>
          <Button variant="outline" size="sm">
            View All
            <ArrowRight className="w-4 h-4 ml-1" aria-hidden="true" />
          </Button>
        </Link>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {articles.slice(0, 3).map((article) => (
          <BestOfCard key={article.id} article={article} />
        ))}
      </div>
    </div>
  )
}

/**
 * Best Of Card Component
 * 
 * Displays a best-of article card
 * 
 * @param article - Article object
 */
function BestOfCard({ article }: { article: Article }) {
  return (
    <Card className="group hover:shadow-lg transition-all duration-300">
      <div className="aspect-[16/10] w-full bg-gray-200 relative overflow-hidden rounded-t-lg">
        <Image
          src={getArticleImage(article)}
          alt={getArticleTitle(article)}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          loading="lazy"
          quality={75}
        />
        {article.rating && (
          <div className="absolute top-4 right-4 bg-white text-black px-2 py-1 rounded-full text-sm font-bold flex items-center gap-1 shadow-md">
            <Star className="w-4 h-4 fill-current text-yellow-400" aria-hidden="true" />
            {article.rating}
          </div>
        )}
      </div>
      <CardContent className="p-6">
        <Link href={getArticleUrl(article)}>
          <h3 className="font-semibold text-lg mb-2 group-hover:text-blue-600 transition-colors">
            {getArticleTitle(article)}
          </h3>
        </Link>
        {article.location && (
          <div className="flex items-center text-sm text-gray-600 mb-2">
            <MapPin className="w-4 h-4 mr-1" aria-hidden="true" />
            {article.location}
          </div>
        )}
        {article.excerpt && (
          <p className="text-sm text-gray-600 line-clamp-3">
            {article.excerpt}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Empty State Component
 */
function EmptyState() {
  return (
    <div className="text-center py-16">
      <div className="text-6xl mb-4" aria-hidden="true">🏆</div>
      <h3 className="text-2xl font-bold mb-4">No Best-of Articles Yet</h3>
      <p className="text-gray-600 mb-8">Be the first to nominate your favorite Alberta spots!</p>
      <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
        Submit a Nomination
      </Button>
    </div>
  )
}


