import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { getCultureArticlesWithFallback } from "@/lib/fallback-articles"
import NewsletterSignup from "@/components/newsletter-signup"
import { CultureArticles } from "@/components/culture-articles"
import { Article } from "@/lib/types/article"
import { getArticleUrl } from '@/lib/utils/article-url'
import { ArrowRight, Clock, MapPin, Star, Users, Calendar, Tag, Palette, Music, Theater, Landmark, Heart, Sparkles, Globe, Award } from "lucide-react"

// Enable ISR for better performance
export const revalidate = 120 // 2 minutes

interface ExtendedArticle extends Article {
  description?: string;
}

// Server-side data loading with fallback
async function getCultureData() {
  try {
    console.log('🔄 Loading Culture articles with fallback system...')

    // Get culture articles with fallback to articles.json
    const cultureArticles = await getCultureArticlesWithFallback()
    console.log(`✅ Culture articles loaded: ${cultureArticles.length}`)

    // Map articles to extended format
    const processedCultureArticles = cultureArticles.map(article => ({
      ...article,
      description: article.content,
      category: article.category || 'Culture',
      date: article.date || article.createdAt || new Date().toISOString(),
      imageUrl: article.imageUrl || `/placeholder.svg?width=400&height=300&text=${encodeURIComponent(article.title)}`
    }))

    // Sort by date
    processedCultureArticles.sort((a, b) => {
      return new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()
    })

    // Set featured article (first one)
    const featuredArticle = processedCultureArticles.length > 0 ? processedCultureArticles[0] : null
    const articles = processedCultureArticles.length > 1 ? processedCultureArticles.slice(1) : processedCultureArticles

    return {
      articles,
      featuredArticle
    }
  } catch (error) {
    console.error('❌ Error loading Culture data:', error)

    // CRITICAL: Provide fallback content to prevent empty page
    console.log('🔄 Setting fallback content to prevent empty page')
    const fallbackArticle: ExtendedArticle = {
      id: 'fallback-culture-error',
      title: 'Welcome to Culture',
      excerpt: 'Discover Alberta\'s rich cultural heritage, arts, and community stories.',
      content: 'We\'re working on bringing you amazing cultural content. Check back soon!',
      category: 'Culture',
      categories: ['Culture'],
      location: 'Alberta',
      imageUrl: '/images/culture-fallback.jpg',
      author: 'Culture Alberta',
      date: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      type: 'article',
      status: 'published',
      description: 'We\'re working on bringing you amazing cultural content. Check back soon!'
    }

    return {
      articles: [fallbackArticle],
      featuredArticle: fallbackArticle
    }
  }
}

export default async function CulturePage() {
  const { articles, featuredArticle } = await getCultureData()

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    } catch {
      return 'Recently'
    }
  }

  // Enhanced categories with icons
  const getCategoryIcon = (category: string) => {
    const cat = category.toLowerCase()
    if (cat.includes('art') || cat.includes('painting') || cat.includes('sculpture')) return Palette
    if (cat.includes('music') || cat.includes('concert') || cat.includes('festival')) return Music
    if (cat.includes('theater') || cat.includes('drama') || cat.includes('performance')) return Theater
    if (cat.includes('museum') || cat.includes('gallery') || cat.includes('exhibition')) return Landmark
    if (cat.includes('heritage') || cat.includes('indigenous') || cat.includes('tradition')) return Globe
    if (cat.includes('community') || cat.includes('local')) return Heart
    if (cat.includes('award') || cat.includes('recognition')) return Award
    return Sparkles
  }

  // Get unique categories from actual articles
  const getUniqueCategories = () => {
    const categories = Array.from(new Set(articles.map(a => a.category).filter(Boolean)))
    return [
      { id: 'all', name: 'All Stories', icon: Sparkles },
      ...categories.slice(0, 8).map(cat => ({
        id: cat?.toLowerCase() || '',
        name: cat || 'Culture',
        icon: getCategoryIcon(cat || '')
      }))
    ]
  }

  const categories = getUniqueCategories()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section - Toned Down */}
      <header className="bg-white border-b border-gray-200 py-16">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="flex flex-col items-center justify-center space-y-6 text-center">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                <Palette className="w-5 h-5 text-gray-600" />
              </div>
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                <Music className="w-5 h-5 text-gray-600" />
              </div>
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                <Theater className="w-5 h-5 text-gray-600" />
              </div>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900">
              Alberta's Cultural
              <span className="block text-gray-700">
                Tapestry
              </span>
            </h1>

            <p className="max-w-3xl text-lg text-gray-600 leading-relaxed">
              From Indigenous heritage to contemporary arts, discover the vibrant stories,
              traditions, and creative expressions that make Alberta truly special.
            </p>

            <div className="flex flex-wrap gap-3 justify-center mt-6">
              <div className="bg-gray-100 text-gray-700 px-4 py-2 rounded-full text-sm font-medium">
                Visual Arts
              </div>
              <div className="bg-gray-100 text-gray-700 px-4 py-2 rounded-full text-sm font-medium">
                Music & Festivals
              </div>
              <div className="bg-gray-100 text-gray-700 px-4 py-2 rounded-full text-sm font-medium">
                Theater & Performance
              </div>
              <div className="bg-gray-100 text-gray-700 px-4 py-2 rounded-full text-sm font-medium">
                Museums & Heritage
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Featured Article - Toned Down */}
      {featuredArticle && (
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4 max-w-7xl">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Featured Story</h2>
              <div className="w-16 h-0.5 bg-gray-300 mx-auto"></div>
            </div>

            <div className="bg-white rounded-lg overflow-hidden shadow-md border border-gray-200">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
                <div className="relative aspect-[4/3] lg:aspect-square group">
                  <Image
                    src={featuredArticle.imageUrl || "/placeholder.svg"}
                    alt={featuredArticle.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    priority
                  />
                  <div className="absolute inset-0 bg-black/10"></div>
                  <div className="absolute top-4 left-4">
                    <span className="bg-white text-gray-700 px-3 py-1 rounded-full font-medium text-sm border border-gray-200">
                      Featured
                    </span>
                  </div>
                </div>
                <div className="p-6 lg:p-8 flex flex-col justify-center">
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full font-medium text-sm">
                        {featuredArticle.category}
                      </span>
                      <span className="flex items-center gap-2 text-gray-500">
                        <Calendar className="w-4 h-4" />
                        {formatDate(featuredArticle.date || '')}
                      </span>
                    </div>
                    <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 leading-tight">
                      {featuredArticle.title}
                    </h2>
                    <p className="text-gray-600 leading-relaxed">
                      {featuredArticle.excerpt}
                    </p>
                    <Link
                      href={getArticleUrl(featuredArticle)}
                      className="inline-flex items-center bg-gray-900 text-white px-6 py-2 rounded-md font-medium hover:bg-gray-800 transition-colors group"
                    >
                      Read Full Story
                      <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Category Navigation and Articles Grid - Client Component for Filtering */}
      <CultureArticles articles={articles} />

    </div>
  )
}


