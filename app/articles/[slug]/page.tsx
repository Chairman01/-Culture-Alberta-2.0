import { notFound } from 'next/navigation'
import { Calendar, Clock, Share2, Bookmark, ArrowLeft, ArrowRight } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { getArticleById, getArticleBySlug, getAllArticles, getHomepageArticles } from '@/lib/supabase-articles'
import { getTitleFromUrl } from '@/lib/utils/article-url'
import { getArticleUrl } from '@/lib/utils/article-url'
import { Article } from '@/lib/types/article'
import ArticleNewsletterSignup from '@/components/article-newsletter-signup'

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

import NewsletterSignup from '@/components/newsletter-signup'
import { ArticleContent } from '@/components/article-content'
// import './article-styles.css' // Removed - file was deleted

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params
  const slug = resolvedParams.slug
  
  try {
    console.log('Looking for article with slug:', slug)
    
    // Try to get article by slug first (much faster than fetching all articles)
    let loadedArticle = await getArticleBySlug(slug)
    console.log('Article found by slug:', !!loadedArticle)
    
    // If not found by slug, try by ID (for backward compatibility)
    if (!loadedArticle) {
      loadedArticle = await getArticleById(slug)
      console.log('Article found by ID:', !!loadedArticle)
    }
    
    // If still not found, try to find by title match (last resort)
    if (!loadedArticle) {
      console.log('Trying to find article by title match...')
      // Only fetch all articles as last resort
      const allArticles = await getAllArticles()
      console.log('Total articles available:', allArticles.length)
      
      loadedArticle = allArticles.find(article => {
        // Convert article title to URL format and compare
        const articleUrlTitle = article.title
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '')
          .substring(0, 100)
        
        const matches = articleUrlTitle === slug.toLowerCase()
        if (matches) {
          console.log('Found matching article:', article.title)
        }
        return matches
      }) || null
    }
    
    if (!loadedArticle) {
      console.log('Article not found, showing 404')
      console.log('Available articles:', (await getAllArticles()).map(a => a.title))
      notFound()
    }

    // Load related articles more efficiently - use homepage cache if available
    let relatedArticles: Article[] = []
    try {
      // Try to get homepage articles first (they're usually cached and faster)
      const homepageArticles = await getHomepageArticles()
      
      if (homepageArticles.length > 0) {
        // Use cached homepage articles for better performance
        const sameCategory = homepageArticles
          .filter(a => a.id !== loadedArticle.id && a.category === loadedArticle.category)
          .slice(0, 3)
        
        const otherArticles = homepageArticles
          .filter(a => a.id !== loadedArticle.id && a.category !== loadedArticle.category)
          .slice(0, 3)
        
        // Combine and shuffle to show diverse content
        relatedArticles = [...sameCategory, ...otherArticles]
          .sort(() => Math.random() - 0.5)
          .slice(0, 6)
      }
    } catch (error) {
      console.warn('Failed to load related articles, using empty array:', error)
      relatedArticles = []
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
        return dateString
      }
    }

    return (
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
                    {loadedArticle.title}
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
                      {loadedArticle.category && (
                        <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium">
                          {loadedArticle.category}
                        </span>
                      )}
                      {loadedArticle.date && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {formatDate(loadedArticle.date)}
                        </span>
                      )}
                      {loadedArticle.readTime && (
                        <span className="flex items-center gap-1">
                          <Bookmark className="w-4 h-4" />
                          {loadedArticle.readTime} read
                        </span>
                      )}
                      {loadedArticle.author && (
                        <span className="font-medium">By {loadedArticle.author}</span>
                      )}
                    </div>
                    
                    <h1 className="text-4xl lg:text-5xl font-bold leading-tight text-gray-900">
                      {loadedArticle.title}
                    </h1>
                    
                    {loadedArticle.excerpt && (
                      <p className="text-xl text-gray-600 leading-relaxed max-w-3xl">
                        {loadedArticle.excerpt}
                      </p>
                    )}
                  </div>

                  {/* Featured Image */}
                  {loadedArticle.imageUrl && (
                    <div className="relative w-full h-[400px] lg:h-[500px] rounded-xl overflow-hidden">
                      {loadedArticle.imageUrl.startsWith('data:image') || (loadedArticle.imageUrl.length > 1000 && !loadedArticle.imageUrl.includes('http')) ? (
                        <img
                          src={loadedArticle.imageUrl.startsWith('data:image') ? loadedArticle.imageUrl : `data:image/jpeg;base64,${loadedArticle.imageUrl}`}
                          alt={loadedArticle.title || 'Article image'}
                          className="w-full h-full object-cover"
                          loading="eager"
                          decoding="sync"
                        />
                      ) : (
                        <Image
                          src={loadedArticle.imageUrl}
                          alt={loadedArticle.title || 'Article image'}
                          fill
                          className="object-cover"
                          priority
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          quality={85}
                          placeholder="blur"
                          blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
                        />
                      )}
                    </div>
                  )}



                  {/* Article Content */}
                  <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-100">
                    <div className="article-content">
                      {loadedArticle.content ? (
                        <ArticleContent content={loadedArticle.content} />
                      ) : (
                        <p className="text-gray-600 italic">Content coming soon...</p>
                      )}
                    </div>
                  </div>

                  {/* Article Footer */}
                  <div className="flex items-center justify-end pt-8 border-t border-gray-200">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span>Published {formatDate(loadedArticle.date || '')}</span>
                    </div>
                  </div>

                  {/* Newsletter Signup - Now floating/sticky */}
                  <ArticleNewsletterSignup 
                    articleTitle={loadedArticle.title}
                    articleCategory={loadedArticle.category}
                  />

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
                                      loading="lazy"
                                      decoding="async"
                                    />
                                  ) : (
                                    <Image
                                      src={relatedArticle.imageUrl}
                                      alt={relatedArticle.title}
                                      fill
                                      className="object-cover group-hover:scale-110 transition-transform duration-500"
                                      loading="lazy"
                                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                      quality={75}
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
                                    loading="lazy"
                                    decoding="async"
                                  />
                                ) : (
                                  <Image
                                    src={relatedArticle.imageUrl}
                                    alt={relatedArticle.title}
                                    width={64}
                                    height={64}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                    sizes="64px"
                                    quality={60}
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
    )
  } catch (error) {
    console.error('Error loading article:', error)
    notFound()
  }
}
