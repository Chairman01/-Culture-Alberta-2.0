import { getArticlesWithFallback } from "@/lib/fallback-articles"
import { Article } from "@/lib/types/article"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, MapPin } from "lucide-react"
import { getArticleUrl } from '@/lib/utils/article-url'
import {
  isNeighborhoodArticle,
  articleMatchesCity,
  getArticleLocationLabel,
  NEIGHBORHOOD_GUIDE_CITIES,
} from '@/lib/utils/article-filters'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Alberta Neighborhoods - Discover Communities | Culture Alberta',
  description: "Explore neighborhoods across Alberta. From Edmonton and Calgary to Red Deer, Lethbridge, and more — discover the communities that make Alberta unique.",
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface PageProps {
  searchParams: Promise<{ city?: string }>
}

export default async function AllNeighborhoodsPage({ searchParams }: PageProps) {
  const { city: cityParam } = await searchParams
  const cityFilter = cityParam || ''

  const allContent = await getArticlesWithFallback()
  const articles = allContent
    .filter(item => item.type !== 'event' && item.type !== 'Event')
    .filter(isNeighborhoodArticle)
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
              <MapPin className="w-6 h-6 text-gray-500" />
              <span className="text-sm font-medium uppercase tracking-widest text-gray-500">Places to Go</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900">
              Alberta Neighborhoods
            </h1>
            <p className="mt-6 text-lg text-gray-600 leading-relaxed max-w-2xl">
              Explore neighborhoods across Alberta — from Edmonton and Calgary to Red Deer, Lethbridge, Medicine Hat, and more. Discover the communities that make each city unique.
            </p>

            {/* City filter */}
            <div className="mt-8 flex flex-wrap gap-2">
              {NEIGHBORHOOD_GUIDE_CITIES.map(({ value, label }) => (
                <Link
                  key={value || 'all'}
                  href={value ? `/neighborhoods?city=${value}` : '/neighborhoods'}
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

        {/* Neighborhood Cards */}
        <section className="w-full py-12 bg-gray-50">
          <div className="container mx-auto px-4 md:px-6">
            <p className="text-sm text-gray-500 mb-6">
              Showing {articles.length} neighborhood{articles.length !== 1 ? 's' : ''} {activeLabel !== 'All' ? `in ${activeLabel}` : 'across Alberta'}
            </p>
            {articles.length > 0 ? (
              <div className="grid gap-8 md:grid-cols-2">
                {articles.map((article) => (
                  <Link key={article.id} href={getArticleUrl(article)} className="group block">
                    <article className="bg-white overflow-hidden rounded-lg border border-gray-200 hover:shadow-lg transition-shadow duration-300">
                      <div className="aspect-[16/10] w-full bg-gray-100 relative overflow-hidden">
                        <Image
                          src={article.imageUrl || "/placeholder.svg"}
                          alt={article.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                          sizes="(max-width: 768px) 100vw, 50vw"
                          priority={false}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                      </div>
                      <div className="p-6">
                        <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors mb-3">
                          {article.title}
                        </h3>
                        <p className="text-gray-600 leading-relaxed line-clamp-3 mb-4">{article.excerpt}</p>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <MapPin className="w-4 h-4 flex-shrink-0" />
                          <span>{getArticleLocationLabel(article)}</span>
                        </div>
                      </div>
                    </article>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-24 bg-white rounded-lg border border-gray-200">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <MapPin className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="font-semibold text-xl text-gray-900 mb-2">
                  {activeLabel !== 'All' ? `No Neighborhood Articles in ${activeLabel}` : 'No Neighborhood Articles Yet'}
                </h3>
                <p className="text-gray-600 max-w-md mx-auto mb-8">
                  Create articles with the <strong>Neighborhood</strong> category or tag to see them here.
                </p>
                <Link
                  href="/neighborhoods"
                  className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
                >
                  View all neighborhoods
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
                  <Link href="/guides" className="text-blue-600 hover:text-blue-700 font-medium">All Guides</Link>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}
