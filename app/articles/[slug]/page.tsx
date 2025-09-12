import { Calendar, Clock, Share2, Bookmark, ArrowLeft, ArrowRight } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { getArticleById, getArticleBySlug, getAllArticles } from '@/lib/supabase-articles'
import { getTitleFromUrl } from '@/lib/utils/article-url'
import { getArticleUrl } from '@/lib/utils/article-url'
import { Article } from '@/lib/types/article'
import { PageTracker } from '@/components/analytics/page-tracker'
import NewsletterSignup from '@/components/newsletter-signup'
import { ArticleContent } from '@/components/article-content'

// Static generation with revalidation
export const revalidate = 60 // Revalidate every 60 seconds
export const dynamic = 'force-static'

// Function to process content and convert YouTube URLs to embedded videos
const processContentWithVideos = (content: string) => {
  // Convert YouTube URLs to embedded videos
  const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/g
  
  let processedContent = content.replace(youtubeRegex, (match, videoId) => {
    return `<div class="youtube-embed my-8">
      <iframe 
        width="560" 
        height="315" 
        src="https://www.youtube.com/embed/${videoId}" 
        title="YouTube video player" 
        frameborder="0" 
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
        allowfullscreen
        class="w-full max-w-2xl mx-auto rounded-lg shadow-lg"
      ></iframe>
    </div>`
  })
  
  // Process paragraphs for better formatting
  processedContent = processedContent
    .split('\n\n')
    .map(paragraph => {
      paragraph = paragraph.trim()
      if (!paragraph) return ''
      
      // Handle numbered lists (1., 2., etc.)
      if (/^\d+\.\s/.test(paragraph)) {
        return `<li class="mb-2">${paragraph.replace(/^\d+\.\s/, '')}</li>`
      }
      // Handle bullet points (-, *, •)
      else if (/^[-*•]\s/.test(paragraph)) {
        return `<li class="mb-2">${paragraph.replace(/^[-*•]\s/, '')}</li>`
      }
      // Handle headings (## Heading)
      else if (/^##\s/.test(paragraph)) {
        return `<h2 class="text-2xl font-bold text-gray-900 mt-8 mb-4">${paragraph.replace(/^##\s/, '')}</h2>`
      }
      // Handle subheadings (### Heading)
      else if (/^###\s/.test(paragraph)) {
        return `<h3 class="text-xl font-semibold text-gray-900 mt-6 mb-3">${paragraph.replace(/^###\s/, '')}</h3>`
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

// Server-side data loading
async function getArticleData(slug: string) {
  try {
    console.log('=== Loading article data for:', slug)
    
    // Try to get article by slug first (much faster than fetching all articles)
    let article = await getArticleBySlug(slug)
    
    // If not found by slug, try by ID (for backward compatibility)
    if (!article) {
      article = await getArticleById(slug)
    }
    
    // If still not found, try to find by title match (last resort)
    if (!article) {
      const allArticles = await getAllArticles()
      article = allArticles.find(article => {
        const articleUrlTitle = article.title
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '')
          .substring(0, 100)
        return articleUrlTitle === slug.toLowerCase()
      }) || null
    }
    
    if (!article) {
      return { article: null, relatedArticles: [] }
    }
    
    // Get related articles (same category, excluding current article)
    const allArticles = await getAllArticles()
    const relatedArticles = allArticles
      .filter(a => a.id !== article!.id && a.category === article!.category)
      .slice(0, 3)
    
    return { article, relatedArticles }
  } catch (error) {
    console.error('Error loading article data:', error)
    return { article: null, relatedArticles: [] }
  }
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params
  const slug = resolvedParams.slug
  
  const { article, relatedArticles } = await getArticleData(slug)
  
  if (!article) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Article Not Found</h1>
          <p className="text-gray-600 mb-4">The article you're looking for doesn't exist.</p>
          <Link href="/" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            Back to Home
          </Link>
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
      return 'Recently'
    }
  }

  const getReadTime = (content: string) => {
    const wordsPerMinute = 200
    const wordCount = content.split(/\s+/).length
    const readTime = Math.ceil(wordCount / wordsPerMinute)
    return `${readTime} min read`
  }

  const processedContent = processContentWithVideos(article.content || '')

  return (
    <>
      <PageTracker title={article.title} />
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Link href="/" className="text-blue-600 hover:text-blue-700 flex items-center gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  <span className="font-medium">Back to Home</span>
                </Link>
                <div className="hidden md:block">
                  <span className="text-sm text-gray-500">{article.category}</span>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <button className="p-2 text-gray-500 hover:text-gray-700">
                  <Share2 className="w-5 h-5" />
                </button>
                <button className="p-2 text-gray-500 hover:text-gray-700">
                  <Bookmark className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            {/* Article Header */}
            <div className="mb-8">
              <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                <span className="rounded-full bg-blue-100 text-blue-800 px-3 py-1.5 font-medium">
                  {article.category}
                </span>
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDate(article.createdAt)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{getReadTime(article.content || '')}</span>
                </div>
              </div>
              
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 leading-tight">
                {article.title}
              </h1>
              
              {article.excerpt && (
                <p className="text-xl text-gray-600 leading-relaxed mb-6">
                  {article.excerpt}
                </p>
              )}
              
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span>By {article.author || 'Culture Alberta'}</span>
                {article.location && (
                  <span>• {article.location}</span>
                )}
              </div>
            </div>

            {/* Featured Image */}
            {article.imageUrl && (
              <div className="mb-8">
                <div className="relative w-full h-[400px] lg:h-[500px] rounded-xl overflow-hidden">
                  <Image
                    src={article.imageUrl}
                    alt={article.title}
                    fill
                    className="object-cover"
                    priority
                    loading="eager"
                    decoding="sync"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 70vw"
                    quality={90}
                    placeholder="blur"
                    blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
                  />
                </div>
              </div>
            )}

            {/* Article Content */}
            <div className="prose prose-lg max-w-none">
              <ArticleContent content={processedContent} />
            </div>

            {/* Related Articles */}
            {relatedArticles.length > 0 && (
              <div className="mt-16">
                <h2 className="text-3xl font-bold text-gray-900 mb-8">Related Articles</h2>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {relatedArticles.map((relatedArticle) => (
                    <Link key={relatedArticle.id} href={getArticleUrl(relatedArticle)} className="group block">
                      <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300">
                        <div className="aspect-[16/9] w-full bg-gray-200 relative">
                          <Image
                            src={relatedArticle.imageUrl || '/placeholder.svg'}
                            alt={relatedArticle.title}
                            width={400}
                            height={225}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            quality={75}
                          />
                        </div>
                        <div className="p-4">
                          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                            <span className="rounded-full bg-gray-100 px-3 py-1.5 font-medium">
                              {relatedArticle.category}
                            </span>
                            <span className="font-medium">{formatDate(relatedArticle.createdAt)}</span>
                          </div>
                          <h3 className="font-display font-bold text-xl group-hover:text-gray-600 transition-colors duration-300 line-clamp-2 leading-tight">
                            {relatedArticle.title}
                          </h3>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Newsletter Signup */}
            <div className="mt-16">
              <NewsletterSignup 
                title="Stay Updated"
                description="Get the latest cultural news and events from across Alberta delivered to your inbox."
              />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}