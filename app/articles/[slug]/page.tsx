import { notFound, redirect } from 'next/navigation'
import { Calendar, Clock, Share2, Bookmark, ArrowLeft, ArrowRight } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { getArticleById, getArticleBySlug } from '@/lib/supabase-articles'
import { getAllArticles } from '@/lib/articles'
import { getFastArticleBySlug, getFastArticles } from '@/lib/fast-articles'
import { getTitleFromUrl } from '@/lib/utils/article-url'
import { getArticleUrl } from '@/lib/utils/article-url'
import { createSlug } from '@/lib/utils/slug'
import { Article } from '@/lib/types/article'
import ArticleNewsletterSignup from '@/components/article-newsletter-signup'

// Force dynamic rendering to use fast fallback system
export const dynamic = 'force-dynamic'
export const revalidate = 0
import { getAllEvents, getEventBySlug } from '@/lib/events'
import { Metadata } from 'next'
// import { ArticleReadingFeatures } from '@/components/article-reading-features' // Removed - causing duplicate newsletter

// Function to process content and convert YouTube URLs to embedded videos
const processContentWithVideos = (content: string) => {
  // Convert YouTube URLs to embedded videos - improved regex to catch more formats
  const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]+)(?:\?[^&\s]*)?/g
  
  let processedContent = content.replace(youtubeRegex, (match, videoId) => {
    // Clean up video ID (remove any query parameters)
    const cleanVideoId = videoId.split('?')[0].split('&')[0]
    
    return `<div class="video-container my-8 rounded-lg overflow-hidden shadow-lg bg-gray-100">
      <div class="relative w-full" style="padding-bottom: 56.25%;">
        <iframe 
          class="absolute top-0 left-0 w-full h-full"
          src="https://www.youtube.com/embed/${cleanVideoId}" 
          title="YouTube video player" 
          frameborder="0" 
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
          allowfullscreen
        ></iframe>
      </div>
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

// import NewsletterSignup from '@/components/newsletter-signup' // Removed - using ArticleNewsletterSignup instead
// Removed ArticleContent import to fix hydration issues
// import './article-styles.css' // Removed - file was deleted

// Generate static params for all published articles
export async function generateStaticParams() {
  try {
    console.log('🔧 Generating static params for articles...')
    const articles = await getAllArticles()
    
    // Only generate params for published articles
    const publishedArticles = articles.filter(article => article.status === 'published')
    
    const params = publishedArticles.map((article) => {
      // Use consistent slug generation
      const slug = createSlug(article.title)
      
      return {
        slug: slug,
      }
    })
    
    console.log(`✅ Generated ${params.length} static params for published articles`)
    return params
  } catch (error) {
    console.error('❌ Error generating static params:', error)
    // Return empty array to prevent build failure
    return []
  }
}

// Generate metadata for social media sharing
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const resolvedParams = await params
  const slug = resolvedParams.slug
  
  try {
    // Load article data for metadata
    let loadedArticle = await getFastArticleBySlug(slug)
    
    if (!loadedArticle) {
      loadedArticle = await getArticleBySlug(slug)
    }
    
    if (!loadedArticle) {
      loadedArticle = await getArticleById(slug)
    }
    
    if (!loadedArticle) {
      return {
        title: 'Article Not Found | Culture Alberta',
        description: 'The requested article could not be found.',
      }
    }
    
    const fullTitle = loadedArticle.title.includes('Culture Alberta') ? loadedArticle.title : `${loadedArticle.title} | Culture Alberta`
    const description = loadedArticle.excerpt || loadedArticle.description || `Read about ${loadedArticle.title} on Culture Alberta`
    const fullUrl = `https://www.culturealberta.com/articles/${slug}`
    
    // Handle image URL properly - use article image if available, otherwise use default
    let articleImage = loadedArticle.imageUrl || '/images/culture-alberta-og.jpg'
    
    // Ensure image URL is absolute
    const absoluteImageUrl = articleImage.startsWith('http') 
      ? articleImage 
      : articleImage.startsWith('data:image')
      ? articleImage
      : `https://www.culturealberta.com${articleImage}`
    
    // Debug logging for metadata
    console.log('Article Metadata Debug:', {
      title: fullTitle,
      description: description,
      image: absoluteImageUrl,
      url: fullUrl,
      originalImage: loadedArticle.imageUrl
    })
    
    return {
      title: fullTitle,
      description: description,
      keywords: [...(loadedArticle.tags || []), loadedArticle.category, 'Alberta', 'Culture'].filter(Boolean).join(', '),
      authors: [{ name: loadedArticle.author || 'Culture Alberta' }],
      openGraph: {
        type: 'article',
        title: fullTitle,
        description: description,
        url: fullUrl,
        images: [
          {
            url: absoluteImageUrl,
            width: 1200,
            height: 630,
            alt: loadedArticle.title,
          }
        ],
        siteName: 'Culture Alberta',
        locale: 'en_CA',
        publishedTime: loadedArticle.date,
        modifiedTime: loadedArticle.updatedAt || loadedArticle.date,
        authors: [loadedArticle.author || 'Culture Alberta'],
        section: loadedArticle.category,
        tags: loadedArticle.tags || [],
      },
      twitter: {
        card: 'summary_large_image',
        title: fullTitle,
        description: description,
        images: [absoluteImageUrl],
        site: '@culturealberta',
        creator: '@culturealberta',
      },
      alternates: {
        canonical: fullUrl,
      },
      other: {
        'article:author': loadedArticle.author || 'Culture Alberta',
        'article:section': loadedArticle.category,
        'article:published_time': loadedArticle.date,
        'article:modified_time': loadedArticle.updatedAt || loadedArticle.date,
      }
    }
  } catch (error) {
    console.error('Error generating metadata:', error)
    return {
      title: 'Article | Culture Alberta',
      description: 'Read the latest articles on Culture Alberta.',
    }
  }
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params
  const slug = resolvedParams.slug
  
  try {
    console.log('🚀 Loading article:', slug)
    console.log('📄 Individual article page reached - using fast fallback system')
    
    // PERFORMANCE FIX: Use ONLY fast cache for instant loading
    let loadedArticle = await getFastArticleBySlug(slug)
    console.log('Fast cache result:', loadedArticle ? 'Found' : 'Not found')
    
    // Skip expensive Supabase fallbacks for instant loading
    
    // Last resort - use fast articles instead of expensive getAllArticles()
    if (!loadedArticle) {
      console.log('Trying fast articles fallback...')
      const fastArticles = await getFastArticles()
      
      // Try multiple matching strategies
      loadedArticle = fastArticles.find(article => {
        // Use consistent slug generation
        const articleSlug = createSlug(article.title)
        
        // Try exact match first
        const exactMatch = articleSlug.toLowerCase() === slug.toLowerCase()
        if (exactMatch) {
          console.log('Found exact matching article:', article.title)
          return true
        }
        
        // Try partial match (in case of URL encoding issues)
        const partialMatch = articleSlug.toLowerCase().includes(slug.toLowerCase()) || 
                           slug.toLowerCase().includes(articleSlug.toLowerCase())
        if (partialMatch) {
          console.log('Found partial matching article:', article.title)
          return true
        }
        
        // Try title match (fallback)
        const titleMatch = article.title.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-') === slug.toLowerCase()
        if (titleMatch) {
          console.log('Found title matching article:', article.title)
          return true
        }
        
        return false
      }) || null
    }
    
    if (!loadedArticle) {
      console.log('❌ Article not found, showing 404')
      console.log('Looking for slug:', slug)
      const fastArticles = await getFastArticles()
      console.log('Available articles:', fastArticles.map(a => a.title))
      console.log('Available slugs:', fastArticles.map(a => createSlug(a.title)))
      
      // Check if this might be an event instead of an article
      console.log('🔍 Article not found, checking if it might be an event...')
      try {
        const allEvents = await getAllEvents()
        const eventSlug = createSlug(slug)
        
        for (const event of allEvents) {
          const eventSlugFromTitle = createSlug(event.title)
          if (eventSlugFromTitle === eventSlug) {
            console.log(`🎯 Found matching event: ${event.title}`)
            console.log(`🎯 Redirecting to: /events/${eventSlug}`)
            redirect(`/events/${eventSlug}`)
          }
        }
      } catch (error) {
        console.warn('Failed to check events:', error)
      }
      
      notFound()
    }
    
    console.log('✅ Article loaded successfully:', loadedArticle.title)

    // Article loaded successfully

    // Load related articles more efficiently - use homepage cache if available
    let relatedArticles: Article[] = []
    try {
      // Try to get homepage articles first (they're usually cached and faster)
      const homepageArticles = await getAllArticles()
      console.log('🔍 Homepage articles loaded:', homepageArticles.length)
      
      if (homepageArticles.length > 0) {
        // Use cached homepage articles for better performance
        const sameCategory = homepageArticles
          .filter(a => a.id !== loadedArticle.id && a.category === loadedArticle.category)
          .slice(0, 3)
        
        const otherArticles = homepageArticles
          .filter(a => a.id !== loadedArticle.id && a.category !== loadedArticle.category)
          .slice(0, 3)
        
        console.log('🔍 Same category articles:', sameCategory.length)
        console.log('🔍 Other category articles:', otherArticles.length)
        
        // Combine and shuffle to show diverse content
        relatedArticles = [...sameCategory, ...otherArticles]
          .sort(() => Math.random() - 0.5)
          .slice(0, 6)
        
        console.log('🔍 Final related articles:', relatedArticles.length)
      }
    } catch (error) {
      console.warn('Failed to load related articles, using empty array:', error)
      relatedArticles = []
    }

    // Fallback: if no related articles, load some recent articles
    if (relatedArticles.length === 0) {
      try {
        console.log('🔍 No related articles found, loading fallback articles...')
        const fallbackArticles = await getAllArticles()
        relatedArticles = fallbackArticles
          .filter(a => a.id !== loadedArticle.id && a.status === 'published')
          .slice(0, 6)
        console.log('🔍 Fallback articles loaded:', relatedArticles.length)
      } catch (error) {
        console.warn('Failed to load fallback articles:', error)
      }
    }

    const formatDate = (dateString: string) => {
      try {
        const date = new Date(dateString)
        const year = date.getFullYear()
        const month = date.getMonth()
        const day = date.getDate()
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December']
        return `${monthNames[month]} ${day}, ${year}`
      } catch {
        return dateString
      }
    }

    return (
      <>
        {/* Metadata is now handled by generateMetadata function */}
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
                suppressHydrationWarning={true}
              ></div>
            </div>
          </div>
        </div>

        {/* Reading Progress Script - Client Side Only */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if (typeof window === 'undefined') return;
                
                // Wait for DOM to be ready
                if (document.readyState === 'loading') {
                  document.addEventListener('DOMContentLoaded', initReadingProgress);
                } else {
                  initReadingProgress();
                }
                
                function initReadingProgress() {
                  window.addEventListener('scroll', function() {
                    const article = document.querySelector('.article-content');
                    if (!article) return;
                    
                    const articleTop = article.offsetTop;
                    const articleHeight = article.offsetHeight;
                    const scrollTop = window.pageYOffset;
                    
                    let progress = 0;
                    if (scrollTop >= articleTop) {
                      const scrolled = Math.min(scrollTop - articleTop, articleHeight);
                      progress = Math.min((scrolled / articleHeight) * 100, 100);
                    }
                    
                    const progressBar = document.getElementById('header-reading-progress');
                    if (progressBar) {
                      progressBar.style.width = progress + '%';
                    }
                  });
                }
              })();
            `
          }}
        />

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
                      {loadedArticle.content && 
                       typeof loadedArticle.content === 'string' && 
                       loadedArticle.content.trim().length > 10 && 
                       loadedArticle.content !== 'null' && 
                       loadedArticle.content !== 'undefined' ? (
                        <div 
                          className="prose prose-lg max-w-none article-content-wrapper"
                          dangerouslySetInnerHTML={{ __html: loadedArticle.content }}
                          suppressHydrationWarning={true}
                        />
                      ) : loadedArticle.excerpt ? (
                        <div className="space-y-6">
                          <div className="prose prose-lg max-w-none">
                            <div className="text-lg text-gray-700 leading-relaxed">
                              {loadedArticle.excerpt.split('\n').map((paragraph: string, index: number) => (
                                <p key={index} className="mb-4">
                                  {paragraph}
                                </p>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-2xl">📝</span>
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">Article Content Coming Soon</h3>
                          <p className="text-gray-600 max-w-md mx-auto">
                            We're working on bringing you the complete article. Check back soon for the full story!
                          </p>
                        </div>
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
                  {/* Newsletter signup removed - using ArticleNewsletterSignup instead */}

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
      </>
    )
  } catch (error) {
    console.error('Error loading article:', error)
    notFound()
  }
}
