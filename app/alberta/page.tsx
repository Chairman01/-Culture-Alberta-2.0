import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'
import { AlbertaLocationFilter } from '@/components/alberta-location-filter'
import NewsletterSignup from '@/components/newsletter-signup'
import { SearchBar } from '@/components/search-bar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getArticleUrl } from '@/lib/utils/article-url'
import { getTrendingByViews } from '@/lib/trending-articles'
import { getAlbertaPageData } from '@/lib/alberta-cities'
import { Article } from '@/lib/types/article'
import { Metadata } from 'next'
import { Suspense } from 'react'

export const metadata: Metadata = {
  title: 'Around Alberta - Culture Alberta',
  description: "Stories from Lethbridge, Red Deer, Edson, and beyond. Discover news, culture, and events from communities across Alberta.",
  openGraph: {
    title: 'Around Alberta - Culture Alberta',
    description: "Stories from Lethbridge, Red Deer, Edson, and beyond.",
    url: 'https://www.culturealberta.com/alberta',
  },
}

export const revalidate = 300

interface AlbertaArticle extends Article {
  type?: string
  location?: string
}

// Tier 1 cities with their own sections
const TIER1_CITIES = [
  { name: 'Red Deer', slug: 'red-deer', desc: 'The midpoint between Calgary and Edmonton, with a solid arts and food scene.' },
  { name: 'Lethbridge', slug: 'lethbridge', desc: 'University town with a vibrant cultural scene.' },
  { name: 'Medicine Hat', slug: 'medicine-hat', desc: 'A distinct community with its own culture.' },
  { name: 'Grande Prairie', slug: 'grande-prairie', desc: 'The largest city in the Peace Region, gateway to northern Alberta.' },
] as const

async function getAlbertaData() {
  try {
    // Single fetch instead of 7 - major speed improvement
    const pageData = await getAlbertaPageData()
    const {
      allArticles,
      albertaProvinceWideArticles,
      redDeerArticles,
      lethbridgeArticles,
      medicineHatArticles,
      grandePrairieArticles,
      otherArticles,
    } = pageData

    // Filter out events
    const filterEvents = (arr: Article[]) =>
      arr.filter((a) => (a as AlbertaArticle).type !== 'event' && (a as AlbertaArticle).type !== 'Event')

    const sortedAll = filterEvents(allArticles).sort((a, b) => {
      const dateA = new Date(a.date || a.createdAt || 0).getTime()
      const dateB = new Date(b.date || b.createdAt || 0).getTime()
      return dateB - dateA
    })

    const featuredArticle = sortedAll.find((a) => (a as { featuredAlberta?: boolean }).featuredAlberta) || sortedAll[0] || null
    const trendingByViews = await getTrendingByViews(sortedAll, { days: 7, limit: 4 })
    const trendingWithFlag = sortedAll.filter((a) => (a as { trendingAlberta?: boolean }).trendingAlberta || (a as { trendingHome?: boolean }).trendingHome)
    const trendingArticles = trendingByViews.length > 0 ? trendingByViews : (trendingWithFlag.length > 0 ? trendingWithFlag.slice(0, 4) : sortedAll.slice(0, 4))
    const topStoriesByViews = await getTrendingByViews(sortedAll, { days: 7, limit: 6 })
    const topStories = topStoriesByViews.length > 0 ? topStoriesByViews : (trendingWithFlag.length > 0 ? trendingWithFlag.slice(0, 6) : sortedAll.slice(0, 6))

    return {
      allArticles: sortedAll,
      featuredArticle,
      trendingArticles,
      topStories,
      albertaProvinceWideArticles: filterEvents(albertaProvinceWideArticles).sort((a, b) =>
        new Date(b.date || b.createdAt || 0).getTime() - new Date(a.date || a.createdAt || 0).getTime()
      ),
      redDeerArticles: filterEvents(redDeerArticles).sort((a, b) =>
        new Date(b.date || b.createdAt || 0).getTime() - new Date(a.date || a.createdAt || 0).getTime()
      ),
      lethbridgeArticles: filterEvents(lethbridgeArticles).sort((a, b) =>
        new Date(b.date || b.createdAt || 0).getTime() - new Date(a.date || a.createdAt || 0).getTime()
      ),
      medicineHatArticles: filterEvents(medicineHatArticles).sort((a, b) =>
        new Date(b.date || b.createdAt || 0).getTime() - new Date(a.date || a.createdAt || 0).getTime()
      ),
      grandePrairieArticles: filterEvents(grandePrairieArticles).sort((a, b) =>
        new Date(b.date || b.createdAt || 0).getTime() - new Date(a.date || a.createdAt || 0).getTime()
      ),
      otherArticles: filterEvents(otherArticles).sort((a, b) =>
        new Date(b.date || b.createdAt || 0).getTime() - new Date(a.date || a.createdAt || 0).getTime()
      ),
    }
  } catch (error) {
    console.error('❌ Error loading Alberta data:', error)
    return {
      allArticles: [],
      featuredArticle: null,
      trendingArticles: [],
      topStories: [],
      albertaProvinceWideArticles: [],
      redDeerArticles: [],
      lethbridgeArticles: [],
      medicineHatArticles: [],
      grandePrairieArticles: [],
      otherArticles: [],
    }
  }
}

