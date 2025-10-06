import Link from "next/link"
import Image from "next/image"
import { getAllArticles } from "@/lib/articles"
import NewsletterSignup from "@/components/newsletter-signup"
import { Article } from "@/lib/types/article"
import { ArrowRight, Clock, MapPin } from "lucide-react"
import { getArticleUrl } from '@/lib/utils/article-url'

interface ExtendedArticle extends Article {
  description?: string;
}

export default async function FoodDrinkPage() {
  console.log('🔄 Loading Food & Drink articles...')
  let allArticles: ExtendedArticle[] = []
  
  // ROBUST FALLBACK: Try to get articles with error handling
  try {
    allArticles = await getAllArticles()
    console.log(`✅ All articles loaded: ${allArticles.length}`)
  } catch (error) {
    console.error('❌ Failed to load articles:', error)
    // Create fallback content to prevent empty page
    allArticles = [{
      id: 'fallback-food-drink',
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
      status: 'published'
    }]
  }
  
  // Filter for food & drink related articles - now supports multiple categories
  const foodArticles: ExtendedArticle[] = allArticles
    .filter(article => {
      // Check main category
      const hasFoodCategory = article.category?.toLowerCase().includes('food') || 
                             article.category?.toLowerCase().includes('drink') ||
                             article.category?.toLowerCase().includes('restaurant') ||
                             article.category?.toLowerCase().includes('cafe') ||
                             article.category?.toLowerCase().includes('brewery') ||
                             article.category?.toLowerCase().includes('food & drink');
      
      // Check new categories field
      const hasFoodCategories = article.categories?.some(cat => 
        cat.toLowerCase().includes('food') || 
        cat.toLowerCase().includes('drink') ||
        cat.toLowerCase().includes('restaurant') ||
        cat.toLowerCase().includes('cafe') ||
        cat.toLowerCase().includes('brewery') ||
        cat.toLowerCase().includes('food & drink')
      );
      
      // Check tags
      const hasFoodTags = article.tags?.some(tag => 
        tag.toLowerCase().includes('food') || 
        tag.toLowerCase().includes('drink') ||
        tag.toLowerCase().includes('restaurant') ||
        tag.toLowerCase().includes('cafe') ||
        tag.toLowerCase().includes('brewery') ||
        tag.toLowerCase().includes('food & drink')
      );
      
      return hasFoodCategory || hasFoodCategories || hasFoodTags;
    })
  console.log(`✅ Filtered Food & Drink articles: ${foodArticles.length}`)
  
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

  // Set featured article (first one) and rest of articles
  const featuredArticle = processedFoodArticles.length > 0 ? processedFoodArticles[0] : null
  const articles = processedFoodArticles.length > 0 ? processedFoodArticles.slice(1) : processedFoodArticles

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
                <h2 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
                  {featuredArticle.title}
                </h2>
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
              <div className="relative">
                <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl">
                  <Image
                    src={featuredArticle.imageUrl || "/placeholder.svg"}
                    alt={featuredArticle.title}
                    fill
                    className="object-cover"
                    priority
                    loading="lazy"
                  />
                </div>
              </div>
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
                <div className="bg-orange-100 px-3 py-1 rounded-full">
                  <span className="text-orange-700 font-medium text-sm">
                    {articles.length} articles
                  </span>
                </div>
              </div>

              <div className="grid gap-8">
                {articles.map((article) => (
                  <Link key={article.id} href={getArticleUrl(article)} className="group">
                    <article className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="relative aspect-[4/3]">
                          <Image
                            src={article.imageUrl || "/placeholder.svg"}
                            alt={article.title}
                            fill
                            className="object-cover"
                            loading="lazy"
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

              {/* Categories - Dynamic from actual articles */}
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Categories</h3>
                <div className="space-y-3">
                  {Array.from(new Set(articles.map(a => a.category).filter(Boolean))).slice(0, 5).map((category) => (
                    <Link 
                      key={category}
                      href={`/food-drink?category=${category?.toLowerCase()}`}
                      className="block text-gray-600 hover:text-orange-600 transition-colors py-2 border-b border-gray-100 last:border-b-0"
                    >
                      {category}
                    </Link>
                  ))}
                  {articles.length === 0 && (
                    <p className="text-gray-500 text-sm">No categories available yet</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}
