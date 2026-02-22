import { getArticlesWithFallback } from "@/lib/fallback-articles"
import { Article } from "@/lib/types/article"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, BookOpen } from "lucide-react"
import { getArticleUrl } from '@/lib/utils/article-url'
import {
  isGuideArticle,
  articleMatchesCity,
  getArticleLocationLabel,
  NEIGHBORHOOD_GUIDE_CITIES,
} from '@/lib/utils/article-filters'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Alberta Guides - How-To & Discover | Culture Alberta',
  description: "Your guides to Alberta. How to explore Edmonton, Calgary, Red Deer, and more. Neighborhood highlights, local tips, and discover guides.",
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface PageProps {
  searchParams: Promise<{ city?: string }>
}

export default async function AllGuidesPage({ searchParams }: PageProps) {
  const { city: cityParam } = await searchParams
  const cityFilter = cityParam || ''

  const allContent = await getArticlesWithFallback()
  const articles = allContent
    .filter(item => item.type !== 'event' && item.type !== 'Event')
    .filter(isGuideArticle)
    .filter(a => articleMatchesCity(a, cityFilter))
    .sort((a, b) => new Date(b.createdAt || b.date || 0).getTime() - new Date(a.createdAt || a.date || 0).getTime())

  const activeLabel = NEIGHBORHOOD_GUIDE_CITIES.find(c => c.value === cityFilter)?.label || 'All'

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        {/* Header */}
        <section className="w-full py-16 bg-white">
          <div className="container mx-auto px-4 md:px-6 max-w-4xl">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium mb-8"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
            <div className="flex items-center gap-3 mb-4">
              <BookOpen className="w-6 h-6 text-gray-500" />
              <span className="text-sm font-medium uppercase tracking-widest text-gray-500">Trip Ideas</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900">
              Alberta Guides
            </h1>
            <p className="mt-6 text-lg text-gray-600 leading-relaxed max-w-2xl">
              Your guides to exploring Alberta. From Edmonton and Calgary to Red Deer and beyond — discover how to get the most out of each region.
            </p>

            {/* City filter */}
            <div className="mt-8 flex flex-wrap gap-2">
              {NEIGHBORHOOD_GUIDE_CITIES.map(({ value, label }) => (
                <Link
                  key={value || 'all'}
                  href={value ? `/guides?city=${value}` : '/guides'}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    cityFilter === value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Guide Cards */}
        <section className="w-full py-12 bg-gray-50">
          <div className="container mx-auto px-4 md:px-6">
            <p className="text-sm text-gray-500 mb-6">
              Showing {articles.length} guide{articles.length !== 1 ? 's' : ''} {activeLabel !== 'All' ? `in ${activeLabel}` : 'across Alberta'}
            </p>
            {articles.length > 0 ? (
              <div className="space-y-4 max-w-3xl">
                {articles.map((article, index) => (
                  <Link key={article.id} href={getArticleUrl(article)} className="group block">
                    <div className="flex gap-4 md:gap-6 p-4 md:p-5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-md transition-all duration-200">
                      <div className="flex-shrink-0 w-12 h-12 md:w-14 md:h-14 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-lg group-hover:bg-slate-200 transition-colors">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg text-slate-900 group-hover:text-blue-600 transition-colors">
                              {article.title}
                            </h3>
                            <p className="text-slate-600 text-sm mt-1 line-clamp-2">{article.excerpt}</p>
                            <div className="flex items-center gap-2 text-xs text-slate-500 mt-2">
                              <span>{getArticleLocationLabel(article)}</span>
                            </div>
                          </div>
                          {article.imageUrl && (
                            <div className="flex-shrink-0 w-24 h-24 sm:w-28 sm:h-28 rounded-lg overflow-hidden bg-slate-100">
                              <Image
                                src={article.imageUrl}
                                alt=""
                                width={112}
                                height={112}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-24 bg-white rounded-lg border border-gray-200">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <BookOpen className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="font-semibold text-xl text-gray-900 mb-2">
                  {activeLabel !== 'All' ? `No Guide Articles in ${activeLabel}` : 'No Guide Articles Yet'}
                </h3>
                <p className="text-gray-600 max-w-md mx-auto mb-8">
                  Create articles with the <strong>Guide</strong> category, tag, or type to see them here.
                </p>
                <Link
                  href="/guides"
                  className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
                >
                  View all guides
                </Link>
              </div>
            )}
            {articles.length > 0 && (
              <div className="mt-16 pt-12 border-t border-gray-200">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Discover more</h3>
                <div className="flex flex-wrap gap-4">
                  <Link href="/edmonton" className="text-blue-600 hover:text-blue-700 font-medium">Edmonton</Link>
                  <Link href="/calgary" className="text-blue-600 hover:text-blue-700 font-medium">Calgary</Link>
                  <Link href="/alberta" className="text-blue-600 hover:text-blue-700 font-medium">Around Alberta</Link>
                  <Link href="/neighborhoods" className="text-blue-600 hover:text-blue-700 font-medium">All Neighborhoods</Link>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}