function ArticleCard({ article, formatDate }: { article: Article; formatDate: (s: string) => string }) {
  return (
    <Link key={article.id} href={getArticleUrl(article)} className="group block">
      <div className="overflow-hidden rounded-lg">
        <div className="aspect-[4/3] w-full bg-gray-200 relative">
          <Image
            src={article.imageUrl || '/placeholder.svg'}
            alt={article.title}
            width={400}
            height={300}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        </div>
      </div>
      <div className="mt-2 space-y-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold">
            {article.category}
          </span>
        </div>
        <h3 className="font-bold group-hover:text-amber-700">{article.title}</h3>
        <p className="text-sm text-muted-foreground line-clamp-2">{article.excerpt}</p>
      </div>
    </Link>
  )
}

function CitySection({
  title,
  slug,
  desc,
  articles,
  formatDate,
}: {
  title: string
  slug: string
  desc: string
  articles: Article[]
  formatDate: (s: string) => string
}) {
  const display = articles.slice(0, 4)

  return (
    <section className="mb-12">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-display text-2xl font-bold">{title}</h2>
          <p className="text-sm text-muted-foreground mt-1">{desc}</p>
        </div>
        {articles.length > 0 && (
          <Link
            href={`/${slug}`}
            className="inline-flex items-center gap-2 text-amber-700 hover:text-amber-800 font-medium text-sm"
          >
            View All <ArrowRight className="w-4 h-4" />
          </Link>
        )}
      </div>
      {display.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {display.map((article) => (
            <ArticleCard key={article.id} article={article} formatDate={formatDate} />
          ))}
        </div>
      ) : (
        <div className="py-8 px-4 bg-gray-50 rounded-lg text-center">
          <p className="text-muted-foreground">No articles yet. Check back soon!</p>
        </div>
      )}
    </section>
  )
}

