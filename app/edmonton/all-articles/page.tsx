"use client"

import { useEffect, useState } from "react"
import { getCityArticles } from "@/lib/articles"
import { Article } from "@/lib/types/article"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { Footer } from "@/components/footer"
import { PageSEO } from '@/components/seo/page-seo'
import { getArticleUrl } from '@/lib/utils/article-url'

interface EdmontonArticle extends Article {
  type?: string;
  location?: string;
}

export default function EdmontonAllArticlesPage() {
  const [articles, setArticles] = useState<EdmontonArticle[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const articlesPerPage = 12

  useEffect(() => {
    async function loadEdmontonArticles() {
      try {
        const allArticles = await getCityArticles('edmonton')
        setArticles(allArticles)
      } catch (error) {
        console.error("Error loading Edmonton articles:", error)
      } finally {
        setIsLoading(false)
      }
    }
    loadEdmontonArticles()
  }, [])

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      const now = new Date()
      const diffTime = Math.abs(now.getTime() - date.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      
      if (diffDays === 1) return '1 day ago'
      if (diffDays < 7) return `${diffDays} days ago`
      if (diffDays < 14) return '1 week ago'
      if (diffDays < 21) return '2 weeks ago'
      return '3 weeks ago'
    } catch {
      return 'Recently'
    }
  }

  // Pagination logic
  const totalPages = Math.ceil(articles.length / articlesPerPage)
  const startIndex = (currentPage - 1) * articlesPerPage
  const endIndex = startIndex + articlesPerPage
  const currentArticles = articles.slice(startIndex, endIndex)

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <>
      <PageSEO
        title="All Edmonton Articles - Culture Alberta"
        description="Browse all articles about Edmonton, Alberta. Discover the latest news, events, and stories from Alberta's capital city."
      />
      <div className="flex min-h-screen flex-col">
        <main className="flex-1">
          {/* Header Section */}
          <section className="w-full py-6 bg-blue-50">
            <div className="container mx-auto px-4 md:px-6">
              <div className="flex items-center gap-4 mb-4">
                <Link 
                  href="/edmonton" 
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Edmonton
                </Link>
              </div>
              <div className="flex flex-col items-center justify-center space-y-2 text-center">
                <div className="space-y-1">
                  <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl text-blue-600">All Edmonton Articles</h1>
                  <p className="max-w-[900px] text-muted-foreground md:text-xl mx-auto">
                    Discover all {articles.length} articles about Edmonton, Alberta's capital city.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Articles Grid */}
          <section className="w-full py-8">
            <div className="container mx-auto px-4 md:px-6">
              {currentArticles.length > 0 ? (
                <>
                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {currentArticles.map((article) => (
                      <Link key={article.id} href={getArticleUrl(article)} className="group block">
                        <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300">
                          <div className="aspect-[4/3] w-full bg-gray-200 relative">
                            <Image
                              src={article.imageUrl || "/placeholder.svg"}
                              alt={article.title}
                              width={400}
                              height={300}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                          <div className="p-4">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                              <span className="rounded-full bg-blue-100 text-blue-800 px-2.5 py-0.5 text-xs font-semibold">
                                {article.category}
                              </span>
                              <span>{formatDate(article.date || '')}</span>
                            </div>
                            <h3 className="font-bold text-lg group-hover:text-blue-600 transition-colors duration-300 line-clamp-2 leading-tight mb-2">
                              {article.title}
                            </h3>
                            <p className="text-sm text-muted-foreground line-clamp-3">{article.excerpt}</p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-4 mt-8">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        Previous
                      </button>
                      
                      <div className="flex items-center gap-2">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`px-3 py-2 rounded-lg text-sm font-medium ${
                              currentPage === page
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            {page}
                          </button>
                        ))}
                      </div>
                      
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">📰</span>
                  </div>
                  <h3 className="font-semibold text-lg mb-2">No Articles Found</h3>
                  <p className="text-gray-600 text-sm">Check back later for new Edmonton articles.</p>
                </div>
              )}
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </>
  )
}
