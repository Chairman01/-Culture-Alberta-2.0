import { getCityArticlesWithFallback } from "@/lib/fallback-articles"
import { Article } from "@/lib/types/article"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { getArticleUrl } from '@/lib/utils/article-url'
import { Metadata } from 'next'

// Proper App Router metadata export
export const metadata: Metadata = {
  title: 'All Calgary Articles - Culture Alberta',
  description: "Browse all articles about Calgary, Alberta. Discover the latest news, events, and stories from Alberta's largest city.",
}

// Force dynamic rendering to prevent oversized static generation
export const dynamic = 'force-dynamic'
export const revalidate = 0

interface CalgaryArticle extends Article {
  type?: string;
  location?: string;
}

export default async function CalgaryAllArticlesPage() {
  // Get Calgary articles with fallback to articles.json (exclude events)
  const allCalgaryContent = await getCityArticlesWithFallback('calgary') as CalgaryArticle[]
  const articles = allCalgaryContent.filter(item => item.type !== 'event' && item.type !== 'Event')

  console.log(`✅ Calgary all articles loaded: ${articles.length} (filtered out ${allCalgaryContent.length - articles.length} events)`)

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      const now = new Date()
      const diffTime = Math.abs(now.getTime() - date.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      if (diffDays === 1) return '1 day ago'
      if (diffDays < 7) return `${diffDays} days ago`
      if (diffDays < 14) return '1 week ago'
      if (diffDays < 21) return '2 weeks ago'
      return '3 weeks ago'
    } catch {
      return 'Recently'
    }
  }

  return (
    <>
      {/* Metadata is now handled by the metadata export above */}
      <div className="flex min-h-screen flex-col">
        <main className="flex-1">
          {/* Header Section */}
          <section className="w-full py-6 bg-red-50">
            <div className="container mx-auto px-4 md:px-6">
              <div className="flex items-center gap-4 mb-4">
                <Link
                  href="/calgary"
                  className="flex items-center gap-2 text-red-600 hover:text-red-700 font-medium"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Calgary
                </Link>
              </div>
              <div className="flex flex-col items-center justify-center space-y-2 text-center">
                <div className="space-y-1">
                  <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl text-red-600">All Calgary Articles</h1>
                  <p className="max-w-[900px] text-muted-foreground md:text-xl mx-auto">
                    Discover all {articles.length} articles about Calgary, Alberta's largest city.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Articles Grid */}
          <section className="w-full py-8">
            <div className="container mx-auto px-4 md:px-6">
              {articles.length > 0 ? (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {articles.map((article) => (
                    <Link key={article.id} href={getArticleUrl(article)} className="group block">
                      <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300">
                        <div className="aspect-[4/3] w-full bg-gray-200 relative">
                          <Image
                            src={article.imageUrl || "/placeholder.svg"}
                            alt={article.title}
                            width={400}
                            height={300}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                        <div className="p-4">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                            <span className="rounded-full bg-red-100 text-red-800 px-2.5 py-0.5 text-xs font-semibold">
                              {article.category}
                            </span>
                            <span>{formatDate(article.date || '')}</span>
                          </div>
                          <h3 className="font-bold text-lg group-hover:text-red-600 transition-colors duration-300 line-clamp-2 leading-tight mb-2">
                            {article.title}
                          </h3>
                          <p className="text-sm text-muted-foreground line-clamp-3">{article.excerpt}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">📰</span>
                  </div>
                  <h3 className="font-semibold text-lg mb-2">No Articles Found</h3>
                  <p className="text-gray-600 text-sm">Check back later for new Calgary articles.</p>
                </div>
              )}
            </div>
          </section>
        </main>
      </div>
    </>
  )
}