export default async function AlbertaPage() {
  const data = await getAlbertaData()
  const {
    allArticles,
    featuredArticle,
    trendingArticles,
    topStories,
    albertaProvinceWideArticles,
    redDeerArticles,
    lethbridgeArticles,
    medicineHatArticles,
    grandePrairieArticles,
    otherArticles,
  } = data

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

  // Category filters for main grid
  const foodArticles = allArticles.filter((a) =>
    a.category?.toLowerCase().includes('food') || a.category?.toLowerCase().includes('drink')
  )
  const artsArticles = allArticles.filter((a) =>
    a.category?.toLowerCase().includes('art') || a.category?.toLowerCase().includes('culture')
  )
  const outdoorsArticles = allArticles.filter((a) =>
    a.category?.toLowerCase().includes('outdoor')
  )

  return (
    <>
      <div className="flex min-h-screen flex-col">
        <main className="flex-1">
          {/* Header Section */}
          <section className="w-full py-6 bg-amber-50">
            <div className="container mx-auto px-4 md:px-6">
              <div className="flex flex-col items-center justify-center space-y-2 text-center">
                <div className="space-y-1">
                  <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl">Around Alberta</h1>
                  <p className="max-w-[900px] text-muted-foreground md:text-xl mx-auto">
                    Stories from Lethbridge, Red Deer, Edson, and beyond.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Featured Article + Sidebar */}
          <section className="w-full py-6">
            <div className="container mx-auto px-4 md:px-6">
              <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
                {featuredArticle && (
                  <div className="w-full">
                    <Link href={getArticleUrl(featuredArticle)} className="group block">
                      <div className="aspect-[16/9] rounded-lg overflow-hidden bg-gray-200">
                        <Image
                          src={featuredArticle.imageUrl || '/placeholder.svg'}
                          alt={featuredArticle.title}
                          width={800}
                          height={500}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      <div className="mt-3">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="bg-amber-500 text-white px-2 py-1 text-xs rounded">Featured</span>
                        </div>
                        <h2 className="text-2xl font-bold leading-tight tracking-tighter md:text-3xl lg:text-4xl group-hover:text-amber-700">
                          {featuredArticle.title}
                        </h2>
                        <p className="mt-2 text-gray-600">{featuredArticle.excerpt}</p>
                      </div>
                    </Link>
                  </div>
                )}

                <div className="space-y-6">
                  {/* Search */}
                  <div className="bg-white rounded-xl shadow-sm p-6">
                    <SearchBar variant="alberta" className="mb-0" />
                  </div>
                  <div className="bg-white rounded-xl shadow-sm p-6">
                    <h2 className="font-display text-2xl font-bold mb-4">Trending This Week</h2>
                    <div className="space-y-3">
                      {trendingArticles.slice(0, 4).map((article, index) => (
                        <Link
                          key={`trending-${article.id}-${index}`}
                          href={getArticleUrl(article)}
                          className="block group"
                        >
                          <div className="flex items-start space-x-4">
                            <span className="text-lg font-bold text-gray-300 bg-gray-100 rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">
                              {index + 1}
                            </span>
                            <div>
                              <h3 className="font-display font-semibold text-base group-hover:text-amber-700 line-clamp-2 leading-tight">
                                {article.title}
                              </h3>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>

                  <NewsletterSignup
                    defaultCity="other-alberta"
                    title="Newsletter"
                    description="Stay updated with the latest stories from communities across Alberta."
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Alberta Province-Wide Section */}
          <section className="w-full py-8 bg-amber-50/50 border-y border-amber-100">
            <div className="container mx-auto px-4 md:px-6">
              <CitySection
                title="Alberta"
                slug="alberta/all-articles?filter=alberta"
                desc="Province-wide news, culture, and stories from across Alberta."
                articles={
                  albertaProvinceWideArticles.length > 0
                    ? albertaProvinceWideArticles
                    : allArticles.slice(0, 4)
                }
                formatDate={formatDate}
              />
            </div>
          </section>

          {/* Tier 1 - City Sections (Red Deer, Lethbridge, etc.) */}
          <section className="w-full py-6 bg-gray-50">
            <div className="container mx-auto px-4 md:px-6">
              {TIER1_CITIES.map((city) => {
                const articles =
                  city.slug === 'red-deer'
                    ? redDeerArticles
                    : city.slug === 'lethbridge'
                      ? lethbridgeArticles
                      : city.slug === 'medicine-hat'
                        ? medicineHatArticles
                        : grandePrairieArticles
                return (
                  <CitySection
                    key={city.slug}
                    title={city.name}
                    slug={city.slug}
                    desc={city.desc}
                    articles={articles}
                    formatDate={formatDate}
                  />
                )
              })}
            </div>
          </section>

          {/* Tier 2 - Other Communities */}
          {otherArticles.length > 0 && (
            <section className="w-full py-6">
              <div className="container mx-auto px-4 md:px-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="font-display text-2xl font-bold">Other Communities</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      More from Alberta — Fort McMurray, Canmore, Drumheller, and more
                    </p>
                  </div>
                  <Link
                    href="/alberta/all-articles?filter=other"
                    className="inline-flex items-center gap-2 text-amber-700 hover:text-amber-800 font-medium text-sm"
                  >
                    View All <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {otherArticles.slice(0, 4).map((article) => (
                    <ArticleCard key={article.id} article={article} formatDate={formatDate} />
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Article Grid with Category & Location Filters */}
          <section className="w-full py-6 bg-gray-50">
            <div className="container mx-auto px-4 md:px-6">
              <Tabs defaultValue="all" className="w-full">
                <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4 flex-wrap">
                  <TabsList className="mx-auto sm:mx-0">
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="food">Food & Drink</TabsTrigger>
                    <TabsTrigger value="top">Top Stories</TabsTrigger>
                    <TabsTrigger value="arts">Arts & Culture</TabsTrigger>
                    <TabsTrigger value="outdoors">Outdoors</TabsTrigger>
                  </TabsList>
                  <Suspense fallback={null}>
                    <AlbertaLocationFilter />
                  </Suspense>
                </div>

                <TabsContent value="all" className="mt-4">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {allArticles.slice(0, 6).map((article) => (
                      <ArticleCard key={article.id} article={article} formatDate={formatDate} />
                    ))}
                  </div>
                  {allArticles.length > 6 && (
                    <div className="mt-6 text-center">
                      <Link
                        href="/alberta/all-articles"
                        className="inline-flex items-center gap-2 bg-amber-600 text-white px-6 py-3 rounded-lg hover:bg-amber-700 transition-colors font-medium"
                      >
                        View All Alberta Articles ({allArticles.length})
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="food" className="mt-4">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {foodArticles.slice(0, 6).map((article) => (
                      <ArticleCard key={article.id} article={article} formatDate={formatDate} />
                    ))}
                  </div>
                  {foodArticles.length > 6 && (
                    <div className="mt-6 text-center">
                      <Link
                        href="/alberta/food-drink"
                        className="inline-flex items-center gap-2 bg-amber-600 text-white px-6 py-3 rounded-lg hover:bg-amber-700 transition-colors font-medium"
                      >
                        View All Food & Drink ({foodArticles.length})
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  )}
                  {foodArticles.length === 0 && (
                    <p className="text-center text-muted-foreground py-12">No Food & Drink articles yet.</p>
                  )}
                </TabsContent>

                <TabsContent value="top" className="mt-4">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {topStories.slice(0, 6).map((article) => (
                      <ArticleCard key={article.id} article={article} formatDate={formatDate} />
                    ))}
                  </div>
                  {topStories.length === 0 && (
                    <p className="text-center text-muted-foreground py-12">No top stories yet. Mark articles as trending in the admin to feature them here.</p>
                  )}
                </TabsContent>

                <TabsContent value="arts" className="mt-4">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {artsArticles.slice(0, 6).map((article) => (
                      <ArticleCard key={article.id} article={article} formatDate={formatDate} />
                    ))}
                  </div>
                  {artsArticles.length > 6 && (
                    <div className="mt-6 text-center">
                      <Link
                        href="/alberta/arts-culture"
                        className="inline-flex items-center gap-2 bg-amber-600 text-white px-6 py-3 rounded-lg hover:bg-amber-700 transition-colors font-medium"
                      >
                        View All Arts & Culture ({artsArticles.length})
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  )}
                  {artsArticles.length === 0 && (
                    <p className="text-center text-muted-foreground py-12">No Arts & Culture articles yet.</p>
                  )}
                </TabsContent>

                <TabsContent value="outdoors" className="mt-4">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {outdoorsArticles.slice(0, 6).map((article) => (
                      <ArticleCard key={article.id} article={article} formatDate={formatDate} />
                    ))}
                  </div>
                  {outdoorsArticles.length > 6 && (
                    <div className="mt-6 text-center">
                      <Link
                        href="/alberta/outdoors"
                        className="inline-flex items-center gap-2 bg-amber-600 text-white px-6 py-3 rounded-lg hover:bg-amber-700 transition-colors font-medium"
                      >
                        View All Outdoors ({outdoorsArticles.length})
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  )}
                  {outdoorsArticles.length === 0 && (
                    <p className="text-center text-muted-foreground py-12">No Outdoors articles yet.</p>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </section>
        </main>
      </div>
    </>
  )
}
