"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Search, Calendar, Clock, MapPin } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { getArticleUrl } from "@/lib/utils/article-url"

interface Article {
  id: string
  title: string
  excerpt?: string
  description?: string
  imageUrl?: string
  category?: string
  location?: string
  date?: string
  readTime?: string
  author?: string
  tags?: string[]
}

function ArticlesContent() {
  const searchParams = useSearchParams()
  const initialSearch = searchParams.get("search") || ""

  const [articles, setArticles] = useState<Article[]>([])
  const [filteredArticles, setFilteredArticles] = useState<Article[]>([])
  const [searchQuery, setSearchQuery] = useState(initialSearch)
  const [isLoading, setIsLoading] = useState(true)

  // Load articles on mount via API
  useEffect(() => {
    async function loadArticles() {
      try {
        setIsLoading(true)
        // Fetch from API route to avoid Node.js fs module issues
        const response = await fetch('/api/articles')
        if (response.ok) {
          const data = await response.json()
          // API returns array directly, or might return { articles: [...] }
          setArticles(Array.isArray(data) ? data : (data.articles || []))
        } else {
          console.error("Failed to fetch articles")
          setArticles([])
        }
      } catch (error) {
        console.error("Error loading articles:", error)
        setArticles([])
      } finally {
        setIsLoading(false)
      }
    }
    loadArticles()
  }, [])

  // Filter articles when search query changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredArticles(articles)
      return
    }

    const query = searchQuery.toLowerCase()
    const filtered = articles.filter((article) => {
      const titleMatch = article.title?.toLowerCase().includes(query)
      const excerptMatch = article.excerpt?.toLowerCase().includes(query)
      const descriptionMatch = article.description?.toLowerCase().includes(query)
      const categoryMatch = article.category?.toLowerCase().includes(query)
      const locationMatch = article.location?.toLowerCase().includes(query)
      const tagsMatch = article.tags?.some(tag => tag.toLowerCase().includes(query))

      return titleMatch || excerptMatch || descriptionMatch || categoryMatch || locationMatch || tagsMatch
    })
    setFilteredArticles(filtered)
  }, [searchQuery, articles])

  // Update search query from URL params
  useEffect(() => {
    const search = searchParams.get("search")
    if (search) {
      setSearchQuery(search)
    }
  }, [searchParams])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    // Update URL with search param
    const url = new URL(window.location.href)
    if (searchQuery.trim()) {
      url.searchParams.set("search", searchQuery.trim())
    } else {
      url.searchParams.delete("search")
    }
    window.history.pushState({}, "", url.toString())
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">All Articles</h1>
          <p className="text-gray-600 mb-6">
            Discover the latest stories about culture, events, and experiences in Alberta
          </p>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <Input
                type="search"
                placeholder="Search articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button type="submit">Search</Button>
          </form>
        </div>
      </div>

      {/* Articles Grid */}
      <div className="container mx-auto px-4 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : filteredArticles.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              {searchQuery ? `No articles found for "${searchQuery}"` : "No articles found"}
            </h3>
            <p className="text-gray-600">
              {searchQuery ? "Try adjusting your search terms" : "Check back later for new content"}
            </p>
          </div>
        ) : (
          <>
            <p className="text-gray-600 mb-6">
              {searchQuery && `Showing ${filteredArticles.length} result${filteredArticles.length !== 1 ? 's' : ''} for "${searchQuery}"`}
              {!searchQuery && `${filteredArticles.length} article${filteredArticles.length !== 1 ? 's' : ''}`}
            </p>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredArticles.map((article) => (
                <Link
                  key={article.id}
                  href={getArticleUrl(article)}
                  className="group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* Image */}
                  <div className="relative h-48 bg-gray-100">
                    {article.imageUrl ? (
                      article.imageUrl.startsWith('data:') ? (
                        // Base64 image - use regular img tag
                        <img
                          src={article.imageUrl}
                          alt={article.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        // URL-based image - use Next.js Image
                        <Image
                          src={article.imageUrl}
                          alt={article.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      )
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                        <span className="text-gray-400 text-sm">No image</span>
                      </div>
                    )}
                    {article.category && (
                      <span className="absolute top-3 left-3 bg-black/80 text-white text-xs px-2 py-1 rounded">
                        {article.category}
                      </span>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <h2 className="font-semibold text-lg text-gray-900 group-hover:text-primary transition-colors line-clamp-2 mb-2">
                      {article.title}
                    </h2>
                    {(article.excerpt || article.description) && (
                      <p className="text-gray-600 text-sm line-clamp-3 mb-3">
                        {article.excerpt || article.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      {article.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {article.location}
                        </span>
                      )}
                      {article.date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(article.date).toLocaleDateString()}
                        </span>
                      )}
                      {article.readTime && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {article.readTime}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function ArticlesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    }>
      <ArticlesContent />
    </Suspense>
  )
}