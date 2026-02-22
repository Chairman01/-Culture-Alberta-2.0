import Link from 'next/link'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Suspense } from 'react'
import { AlbertaLocationFilter } from '@/components/alberta-location-filter'
import { getArticleUrl } from '@/lib/utils/article-url'
import { getAlbertaPageData } from '@/lib/alberta-cities'
import { Article } from '@/lib/types/article'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'All Alberta Articles - Culture Alberta',
  description: "Browse all articles from communities across Alberta. Stories from Lethbridge, Red Deer, Medicine Hat, Grande Prairie, and more.",
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface AlbertaArticle extends Article {
  type?: string
}

export default async function AlbertaAllArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{ location?: string; filter?: string }>
}) {
  const params = await searchParams
  const location = params.location || ''
  const filter = params.filter || ''

  // Only Red Deer, Lethbridge, Medicine Hat, Grande Prairie have their own pages - all others go to Other Communities
  const TIER1_LOCATIONS = ['red-deer', 'lethbridge', 'medicine-hat', 'grande-prairie']
  if (location) {
    const loc = location.toLowerCase().replace(/ /g, '-')
    if (TIER1_LOCATIONS.includes(loc)) {
      redirect(`/${loc}`)
    }
    redirect('/alberta/all-articles?filter=other')
  }

  const pageData = await getAlbertaPageData()
  const { allArticles, albertaProvinceWideArticles, otherArticles } = pageData

  const excludeEvents = (arr: Article[]) =>
    arr.filter((a) => (a as AlbertaArticle).type !== 'event' && (a as AlbertaArticle).type !== 'Event')

  let articles: Article[]
  if (filter === 'alberta') {
    articles = excludeEvents(albertaProvinceWideArticles)
  } else if (filter === 'other') {
    articles = excludeEvents(otherArticles)
  } else {
    articles = excludeEvents(allArticles)
  }

  articles.sort((a, b) => {
    const dateA = new Date(a.date || a.createdAt || 0).getTime()
    const dateB = new Date(b.date || b.createdAt || 0).getTime()
    return dateB - dateA
  })

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

  const pageTitle = filter === 'alberta' ? 'Alberta' : filter === 'other' ? 'Other Communities' : 'All Alberta Articles'

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        <section className="w-full py-6 bg-amber-50">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
              <Link
                href="/alberta"
                className="flex items-center gap-2 text-amber-700 hover:text-amber-800 font-medium"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Around Alberta
              </Link>
              <Suspense fallback={null}>
                <AlbertaLocationFilter />
              </Suspense>
            </div>
            <div className="flex flex-col items-center justify-center space-y-2 text-center">
              <div className="space-y-1">
                <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl text-amber-800">
                  {pageTitle}
                </h1>
                <p className="max-w-[900px] text-muted-foreground md:text-xl mx-auto">
                  {filter === 'alberta'
                    ? `${articles.length} province-wide article${articles.length !== 1 ? 's' : ''}`
                    : `${articles.length} article${articles.length !== 1 ? 's' : ''} from communities across Alberta`}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="w-full py-8">
          <div className="container mx-auto px-4 md:px-6">
            {articles.length > 0 ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {articles.map((article) => (
                  <Link key={article.id} href={getArticleUrl(article)} className="group block">
                    <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300">
                      <div className="aspect-[4/3] w-full bg-gray-200 relative">
                        <Image
                          src={article.imageUrl || '/placeholder.svg'}
                          alt={article.title}
                          width={400}
                          height={300}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <div className="p-4">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                          <span className="rounded-full bg-amber-100 text-amber-800 px-2.5 py-0.5 text-xs font-semibold">
                            {article.category}
                          </span>
                          <span>{formatDate(article.date || '')}</span>
                        </div>
                        <h3 className="font-bold text-lg group-hover:text-amber-700 transition-colors duration-300 line-clamp-2 leading-tight mb-2">
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
                <p className="text-gray-600 text-sm mb-4">
                  {filter ? 'Try "All locations" or a city page.' : 'Check back later for new Alberta articles.'}
                </p>
                <Link
                  href="/alberta"
                  className="inline-flex items-center gap-2 bg-amber-600 text-white px-6 py-3 rounded-lg hover:bg-amber-700 transition-colors font-medium"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Around Alberta
                </Link>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}
