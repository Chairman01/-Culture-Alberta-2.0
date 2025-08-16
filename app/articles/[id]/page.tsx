"use client"

import { useState, useEffect } from 'react'
import { Calendar, Clock, Share2, Bookmark, ArrowLeft, ArrowRight } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { getArticleById, getAllArticles } from '@/lib/articles'
import { use } from 'react'

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
          className="fixed bottom-4 right-4 z-40 transform transition-all duration-500 ease-out opacity-0 translate-y-full scale-95" 
          id="sticky-newsletter"
        >
          <div className="bg-white rounded-xl shadow-2xl border border-gray-200 p-6 max-w-sm">
            {!newsletterSubmitted ? (
              <>
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">Stay in the loop</h3>
                  <button 
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    onClick={() => {
                      const newsletter = document.getElementById('sticky-newsletter')
                      if (newsletter) {
                        newsletter.classList.add('opacity-0', 'translate-y-full', 'scale-95')
                        newsletter.classList.remove('opacity-100', 'translate-y-0', 'scale-100')
                      }
                    }}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Get the latest cultural events and stories delivered to your inbox every week.
                </p>
                <div className="space-y-3">
                  <input
                    type="email"
                    placeholder="Enter your email *"
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      newsletterEmail === '' ? 'border-gray-300' : 'border-green-300'
                    }`}
                  />
                  <select
                    value={newsletterCity}
                    onChange={(e) => setNewsletterCity(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      newsletterCity === '' ? 'border-gray-300' : 'border-green-300'
                    }`}
                  >
                    <option value="">Select your city</option>
                    <option value="calgary">Calgary</option>
                    <option value="edmonton">Edmonton</option>
                    <option value="red-deer">Red Deer</option>
                    <option value="lethbridge">Lethbridge</option>
                    <option value="medicine-hat">Medicine Hat</option>
                    <option value="fort-mcmurray">Fort McMurray</option>
                    <option value="grande-prairie">Grande Prairie</option>
                    <option value="other">Other</option>
                  </select>
                  <button 
                    className={`w-full font-semibold py-2 px-4 rounded-lg transition-colors ${
                      newsletterSubmitting 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-red-600 hover:bg-red-700 text-white'
                    }`}
                    onClick={handleNewsletterSignup}
                    disabled={newsletterSubmitting || !newsletterEmail || !newsletterCity}
                  >
                    {newsletterSubmitting ? 'Subscribing...' : 'Subscribe'}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-3 text-center">
                  Contact us or unsubscribe anytime.
                </p>
              </>
            ) : (
              <div className="text-center py-4">
                <div className="text-green-500 mb-2">
                  <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Successfully subscribed!</h3>
                <p className="text-sm text-gray-600">
                  You'll receive our latest updates in your inbox.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Hero Section */}
        <div className="bg-white">
          <div className="container mx-auto px-4 py-8">
            
            <div className="max-w-7xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                {/* Article Content */}
                <div className="lg:col-span-3 space-y-8">
                  {/* Article Header */}
                  <div className="space-y-6">
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
                      {article.readTime && (
                        <span className="flex items-center gap-1">
                          <Bookmark className="w-4 h-4" />
                          {article.readTime} read
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
                      <p className="text-xl text-gray-600 leading-relaxed max-w-3xl">
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
                  <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-100">
                    <div className="article-content">
                      {article.content ? (
                        <div 
                          dangerouslySetInnerHTML={{ 
                            __html: processContentWithVideos(article.content) 
                          }} 
                        />
                      ) : (
                        <p className="text-gray-600 italic">Content coming soon...</p>
                      )}
                    </div>
                  </div>

                  {/* Article Footer */}
                  <div className="flex items-center justify-end pt-8 border-t border-gray-200">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span>Published {formatDate(article.date || '')}</span>
                    </div>
                  </div>
                </div>

                {/* Sidebar */}
                <div className="lg:col-span-2 space-y-6">
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
                    <h3 className="text-xl font-bold mb-4 text-gray-900">Latest Articles</h3>
                    <div className="space-y-4">
                      {relatedArticles.slice(0, 3).map((relatedArticle) => (
                        <Link 
                          key={relatedArticle.id} 
                          href={`/articles/${relatedArticle.id}`}
                          className="block group"
                        >
                          <div className="flex items-start space-x-4 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                            <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                              <Image
                                src={relatedArticle.imageUrl || "/placeholder.svg"}
                                alt={relatedArticle.title}
                                fill
                                className="object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-sm group-hover:text-blue-600 transition-colors line-clamp-2 leading-tight">
                                {relatedArticle.title}
                              </h4>
                              <p className="text-xs text-gray-500 mt-2">
                                {formatDate(relatedArticle.date || '')}
                              </p>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>

                  {/* Share Article */}
                  <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                    <h3 className="text-lg font-bold mb-4 text-gray-900">Share This Article</h3>
                    <div className="flex space-x-3">
                      <button className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                        <Share2 className="w-4 h-4 inline mr-2" />
                        Share
                      </button>
                      <button className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium">
                        <Bookmark className="w-4 h-4 inline mr-2" />
                        Save
                      </button>
                    </div>
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
