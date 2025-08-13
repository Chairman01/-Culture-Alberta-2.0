"use client"

import { useState, useEffect } from 'react'
import { Calendar, Clock, Share2, Bookmark, ArrowLeft, ArrowRight } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { getArticleById, getAllArticles } from '@/lib/articles'
import { use } from 'react'

import { Article } from '@/lib/types/article'
import { PageTracker } from '@/components/analytics/page-tracker'
import { trackArticleView } from '@/lib/analytics'
import NewsletterSignup from '@/components/newsletter-signup'
import { Footer } from '@/components/footer'

export default function ArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const resolvedParams = use(params)
  const [articleId, setArticleId] = useState<string>("")
  
  // Handle async params
  useEffect(() => {
    setArticleId(resolvedParams.id)
  }, [resolvedParams.id])
  const [article, setArticle] = useState<Article | null>(null)
  const [relatedArticles, setRelatedArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadArticle() {
      if (!articleId) {
        setLoading(false)
        return
      }
      
      try {
        const article = await getArticleById(articleId)
        setArticle(article)
        
        // Load related articles
        const allArticles = await getAllArticles()
        const related = allArticles
          .filter(a => a.id !== articleId && a.type !== 'event')
          .slice(0, 6)
        setRelatedArticles(related)
      } catch (error) {
        console.error("Article not found:", articleId)
        setArticle(null)
      } finally {
        setLoading(false)
      }
    }
    loadArticle()
  }, [articleId])

  useEffect(() => {
    if (article) {
      trackArticleView(resolvedParams.id, article.title)
    }
  }, [article, resolvedParams.id])

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', { 
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    } catch {
      return 'Recently'
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black"></div>
      </div>
    )
  }

  if (!article) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-red-600">Article not found</h1>
        <p className="mt-4">The article you're looking for could not be found.</p>
        <Link href="/" className="text-blue-600 hover:underline mt-4 inline-block">
          ← Back to Home
        </Link>
      </div>
    )
  }

  return (
    <>
      <PageTracker title={article?.title || 'Article'} />
      <div className="min-h-screen bg-gray-50">
        {/* Hero Section */}
        <div className="bg-white">
          <div className="container mx-auto px-4 py-8">
            <Link href="/" className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-6">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Link>
            
            <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-8">
              {/* Main Content */}
              <div className="space-y-6">
                {/* Article Header */}
                <div className="space-y-4">
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    {article.category && (
                      <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium">
                        {article.category}
                      </span>
                    )}
                    {article.date && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {formatDate(article.date)}
                      </span>
                    )}
                    {article.author && (
                      <span className="font-medium">By {article.author}</span>
                    )}
                  </div>
                  
                  <h1 className="text-4xl lg:text-5xl font-bold leading-tight text-gray-900">
                    {article.title}
                  </h1>
                  
                  {article.excerpt && (
                    <p className="text-xl text-gray-600 leading-relaxed">
                      {article.excerpt}
                    </p>
                  )}
                </div>

                {/* Featured Image */}
                {article.imageUrl && (
                  <div className="relative w-full h-[400px] lg:h-[500px] rounded-xl overflow-hidden">
                    <Image
                      src={article.imageUrl}
                      alt={article.title || 'Article image'}
                      fill
                      className="object-cover"
                      priority
                    />
                  </div>
                )}

                {/* Article Content */}
                <div className="prose prose-lg max-w-none">
                  <div className="text-gray-800 leading-relaxed text-lg space-y-6">
                    {article.content ? (
                      <div dangerouslySetInnerHTML={{ __html: article.content }} />
                    ) : (
                      <p className="text-gray-600 italic">Content coming soon...</p>
                    )}
                  </div>
                </div>

                {/* Article Actions */}
                <div className="flex items-center justify-between pt-8 border-t border-gray-200">
                  <div className="flex items-center gap-4">
                    <button className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors">
                      <Share2 className="w-5 h-5" />
                      Share
                    </button>
                    <button className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors">
                      <Bookmark className="w-5 h-5" />
                      Save
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span>Published {formatDate(article.date || '')}</span>
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-8">
                {/* Newsletter Signup */}
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                  <NewsletterSignup 
                    title="Stay in the Loop"
                    description="Get the latest cultural events and stories delivered to your inbox every week."
                    defaultCity=""
                  />
                </div>

                {/* Latest Articles */}
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                  <h3 className="text-xl font-bold mb-4">Latest Articles</h3>
                  <div className="space-y-4">
                    {relatedArticles.slice(0, 3).map((relatedArticle) => (
                      <Link 
                        key={relatedArticle.id} 
                        href={`/articles/${relatedArticle.id}`}
                        className="block group"
                      >
                        <div className="flex items-start space-x-3">
                          <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                            <Image
                              src={relatedArticle.imageUrl || "/placeholder.svg"}
                              alt={relatedArticle.title}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm group-hover:text-blue-600 transition-colors line-clamp-2">
                              {relatedArticle.title}
                            </h4>
                            <p className="text-xs text-gray-500 mt-1">
                              {formatDate(relatedArticle.date || '')}
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
        </div>

        {/* Related Articles Section */}
        {relatedArticles.length > 0 && (
          <div className="bg-white py-12">
            <div className="container mx-auto px-4">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-bold text-gray-900">More Stories</h2>
                <Link href="/" className="text-blue-600 hover:text-blue-700 font-medium">
                  View All <ArrowRight className="w-4 h-4 inline ml-1" />
                </Link>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {relatedArticles.slice(0, 6).map((relatedArticle) => (
                  <Link 
                    key={relatedArticle.id} 
                    href={`/articles/${relatedArticle.id}`}
                    className="group block"
                  >
                    <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow">
                      <div className="relative h-48 overflow-hidden">
                        <Image
                          src={relatedArticle.imageUrl || "/placeholder.svg"}
                          alt={relatedArticle.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <div className="p-4">
                        <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                          {relatedArticle.category && (
                            <span className="bg-gray-100 px-2 py-1 rounded-full">
                              {relatedArticle.category}
                            </span>
                          )}
                          <span>{formatDate(relatedArticle.date || '')}</span>
                        </div>
                        <h3 className="font-bold text-lg group-hover:text-blue-600 transition-colors line-clamp-2">
                          {relatedArticle.title}
                        </h3>
                        {relatedArticle.excerpt && (
                          <p className="text-gray-600 text-sm mt-2 line-clamp-2">
                            {relatedArticle.excerpt}
                          </p>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </>
  )
}
