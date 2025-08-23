"use client"

import { useState, useEffect } from 'react'
import { Calendar, Clock, Share2, Bookmark, ArrowLeft, ArrowRight } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { getArticleById, getAllArticles } from '@/lib/articles'
import { use } from 'react'
import { notFound } from 'next/navigation'

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
  const [notFoundError, setNotFoundError] = useState(false)
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
        // Add a small timeout to prevent immediate loading
        await new Promise(resolve => setTimeout(resolve, 100))
        
        const article = await getArticleById(articleId)
        
        if (!article) {
          setNotFoundError(true)
          setLoading(false)
          return
        }
        
        setArticle(article)
        
        // Load related articles in background
        setTimeout(async () => {
          try {
            const allArticles = await getAllArticles()
            const related = allArticles
              .filter(a => a.id !== articleId && a.type !== 'event')
              .slice(0, 6)
            setRelatedArticles(related)
          } catch (error) {
            console.error("Error loading related articles:", error)
          }
        }, 500)
        
      } catch (error) {
        console.error("Article not found:", articleId)
        setNotFoundError(true)
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

  // Reading progress tracking and newsletter popup
  useEffect(() => {
    const updateReadingProgress = () => {
      // Get the article content element
      const articleContent = document.querySelector('.article-content') as HTMLElement
      if (!articleContent) return
      
      const rect = articleContent.getBoundingClientRect()
      const windowHeight = window.innerHeight
      const contentHeight = articleContent.offsetHeight
      
      // Calculate how much of the content has been scrolled past
      const scrolledPast = windowHeight - rect.top
      const totalScrollable = contentHeight + windowHeight
      const scrollPercent = Math.max(0, Math.min(100, (scrolledPast / totalScrollable) * 100))
      
      const progressBar = document.getElementById('header-reading-progress')
      if (progressBar) {
        progressBar.style.width = `${scrollPercent}%`
      }

      // Show newsletter popup when user has scrolled 30% through the article
      const newsletter = document.getElementById('sticky-newsletter')
      if (newsletter && scrollPercent > 30 && scrollPercent < 90) {
        newsletter.classList.remove('opacity-0', 'translate-y-full', 'scale-95')
        newsletter.classList.add('opacity-100', 'translate-y-0', 'scale-100')
      } else if (newsletter && (scrollPercent <= 30 || scrollPercent >= 90)) {
        newsletter.classList.add('opacity-0', 'translate-y-full', 'scale-95')
        newsletter.classList.remove('opacity-100', 'translate-y-0', 'scale-100')
      }
    }

    // Initial call
    setTimeout(updateReadingProgress, 100)
    
    window.addEventListener('scroll', updateReadingProgress)
    window.addEventListener('resize', updateReadingProgress)
    
    return () => {
      window.removeEventListener('scroll', updateReadingProgress)
      window.removeEventListener('resize', updateReadingProgress)
    }
  }, [article])

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

  const handleNewsletterSignup = async () => {
    if (!newsletterEmail) {
      alert('Please enter your email address.')
      return
    }
    
    if (!newsletterCity) {
      alert('Please select your city.')
      return
    }

    setNewsletterSubmitting(true)
    
    try {
      // Call your newsletter API to save the email
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: newsletterEmail,
          city: newsletterCity,
          optIn: true,
          source: 'article-popup'
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to subscribe')
      }
      
      setNewsletterSubmitted(true)
      setNewsletterEmail('')
      setNewsletterCity('')
      
      // Hide the popup after successful signup
      setTimeout(() => {
        const newsletter = document.getElementById('sticky-newsletter')
        if (newsletter) {
          newsletter.classList.add('opacity-0', 'translate-y-full', 'scale-95')
          newsletter.classList.remove('opacity-100', 'translate-y-0', 'scale-100')
        }
      }, 2000)
      
    } catch (error) {
      alert('There was an error signing you up. Please try again.')
    } finally {
      setNewsletterSubmitting(false)
    }
  }

  // Show blank page while loading
  if (loading) {
    return <div className="min-h-screen bg-white"></div>
  }

  // Redirect to 404 page if article not found
  if (notFoundError || !article) {
    notFound()
  }

  return (
    <>
      <PageTracker title={article?.title || 'Article'} />
      <div className="min-h-screen bg-gray-50">
        {/* Sticky Header */}
        <div className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Link href="/" className="inline-flex items-center text-blue-600 hover:text-blue-700">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Home
                </Link>
                <div className="hidden md:block">
                  <h1 className="text-lg font-semibold text-gray-900 truncate max-w-md">
                    {article?.title}
                  </h1>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <button className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors">
                  <Share2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Share</span>
                </button>
                <button className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors">
                  <Bookmark className="w-4 h-4" />
                  <span className="hidden sm:inline">Save</span>
                </button>
              </div>
            </div>
            {/* Reading Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-1 mt-3">
              <div 
                className="bg-blue-600 h-1 rounded-full transition-all duration-300 ease-out" 
                style={{ width: '0%' }} 
                id="header-reading-progress"
              ></div>
            </div>
          </div>
        </div>

        {/* Sticky Newsletter Popup */}
        <div 
          id="sticky-newsletter"
          className="fixed bottom-4 right-4 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm opacity-0 translate-y-full scale-95 transition-all duration-300 ease-out"
        >
          <div className="flex items-start justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900">Stay Updated</h3>
            <button 
              onClick={() => {
                const newsletter = document.getElementById('sticky-newsletter')
                if (newsletter) {
                  newsletter.classList.add('opacity-0', 'translate-y-full', 'scale-95')
                  newsletter.classList.remove('opacity-100', 'translate-y-0', 'scale-100')
                }
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
          <p className="text-xs text-gray-600 mb-3">
            Get the latest culture and events in your city
          </p>
          <div className="space-y-2">
            <input
              type="email"
              placeholder="Your email"
              value={newsletterEmail}
              onChange={(e) => setNewsletterEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
            />
            <select
              value={newsletterCity}
              onChange={(e) => setNewsletterCity(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
            >
              <option value="">Select your city</option>
              <option value="Edmonton">Edmonton</option>
              <option value="Calgary">Calgary</option>
              <option value="Other">Other</option>
            </select>
            <button
              onClick={handleNewsletterSignup}
              disabled={newsletterSubmitting}
              className="w-full bg-blue-600 text-white py-2 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {newsletterSubmitting ? 'Subscribing...' : 'Subscribe'}
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            {/* Article Header */}
            <div className="mb-8">
              <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {formatDate(article?.date || '')}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  5 min read
                </div>
              </div>
              
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
                {article?.title}
              </h1>
              
              {article?.excerpt && (
                <p className="text-xl text-gray-600 mb-6 leading-relaxed">
                  {article.excerpt}
                </p>
              )}
              
              {article?.imageUrl && (
                <div className="relative w-full h-96 md:h-[500px] rounded-lg overflow-hidden mb-8">
                  <Image
                    src={article.imageUrl}
                    alt={article?.title || 'Article image'}
                    fill
                    className="object-cover"
                    priority
                  />
                </div>
              )}
            </div>

            {/* Article Content */}
            <div className="prose prose-lg max-w-none mb-12">
              <ArticleContent content={article?.content || ''} />
            </div>

            {/* Related Articles */}
            {relatedArticles.length > 0 && (
              <div className="border-t border-gray-200 pt-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Related Articles</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {relatedArticles.map((relatedArticle) => (
                    <Link
                      key={relatedArticle.id}
                      href={`/articles/${relatedArticle.id}`}
                      className="group block"
                    >
                      <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
                        {relatedArticle.imageUrl && (
                          <div className="relative h-48 rounded-t-lg overflow-hidden">
                            <Image
                              src={relatedArticle.imageUrl}
                              alt={relatedArticle.title}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                        )}
                        <div className="p-4">
                          <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                            {relatedArticle.title}
                          </h3>
                          <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                            {relatedArticle.excerpt}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Newsletter Signup Section */}
        <div className="bg-gray-100 py-12">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto text-center">
              <NewsletterSignup />
            </div>
          </div>
        </div>

        <Footer />
      </div>
    </>
  )
}
