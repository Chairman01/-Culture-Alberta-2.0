/**
 * Optimized Calgary Arts & Culture Page
 * 
 * Performance optimizations:
 * - Uses ISR (Incremental Static Regeneration) for fast loads
 * - Server-side data fetching (no client-side API calls)
 * - Optimized images with Next.js Image component
 * - No console.logs in production
 * - Reusable components
 * 
 * Caching strategy:
 * - Revalidates every 300 seconds (5 minutes)
 * - Falls back to cached version if fetch fails
 * 
 * Used as: Calgary Arts & Culture category page (/calgary/arts-culture)
 */

import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft } from 'lucide-react'
import { Footer } from '@/components/footer'
import { PageSEO } from '@/components/seo/page-seo'
import { getArticleUrl } from '@/lib/utils/article-url'
import { getCityArtsCultureArticles } from '@/lib/data/city-category-data'
import { formatRelativeDate } from '@/lib/utils/date'
import { getArticleTitle, getArticleExcerpt, getArticleImage, getArticleCategory } from '@/lib/utils/article-helpers'
import { Article } from '@/lib/types/article'

// PERFORMANCE: Use ISR instead of client-side rendering
// PERFORMANCE: Use ISR with aggressive caching for instant loads
// Revalidates every 2 minutes - faster updates while maintaining speed
export const revalidate = 120

/**
 * Calgary Arts & Culture Page Component
 * 
 * Displays arts & culture articles for Calgary
 */
export default async function CalgaryArtsCulturePage() {
  const articles = await getCityArtsCultureArticles('calgary')

  return (
    <>
      <PageSEO
        title="Calgary Arts & Culture Articles - Culture Alberta"
        description="Explore Calgary's vibrant arts and culture scene. Discover galleries, museums, theaters, and cultural events in Alberta's largest city."
      />
      <div className="flex min-h-screen flex-col">
        <main className="flex-1">
          {/* Header Section */}
          <section className="w-full py-6 bg-purple-50">
            <div className="container mx-auto px-4 md:px-6">
              <div className="flex items-center gap-4 mb-4">
                <Link 
                  href="/calgary" 
                  className="flex items-center gap-2 text-red-600 hover:text-red-700 font-medium transition-colors"
                  aria-label="Back to Calgary"
                >
                  <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                  Back to Calgary
                </Link>
              </div>
              <div className="flex flex-col items-center justify-center space-y-2 text-center">
                <div className="space-y-1">
                  <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl text-purple-600">
                    Calgary Arts & Culture
                  </h1>
                  <p className="max-w-[900px] text-muted-foreground md:text-xl mx-auto">
                    Discover {articles.length} articles about Calgary's vibrant arts and culture scene.
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
                    <ArticleCard key={article.id} article={article} />
                  ))}
                </div>
              ) : (
                <EmptyState 
                  icon="🎨"
                  title="No Arts & Culture Articles Found"
                  description="Check back later for new Calgary arts and culture articles."
                />
              )}
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </>
  )
}

/**
 * Article Card Component
 * 
 * Reusable card component for displaying articles
 * 
 * @param article - Article object to display
 */
function ArticleCard({ article }: { article: Article }) {
  return (
    <Link href={getArticleUrl(article)} className="group block">
      <article className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300">
        <div className="aspect-[4/3] w-full bg-gray-200 relative overflow-hidden">
          <Image
            src={getArticleImage(article)}
            alt={getArticleTitle(article)}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
            loading="lazy"
            quality={75}
          />
        </div>
        <div className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <span className="rounded-full bg-purple-100 text-purple-800 px-2.5 py-0.5 text-xs font-semibold">
              {getArticleCategory(article)}
            </span>
            <time dateTime={article.date || article.createdAt} className="text-xs">
              {formatRelativeDate(article.date || article.createdAt)}
            </time>
          </div>
          <h3 className="font-bold text-lg group-hover:text-purple-600 transition-colors duration-300 line-clamp-2 leading-tight mb-2">
            {getArticleTitle(article)}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-3">
            {getArticleExcerpt(article, 100)}
          </p>
        </div>
      </article>
    </Link>
  )
}

/**
 * Empty State Component
 * 
 * @param icon - Emoji or icon to display
 * @param title - Empty state title
 * @param description - Empty state description
 */
function EmptyState({ 
  icon, 
  title, 
  description 
}: { 
  icon: string
  title: string
  description: string 
}) {
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
        <span className="text-2xl" aria-hidden="true">{icon}</span>
      </div>
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-gray-600 text-sm">{description}</p>
    </div>
  )
}
