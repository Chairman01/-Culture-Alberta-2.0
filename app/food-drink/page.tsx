import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { getFoodDrinkArticlesWithFallback } from "@/lib/fallback-articles"
import NewsletterSignup from "@/components/newsletter-signup"
import { Article } from "@/lib/types/article"
import { ArrowRight, Clock, MapPin } from "lucide-react"
import { getArticleUrl } from '@/lib/utils/article-url'

// Enable ISR for better performance
export const revalidate = 30 // 30 seconds

interface ExtendedArticle extends Article {
  description?: string;
}

// Server-side data loading with fallback
async function getFoodDrinkData() {
  try {
    console.log('🔄 Loading Food & Drink articles with fallback system...')

    // Get food & drink articles with fallback to articles.json
    const foodArticles = await getFoodDrinkArticlesWithFallback()
    console.log(`✅ Food & Drink articles loaded: ${foodArticles.length}`)

    // Map articles to extended format
    const processedFoodArticles = foodArticles.map(article => ({
      ...article,
      description: article.content,
      category: article.category || 'Food & Drink',
      date: article.date || article.createdAt || new Date().toISOString(),
      imageUrl: article.imageUrl || `/placeholder.svg?width=400&height=300&text=${encodeURIComponent(article.title)}`
    }))

    // Sort articles by newest first
    processedFoodArticles.sort((a, b) => {
      return new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()
    })

    // Set featured article (first one)
    const featuredArticle = processedFoodArticles.length > 0 ? processedFoodArticles[0] : null
    const articles = processedFoodArticles.length > 1 ? processedFoodArticles.slice(1) : processedFoodArticles

    return {
      articles,
      featuredArticle
    }
  } catch (error) {
    console.error('❌ Error loading Food & Drink data:', error)

    // CRITICAL: Provide fallback content to prevent empty page
    console.log('🔄 Setting fallback content to prevent empty page')
    const fallbackArticle: ExtendedArticle = {
      id: 'fallback-food-drink-error',
      title: 'Welcome to Food & Drink',
      excerpt: 'Discover the best restaurants, cafes, and culinary experiences across Alberta.',
      content: 'We\'re working on bringing you amazing food and drink content. Check back soon!',
      category: 'Food & Drink',
      categories: ['Food & Drink'],
      location: 'Alberta',
      imageUrl: '/images/food-drink-fallback.jpg',
      author: 'Culture Alberta',
      date: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      type: 'article',
      status: 'published',
      description: 'We\'re working on bringing you amazing food and drink content. Check back soon!'
    }

    return {
      articles: [fallbackArticle],
      featuredArticle: fallbackArticle
    }
  }
}

export default async function FoodDrinkPage() {
  const { articles, featuredArticle } = await getFoodDrinkData()

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

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-orange-50 to-red-50 py-6">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-2 text-center">
            <div className="space-y-1">
              <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl">Food & Drink</h1>
              <p className="max-w-[900px] text-muted-foreground md:text-xl mx-auto">
                Discover Alberta's vibrant culinary scene, from farm-to-table restaurants to craft breweries and everything in between.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Article */}
      {featuredArticle && (
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4 max-w-7xl">
            <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-12 items-center">
              <div className="space-y-6">
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full font-medium">
                    {featuredArticle.category}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {formatDate(featuredArticle.date || '')}
                  </span>
                </div>
                <Link href={getArticleUrl(featuredArticle)} className="group block">
                  <h2 className="text-4xl md:text-5xl font-bold text-gray-900 group-hover:text-orange-600 transition-colors leading-tight">
                    {featuredArticle.title}
                  </h2>
                </Link>
                <p className="text-xl text-gray-600 leading-relaxed">
                  {featuredArticle.excerpt}
                </p>
                <Link
                  href={getArticleUrl(featuredArticle)}
                  className="inline-flex items-center text-orange-600 hover:text-orange-700 font-semibold text-lg group"
                >
                  Read More
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
              <Link href={getArticleUrl(featuredArticle)} className="group relative block">
                <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl">
                  <Image
                    src={featuredArticle.imageUrl || "/placeholder.svg"}
                    alt={featuredArticle.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    priority
                  />
                </div>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Main Content */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-12">
            {/* Articles Grid */}
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold text-gray-900">Latest Stories</h2>
                <div className="text-sm text-gray-500">
                  {articles.length} articles
                </div>
              </div>

              <div className="grid gap-8">
                {articles.map((article) => (
                  <Link key={article.id} href={getArticleUrl(article)} className="group">
                    <article className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="relative aspect-[4/3] overflow-hidden">
                          <Image
                            src={article.imageUrl || "/placeholder.svg"}
                            alt={article.title}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                        <div className="p-6 space-y-4">
                          <div className="flex items-center gap-3 text-sm text-gray-600">
                            <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full font-medium">
                              {article.category}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {formatDate(article.date || '')}
                            </span>
                          </div>
                          <h3 className="text-2xl font-bold text-gray-900 group-hover:text-orange-600 transition-colors leading-tight">
                            {article.title}
                          </h3>
                          <p className="text-gray-600 leading-relaxed line-clamp-3">
                            {article.excerpt}
                          </p>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <MapPin className="w-4 h-4" />
                            <span>{article.location || 'Alberta'}</span>
                          </div>
                        </div>
                      </div>
                    </article>
                  </Link>
                ))}
              </div>

              {articles.length === 0 && (
                <div className="text-center py-12">
                  <h3 className="text-2xl font-semibold text-gray-900 mb-4">No articles found</h3>
                  <p className="text-gray-600">Check back later for the latest food and drink stories.</p>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-8">
              {/* Newsletter */}
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                <NewsletterSignup
                  title="Stay Hungry"
                  description="Get the latest restaurant reviews, food trends, and dining guides delivered to your inbox."
                  defaultCity=""
                />
              </div>

              {/* Browse by City */}
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Browse by City</h3>
                <div className="space-y-1">
                  {[
                    { name: 'Calgary', href: '/calgary' },
                    { name: 'Edmonton', href: '/edmonton' },
                    { name: 'Lethbridge', href: '/lethbridge' },
                    { name: 'Grande Prairie', href: '/grande-prairie' },
                    { name: 'Red Deer', href: '/red-deer' },
                  ].map((city) => (
                    <Link
                      key={city.name}
                      href={city.href}
                      className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0 text-gray-700 hover:text-orange-600 font-medium transition-colors"
                    >
                      {city.name}
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  ))}
                </div>
              </div>

              {/* Popular Stories */}
              {articles.length > 0 && (
                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Popular Stories</h3>
                  <div className="space-y-4">
                    {articles.slice(0, 4).map((article) => (
                      <Link key={article.id} href={getArticleUrl(article)} className="group flex gap-3">
                        <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
                          <Image
                            src={article.imageUrl || '/placeholder.svg'}
                            alt={article.title}
                            width={64}
                            height={64}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 group-hover:text-orange-600 transition-colors line-clamp-2 leading-tight">
                            {article.title}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">{formatDate(article.date || '')}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}
