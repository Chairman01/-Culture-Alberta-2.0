"use client"

import { useState, useEffect } from 'react'
import { Calendar, Clock, Share2, Bookmark, ArrowLeft, ArrowRight } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { getArticleById, getArticleBySlug, getAllArticles, getHomepageArticles } from '@/lib/supabase-articles'
import { use } from 'react'
import { getArticleUrl } from '@/lib/utils/article-url'

import { Article } from '@/lib/types/article'

// Function to process content and convert YouTube URLs to embedded videos
const processContentWithVideos = (content: string) => {
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
import { ArticleContent } from '@/components/article-content'
// import './article-styles.css' // Removed - file was deleted

export default function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const router = useRouter()
  const resolvedParams = use(params)
  const [slug, setSlug] = useState<string>("")
  
  // Handle async params
  useEffect(() => {
    setSlug(resolvedParams.slug)
  }, [resolvedParams.slug])
  
  const [article, setArticle] = useState<Article | null>(null)
  const [relatedArticles, setRelatedArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [newsletterEmail, setNewsletterEmail] = useState('')
  const [newsletterCity, setNewsletterCity] = useState('')
  const [newsletterSubmitting, setNewsletterSubmitting] = useState(false)
  const [newsletterSubmitted, setNewsletterSubmitted] = useState(false)

  useEffect(() => {
    async function loadArticle() {
      if (!slug) {
        setLoading(false)
        return
      }
      
      try {
        setLoading(true)
        
        // Try to load by slug first, then fallback to ID
        let loadedArticle = await getArticleBySlug(slug)
        
        // If not found by slug, try by ID (for backward compatibility)
        if (!loadedArticle) {
          loadedArticle = await getArticleById(slug)
        }
        
        if (loadedArticle) {
          setArticle(loadedArticle)
          
          // Track article view
          trackArticleView(loadedArticle.id, loadedArticle.title)
          
          // Load related articles more efficiently - use homepage cache if available
          try {
            // Try to get homepage articles first (they're usually cached)
            const homepageArticles = await getHomepageArticles()
            const allArticles = homepageArticles.length > 0 ? homepageArticles : await getAllArticles()
            
            const sameCategory = allArticles
              .filter(a => a.id !== loadedArticle.id && a.category === loadedArticle.category)
              .slice(0, 3)
            
            const otherArticles = allArticles
              .filter(a => a.id !== loadedArticle.id && a.category !== loadedArticle.category)
              .slice(0, 3)
            
            // Combine and shuffle to show diverse content
            const related = [...sameCategory, ...otherArticles]
              .sort(() => Math.random() - 0.5)
              .slice(0, 6)
            
            setRelatedArticles(related)
          } catch (error) {
            console.warn('Failed to load related articles, using empty array:', error)
            setRelatedArticles([])
          }
          
          // Show newsletter popup after 3 seconds
          setTimeout(() => {
            const newsletter = document.getElementById('sticky-newsletter')
            if (newsletter) {
              newsletter.classList.remove('opacity-0', 'translate-y-full', 'scale-95')
              newsletter.classList.add('opacity-100', 'translate-y-0', 'scale-100')
            }
          }, 3000)
        }
      } catch (error) {
        console.error('Error loading article:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadArticle()
  }, [slug])

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    } catch {
      return dateString
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
      <div className="min-h-screen bg-gray-50">
        {/* Show blank loading state instead of spinner */}
      </div>
    )
  }

  if (!article) {
    // Instead of showing error message, redirect to homepage or show blank
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Show blank state instead of error message */}
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
                      {article.imageUrl.startsWith('data:image') || (article.imageUrl.length > 1000 && !article.imageUrl.includes('http')) ? (
                        <img
                          src={article.imageUrl.startsWith('data:image') ? article.imageUrl : `data:image/jpeg;base64,${article.imageUrl}`}
                          alt={article.title || 'Article image'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Image
                          src={article.imageUrl}
                          alt={article.title || 'Article image'}
                          fill
                          className="object-cover"
                          priority
                        />
                      )}
                    </div>
                  )}



                  {/* Article Content */}
                  <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-100">
                    <div className="article-content">
                      {article.content ? (
                        <ArticleContent content={article.content} />
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

                  {/* More Articles Section */}
                  {relatedArticles.length > 0 && (
                    <div className="mt-16 pt-12 border-t border-gray-200">
                      <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">More Articles</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {relatedArticles.slice(0, 6).map((relatedArticle) => (
                          <Link 
                            key={relatedArticle.id} 
                            href={getArticleUrl(relatedArticle)}
                            className="group block"
                          >
                            <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                              <div className="aspect-[16/10] w-full bg-gray-200 relative overflow-hidden">
                                {relatedArticle.imageUrl ? (
                                  relatedArticle.imageUrl.startsWith('data:image') || (relatedArticle.imageUrl.length > 1000 && !relatedArticle.imageUrl.includes('http')) ? (
                                    <img
                                      src={relatedArticle.imageUrl.startsWith('data:image') ? relatedArticle.imageUrl : `data:image/jpeg;base64,${relatedArticle.imageUrl}`}
                                      alt={relatedArticle.title}
                                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                    />
                                  ) : (
                                    <Image
                                      src={relatedArticle.imageUrl}
                                      alt={relatedArticle.title}
                                      fill
                                      className="object-cover group-hover:scale-110 transition-transform duration-500"
                                    />
                                  )
                                ) : (
                                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                    <span className="text-gray-400 text-lg">No Image</span>
                                  </div>
                                )}
                                {/* Bookmark icon overlay */}
                                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                  <div className="bg-white/90 backdrop-blur-sm rounded-full p-2 shadow-lg">
                                    <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                    </svg>
                                  </div>
                                </div>
                              </div>
                              <div className="p-6">
                                <div className="flex items-center gap-3 text-sm text-gray-500 mb-3">
                                  <span className="bg-blue-100 text-blue-800 px-3 py-1.5 rounded-full font-medium text-sm">
                                    {relatedArticle.category}
                                  </span>
                                  {relatedArticle.date && (
                                    <span className="font-medium">{formatDate(relatedArticle.date)}</span>
                                  )}
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2 mb-3 leading-tight">
                                  {relatedArticle.title}
                                </h3>
                                {relatedArticle.excerpt && (
                                  <p className="text-gray-600 line-clamp-3 leading-relaxed">
                                    {relatedArticle.excerpt}
                                  </p>
                                )}
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
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
                          href={getArticleUrl(relatedArticle)}
                          className="group block"
                        >
                          <div className="flex gap-3">
                            <div className="flex-shrink-0 w-16 h-16 bg-gray-200 rounded-lg overflow-hidden">
                              {relatedArticle.imageUrl ? (
                                relatedArticle.imageUrl.startsWith('data:image') || (relatedArticle.imageUrl.length > 1000 && !relatedArticle.imageUrl.includes('http')) ? (
                                  <img
                                    src={relatedArticle.imageUrl.startsWith('data:image') ? relatedArticle.imageUrl : `data:image/jpeg;base64,${relatedArticle.imageUrl}`}
                                    alt={relatedArticle.title}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <Image
                                    src={relatedArticle.imageUrl}
                                    alt={relatedArticle.title}
                                    width={64}
                                    height={64}
                                    className="w-full h-full object-cover"
                                  />
                                )
                              ) : (
                                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                  <span className="text-gray-400 text-xs">No Image</span>
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                                {relatedArticle.title}
                              </h4>
                              <p className="text-xs text-gray-500 mt-1">
                                {relatedArticle.category}
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
        </div>

      </div>
    </>
  )
}
