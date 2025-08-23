"use client"

import { useState, useEffect } from 'react'
import { Calendar, Clock, Share2, Bookmark, ArrowLeft, ArrowRight } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { getArticleById, getAllArticles } from '@/lib/articles'

import { Article } from '@/lib/types/article'

// Function to process content and convert YouTube URLs to embedded videos
const processContentWithVideos = (content: string): string => {
  // Convert YouTube URLs to embedded videos
  const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/g
  
  let processedContent = content.replace(youtubeRegex, (match, videoId) => {
    return `<div class="video-container">
      <iframe 
        width="100%" 
        height="400" 
        src="https://www.youtube.com/embed/${videoId}" 
        title="YouTube video player" 
        frameborder="0" 
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
        allowfullscreen
      ></iframe>
    </div>`
  })

  // Convert plain text line breaks to proper HTML paragraphs
  processedContent = processedContent
    .split('\n\n')
    .map(paragraph => paragraph.trim())
    .filter(paragraph => paragraph.length > 0)
    .map(paragraph => {
      // Handle numbered lists (main headings)
      if (/^\d+\./.test(paragraph)) {
        return `<h2 class="text-2xl font-bold text-gray-900 mb-4">${paragraph}</h2>`
      }
      // Handle "What it is:", "Why locals love it:", etc. (highlight boxes)
      else if (/^(What it is|Why locals love it|Pro tip|Vibe|Try this|Heads-up|Must-try|Key Takeaway|Important|Note):/.test(paragraph)) {
        const [label, ...rest] = paragraph.split(':')
        return `<div class="highlight-box">
          <strong class="text-gray-900 text-lg">${label}:</strong> 
          <span class="text-gray-700">${rest.join(':').trim()}</span>
        </div>`
      }
      // Handle "Honorable Mentions:" and "Bottom line:" (section headers)
      else if (/^(Honorable Mentions|Bottom line|Conclusion|Summary|Final Thoughts):/.test(paragraph)) {
        return `<h3 class="text-xl font-semibold text-gray-900 mt-8 mb-4">${paragraph}</h3>`
      }
      // Handle quotes (text wrapped in quotes)
      else if (/^["'].*["']$/.test(paragraph)) {
        return `<blockquote>${paragraph.replace(/^["']|["']$/g, '')}</blockquote>`
      }
      // Handle subheadings (text ending with :)
      else if (/^[A-Z][^:]*:$/.test(paragraph) && paragraph.length < 100) {
        return `<h4 class="text-lg font-semibold text-gray-800 mt-6 mb-3">${paragraph}</h4>`
      }
      // Regular paragraphs
      else {
        return `<p>${paragraph}</p>`
      }
    })
    .join('')

  return processedContent
}

import { PageTracker } from '@/components/analytics/page-tracker'
import { trackArticleView } from '@/lib/analytics'
import NewsletterSignup from '@/components/newsletter-signup'
import { Footer } from '@/components/footer'
import { ArticleContent } from '@/components/article-content'
import './article-styles.css'

export default function ArticlePage() {
  const router = useRouter()
  const params = useParams()
  const [articleId, setArticleId] = useState<string>("")
  
  // Handle params
  useEffect(() => {
    if (params?.id) {
      setArticleId(params.id as string)
    }
  }, [params?.id])
  
  const [article, setArticle] = useState<Article | null>(null)
  const [relatedArticles, setRelatedArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [newsletterEmail, setNewsletterEmail] = useState('')
  const [newsletterCity, setNewsletterCity] = useState('')
  const [newsletterSubmitting, setNewsletterSubmitting] = useState(false)
  const [newsletterSubmitted, setNewsletterSubmitted] = useState(false)

  useEffect(() => {
    async function loadArticle() {
      if (!articleId) {
        setLoading(false)
        return
      }

      try {
        console.log('Loading article with ID:', articleId)
        
        // Try to get the specific article
        const articleData = await getArticleById(articleId)
        
        if (articleData) {
          console.log('Article found:', articleData.title)
          setArticle(articleData)
          
          // Track article view
          trackArticleView(articleData.id, articleData.title)
          
          // Load related articles
          const allArticles = await getAllArticles()
          const related = allArticles
            .filter(a => a.id !== articleId && a.category === articleData.category)
            .slice(0, 3)
          setRelatedArticles(related)
        } else {
          console.log('Article not found, redirecting to 404')
          router.push('/404')
        }
      } catch (error) {
        console.error('Error loading article:', error)
        router.push('/404')
      } finally {
        setLoading(false)
      }
    }

    loadArticle()
  }, [articleId, router])

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading article...</p>
        </div>
      </div>
    )
  }

  // Show 404 if article not found
  if (!article) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6 text-center">
          <div className="mb-4">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.47-.881-6.08-2.33"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Article not found
          </h2>
          <p className="text-gray-600 mb-6">
            The article you're looking for could not be found.
          </p>
          <div className="space-y-3">
            <Link 
              href="/"
              className="inline-flex items-center text-blue-600 hover:text-blue-800"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
    } catch {
      return 'Date not available'
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: article.title,
          text: article.excerpt || article.title,
          url: window.location.href,
        })
      } catch (error) {
        console.log('Error sharing:', error)
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(window.location.href)
        alert('Link copied to clipboard!')
      } catch (error) {
        console.log('Error copying to clipboard:', error)
      }
    }
  }

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newsletterEmail || !newsletterCity) return

    setNewsletterSubmitting(true)
    try {
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: newsletterEmail,
          city: newsletterCity,
        }),
      })

      if (response.ok) {
        setNewsletterSubmitted(true)
        setNewsletterEmail('')
        setNewsletterCity('')
      } else {
        throw new Error('Failed to subscribe')
      }
    } catch (error) {
      console.error('Newsletter subscription error:', error)
      alert('Failed to subscribe. Please try again.')
    } finally {
      setNewsletterSubmitting(false)
    }
  }

  return (
    <>
      <PageTracker />
      <div className="min-h-screen bg-white">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <Link href="/" className="text-xl font-bold text-gray-900">
                Culture Alberta
              </Link>
              <nav className="hidden md:flex space-x-8">
                <Link href="/edmonton" className="text-gray-600 hover:text-gray-900">
                  Edmonton
                </Link>
                <Link href="/calgary" className="text-gray-600 hover:text-gray-900">
                  Calgary
                </Link>
                <Link href="/food-drink" className="text-gray-600 hover:text-gray-900">
                  Food & Drink
                </Link>
                <Link href="/events" className="text-gray-600 hover:text-gray-900">
                  Events
                </Link>
                <Link href="/culture" className="text-gray-600 hover:text-gray-900">
                  Culture
                </Link>
                <Link href="/best-of" className="text-gray-600 hover:text-gray-900">
                  Best of Alberta
                </Link>
              </nav>
            </div>
          </div>
        </header>

        {/* Article Content */}
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Breadcrumb */}
          <nav className="mb-8">
            <ol className="flex items-center space-x-2 text-sm text-gray-500">
              <li>
                <Link href="/" className="hover:text-gray-700">
                  Home
                </Link>
              </li>
              <li>/</li>
              <li>
                <Link href="/articles" className="hover:text-gray-700">
                  Articles
                </Link>
              </li>
              <li>/</li>
              <li className="text-gray-900">{article.title}</li>
            </ol>
          </nav>

          {/* Article Header */}
          <article className="mb-12">
            <header className="mb-8">
              <div className="mb-4">
                {article.category && (
                  <span className="inline-block bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
                    {article.category}
                  </span>
                )}
              </div>
              <h1 className="text-4xl font-bold text-gray-900 mb-4 leading-tight">
                {article.title}
              </h1>
              {article.excerpt && (
                <p className="text-xl text-gray-600 mb-6 leading-relaxed">
                  {article.excerpt}
                </p>
              )}
              <div className="flex items-center justify-between text-sm text-gray-500">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    {formatDate(article.date || article.createdAt || '')}
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    5 min read
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleShare}
                    className="flex items-center text-gray-500 hover:text-gray-700"
                  >
                    <Share2 className="h-4 w-4 mr-1" />
                    Share
                  </button>
                  <button className="flex items-center text-gray-500 hover:text-gray-700">
                    <Bookmark className="h-4 w-4 mr-1" />
                    Save
                  </button>
                </div>
              </div>
            </header>

            {/* Featured Image */}
            {article.imageUrl && (
              <div className="mb-8">
                <div className="relative h-96 w-full rounded-lg overflow-hidden">
                  <Image
                    src={article.imageUrl}
                    alt={article.title}
                    fill
                    className="object-cover"
                    priority
                  />
                </div>
              </div>
            )}

            {/* Article Content */}
            <div className="prose prose-lg max-w-none">
              <ArticleContent content={article.content} />
            </div>
          </article>

          {/* Newsletter Signup */}
          <div className="bg-gray-50 rounded-lg p-8 mb-12">
            <NewsletterSignup />
          </div>

          {/* Related Articles */}
          {relatedArticles.length > 0 && (
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Related Articles
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {relatedArticles.map((relatedArticle) => (
                  <Link
                    key={relatedArticle.id}
                    href={`/articles/${relatedArticle.id}`}
                    className="group block"
                  >
                    <article className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
                      {relatedArticle.imageUrl && (
                        <div className="relative h-48 w-full rounded-t-lg overflow-hidden">
                          <Image
                            src={relatedArticle.imageUrl}
                            alt={relatedArticle.title}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform"
                          />
                        </div>
                      )}
                      <div className="p-4">
                        <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                          {relatedArticle.title}
                        </h3>
                        {relatedArticle.excerpt && (
                          <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                            {relatedArticle.excerpt}
                          </p>
                        )}
                      </div>
                    </article>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </main>

        <Footer />
      </div>
    </>
  )
}
