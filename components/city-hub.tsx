import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Calendar, Mail } from 'lucide-react'
import NewsletterSignup from '@/components/newsletter-signup'
import { SearchBar } from '@/components/search-bar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getArticleUrl, getEventUrl } from '@/lib/utils/article-url'
import { getAlbertaCityArticles } from '@/lib/alberta-cities'
import { getTrendingByViews } from '@/lib/trending-articles'
import { getEventsByLocation } from '@/lib/events'
import { CityEventsCalendar } from '@/components/city-events-calendar'
import { Article } from '@/lib/types/article'
import { isNeighborhoodArticle, isGuideArticle, isRegularArticle } from '@/lib/utils/article-filters'
import type { CityPageConfig } from '@/lib/city-pages'

interface CityArticle extends Article {
    type?: string
    location?: string
    event_date?: string
}

async function getCityData(config: CityPageConfig) {
    try {
        const cityArticles = ((await getAlbertaCityArticles(config.eventLocation)) as CityArticle[])
            // Events live on the events page, not the city article grid.
            .filter((a) => a.type !== 'event' && a.type !== 'Event')

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ts = (a: any) =>
            new Date(a.date || a.createdAt || a.created_at || a.updatedAt || a.updated_at || 0).getTime()
        const sortedArticles = cityArticles.filter(isRegularArticle).sort((a, b) => ts(b) - ts(a))

        const eventsRaw = await getEventsByLocation(config.eventLocation)
        const now = new Date()
        const upcomingEvents = eventsRaw
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .filter((e: any) => {
                const d = e.event_date
                if (!d) return false
                try {
                    return new Date(d) >= now
                } catch {
                    return false
                }
            })
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .sort((a: any, b: any) => new Date(a.event_date || 0).getTime() - new Date(b.event_date || 0).getTime())
            .slice(0, 3)

        const eligible = sortedArticles.filter((a) => a.type !== 'event' && a.type !== 'Event')
        const trendingByViews = await getTrendingByViews(eligible, { days: 7, limit: 4 })
        const trendingArticles = trendingByViews.length > 0 ? trendingByViews : eligible.slice(0, 4)
        const topStoriesByViews = await getTrendingByViews(eligible, { days: 7, limit: 6 })
        const topStories = topStoriesByViews.length > 0 ? topStoriesByViews : eligible.slice(0, 6)

        const featuredArticle = sortedArticles[0] || null
        const neighborhoodArticles = cityArticles.filter(isNeighborhoodArticle)
        const guideArticles = cityArticles.filter(isGuideArticle)

        return {
            articles: sortedArticles,
            neighborhoodArticles,
            guideArticles,
            events: upcomingEvents,
            trendingArticles,
            featuredArticle,
            topStories,
        }
    } catch (error) {
        console.error(`❌ Error loading ${config.name} data:`, error)
        return {
            articles: [],
            neighborhoodArticles: [],
            guideArticles: [],
            events: [],
            trendingArticles: [],
            featuredArticle: null,
            topStories: [],
        }
    }
}

function formatEventDate(dateString: string): string {
    if (!dateString) return 'Date TBA'
    try {
        const date = new Date(dateString)
        if (isNaN(date.getTime())) return 'Date TBA'
        const datePart = date.toLocaleDateString('en-US', {
            weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/Edmonton',
        })
        const timeMatch = dateString.match(/T(\d{1,2}):(\d{2})/)
        const isMidnight = timeMatch && parseInt(timeMatch[1], 10) === 0 && parseInt(timeMatch[2], 10) === 0
        const timePart = timeMatch && !isMidnight
            ? date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/Edmonton' })
            : ''
        return timePart ? `${datePart} at ${timePart}` : datePart
    } catch {
        return 'Date TBA'
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function catFilter(articles: CityArticle[], test: (cat: string, cats: string[], tags: string[]) => boolean) {
    return articles
        .filter((a) => {
            const cat = (a.category || '').toLowerCase()
            const cats = (a.categories || []).map((c: string) => c.toLowerCase())
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const tags = ((a as any).tags || []).map((t: string) => t.toLowerCase())
            return test(cat, cats, tags)
        })
        .slice(0, 6)
}

function ArticleCard({ article, badge, badgeClass }: { article: CityArticle; badge: string; badgeClass: string }) {
    return (
        <Link href={getArticleUrl(article)} className="group block">
            <div className="overflow-hidden rounded-lg">
                <div className="aspect-[4/3] w-full bg-gray-200">
                    <Image src={article.imageUrl || '/placeholder.svg'} alt={article.title} width={400} height={300} className="w-full h-full object-cover" loading="lazy" />
                </div>
            </div>
            <div className="mt-2 space-y-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeClass}`}>{badge}</span>
                </div>
                <h3 className="font-bold group-hover:text-blue-600">{article.title}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2">{article.excerpt}</p>
            </div>
        </Link>
    )
}

export async function CityHub({ config }: { config: CityPageConfig }) {
    const { articles, neighborhoodArticles, guideArticles, events, trendingArticles, featuredArticle, topStories } =
        await getCityData(config)

    const collectionSchema = {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: `${config.name} News, Events & Culture`,
        description: config.metaDescription,
        url: `https://www.culturealberta.com/${config.slug}`,
        isPartOf: { '@type': 'WebSite', name: 'Culture Alberta', url: 'https://www.culturealberta.com' },
        about: {
            '@type': 'City',
            name: config.name,
            containedInPlace: { '@type': 'AdministrativeArea', name: 'Alberta', containedInPlace: { '@type': 'Country', name: 'Canada' } },
        },
        publisher: { '@type': 'Organization', name: 'Culture Alberta', url: 'https://www.culturealberta.com' },
    }
    const breadcrumb = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.culturealberta.com' },
            { '@type': 'ListItem', position: 2, name: config.name, item: `https://www.culturealberta.com/${config.slug}` },
        ],
    }

    return (
        <>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }} />
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
            <div className="flex min-h-screen flex-col">
                <main className="flex-1">
                    {/* Header */}
                    <section className="w-full py-6 bg-blue-50">
                        <div className="container mx-auto px-4 md:px-6">
                            <div className="flex flex-col items-center justify-center space-y-2 text-center">
                                <div className="space-y-1">
                                    <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl">{config.name}</h1>
                                    <p className="max-w-[900px] text-muted-foreground md:text-xl mx-auto">{config.blurb}</p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Feature + Sidebar */}
                    <section className="w-full pt-6 pb-3">
                        <div className="container mx-auto px-4 md:px-6">
                            <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
                                {featuredArticle && (
                                    <div className="w-full">
                                        <Link href={getArticleUrl(featuredArticle)} className="group block">
                                            <div className="aspect-[16/9] rounded-lg overflow-hidden bg-gray-200">
                                                <Image src={featuredArticle.imageUrl || '/placeholder.svg'} alt={featuredArticle.title} width={800} height={500} className="w-full h-full object-cover" loading="lazy" />
                                            </div>
                                            <div className="mt-3">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="bg-red-500 text-white px-2 py-1 text-xs rounded">Featured</span>
                                                </div>
                                                <h2 className="text-2xl font-bold leading-tight tracking-tighter md:text-3xl lg:text-4xl group-hover:text-blue-600">{featuredArticle.title}</h2>
                                                <p className="mt-2 text-gray-600">{featuredArticle.excerpt}</p>
                                            </div>
                                        </Link>
                                    </div>
                                )}

                                <div className="space-y-6">
                                    <div className="bg-white rounded-xl shadow-sm p-6">
                                        <SearchBar variant="default" className="mb-0" />
                                    </div>

                                    <div className="bg-white rounded-xl shadow-sm p-6">
                                        <h2 className="font-display text-2xl font-bold mb-4">Trending This Week</h2>
                                        <div className="space-y-3">
                                            {(trendingArticles.length > 0 ? trendingArticles : articles.slice(0, 3)).map((article, index) => (
                                                <Link key={`trending-${article.id}-${index}`} href={getArticleUrl(article)} className="block group">
                                                    <div className="flex items-start space-x-4">
                                                        <span className="text-lg font-bold text-gray-300 bg-gray-100 rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">{index + 1}</span>
                                                        <div>
                                                            <h3 className="font-display font-semibold text-base group-hover:text-gray-600 transition-colors duration-300 line-clamp-2 leading-tight">{article.title}</h3>
                                                        </div>
                                                    </div>
                                                </Link>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="bg-white rounded-xl shadow-sm p-4">
                                        <h2 className="font-display text-xl font-bold mb-3">{config.name} Events</h2>
                                        {events.length > 0 ? (
                                            <div className="space-y-3">
                                                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                                {events.map((event: any) => (
                                                    <div key={event.id} className="flex gap-3 p-3 rounded-lg border bg-gray-50/50 hover:bg-gray-50">
                                                        <div className="w-20 h-20 flex-shrink-0 rounded overflow-hidden bg-gray-200">
                                                            <Image src={event.image_url || event.imageUrl || '/placeholder.svg'} alt={event.title} width={80} height={80} className="w-full h-full object-cover" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h3 className="font-display font-semibold text-sm line-clamp-2">{event.title}</h3>
                                                            <p className="text-xs text-gray-500 mt-0.5">
                                                                {formatEventDate(event.event_date || event.eventDate || '')} · {event.location || config.name}
                                                            </p>
                                                            <div className="flex gap-2 mt-2">
                                                                <Link href={getEventUrl(event)}>
                                                                    <span className="text-xs font-medium text-blue-600 hover:underline">View Details</span>
                                                                </Link>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                                <Link href="/events" className="block text-center text-sm text-blue-600 hover:underline font-medium py-2">View all events →</Link>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-between bg-blue-50 rounded-lg p-4">
                                                <div className="flex items-center gap-3">
                                                    <Calendar className="h-8 w-8 text-blue-600" />
                                                    <div>
                                                        <h3 className="font-display font-semibold text-sm text-gray-900">Discover {config.name}&rsquo;s Best Events</h3>
                                                        <p className="text-gray-600 text-xs">From festivals to concerts</p>
                                                    </div>
                                                </div>
                                                <Link href="/events" className="inline-flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-md text-sm transition-colors duration-200">
                                                    <span>Explore</span>
                                                    <ArrowRight className="h-3 w-3" />
                                                </Link>
                                            </div>
                                        )}
                                    </div>

                                    <div className="bg-gradient-to-br from-slate-50 to-blue-50/40 rounded-2xl shadow-sm border border-slate-200/80 p-4">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                                                <Mail className="w-4 h-4 text-blue-600" />
                                            </div>
                                            <div>
                                                <h2 className="font-display text-base font-bold text-gray-900 leading-tight">Newsletter</h2>
                                                <p className="font-body text-xs text-gray-500 leading-snug">Stay updated with the latest cultural news and events from {config.name} and across Alberta.</p>
                                            </div>
                                        </div>
                                        <NewsletterSignup defaultCity={config.slug} compact={true} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Articles with tabs */}
                    <section className="w-full pt-3 pb-6 bg-gray-50">
                        <div className="container mx-auto px-4 md:px-6">
                            <Tabs defaultValue="all" className="w-full">
                                <div className="mb-6 overflow-x-auto -mx-4 px-4 pb-1">
                                    <TabsList className="inline-flex min-w-max">
                                        <TabsTrigger value="all">All</TabsTrigger>
                                        <TabsTrigger value="top">Top Stories</TabsTrigger>
                                        <TabsTrigger value="food">Food &amp; Drink</TabsTrigger>
                                        <TabsTrigger value="arts">Arts &amp; Culture</TabsTrigger>
                                        <TabsTrigger value="sports">Sports</TabsTrigger>
                                        <TabsTrigger value="crime">Crime</TabsTrigger>
                                        <TabsTrigger value="politics">Politics</TabsTrigger>
                                    </TabsList>
                                </div>

                                <TabsContent value="all" className="mt-4">
                                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                        {articles.slice(0, 6).map((article) => (
                                            <ArticleCard key={article.id} article={article} badge={article.category || 'News'} badgeClass="bg-muted" />
                                        ))}
                                    </div>
                                    {articles.length === 0 && <p className="text-center text-muted-foreground py-12">No articles yet — check back soon.</p>}
                                    {articles.length > 6 && (
                                        <div className="mt-6 text-center">
                                            <Link href={`/${config.slug}/all-articles`} className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium">
                                                View All {config.name} Articles ({articles.length}) <ArrowRight className="w-4 h-4" />
                                            </Link>
                                        </div>
                                    )}
                                </TabsContent>

                                <TabsContent value="top" className="mt-4">
                                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                        {topStories.slice(0, 6).map((article) => (
                                            <ArticleCard key={article.id} article={article} badge="Top Story" badgeClass="bg-blue-100 text-blue-800" />
                                        ))}
                                    </div>
                                    {topStories.length === 0 && <p className="text-center text-muted-foreground py-12">No top stories yet.</p>}
                                </TabsContent>

                                <TabsContent value="food" className="mt-4">
                                    {(() => {
                                        const f = catFilter(articles, (cat, cats) => cat.includes('food') || cat.includes('drink') || cats.some((c) => c.includes('food') || c.includes('drink')))
                                        return f.length > 0 ? (
                                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{f.map((a) => <ArticleCard key={a.id} article={a} badge="Food & Drink" badgeClass="bg-orange-100 text-orange-800" />)}</div>
                                        ) : <p className="text-center text-muted-foreground py-12">No Food &amp; Drink articles yet.</p>
                                    })()}
                                </TabsContent>

                                <TabsContent value="arts" className="mt-4">
                                    {(() => {
                                        const f = catFilter(articles, (cat, cats) => cat.includes('art') || cat.includes('culture') || cats.some((c) => c.includes('art') || c.includes('culture')))
                                        return f.length > 0 ? (
                                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{f.map((a) => <ArticleCard key={a.id} article={a} badge="Arts & Culture" badgeClass="bg-purple-100 text-purple-800" />)}</div>
                                        ) : <p className="text-center text-muted-foreground py-12">No Arts &amp; Culture articles yet.</p>
                                    })()}
                                </TabsContent>

                                <TabsContent value="sports" className="mt-4">
                                    {(() => {
                                        const f = catFilter(articles, (cat, cats, tags) => cat.includes('sport') || cats.some((c) => c.includes('sport')) || tags.some((t) => t.includes('sport')))
                                        return f.length > 0 ? (
                                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{f.map((a) => <ArticleCard key={a.id} article={a} badge="Sports" badgeClass="bg-yellow-100 text-yellow-800" />)}</div>
                                        ) : <p className="text-center text-muted-foreground py-12">No Sports articles yet.</p>
                                    })()}
                                </TabsContent>

                                <TabsContent value="crime" className="mt-4">
                                    {(() => {
                                        const f = catFilter(articles, (cat, cats, tags) => cat.includes('crime') || cat.includes('safety') || cats.some((c) => c.includes('crime') || c.includes('safety')) || tags.some((t) => t.includes('crime')))
                                        return f.length > 0 ? (
                                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{f.map((a) => <ArticleCard key={a.id} article={a} badge="Crime" badgeClass="bg-red-100 text-red-800" />)}</div>
                                        ) : <p className="text-center text-muted-foreground py-12">No Crime articles yet.</p>
                                    })()}
                                </TabsContent>

                                <TabsContent value="politics" className="mt-4">
                                    {(() => {
                                        const f = catFilter(articles, (cat, cats, tags) => cat.includes('politic') || cat.includes('government') || cats.some((c) => c.includes('politic') || c.includes('government')) || tags.some((t) => t.includes('politic')))
                                        return f.length > 0 ? (
                                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{f.map((a) => <ArticleCard key={a.id} article={a} badge="Politics" badgeClass="bg-gray-100 text-gray-800" />)}</div>
                                        ) : <p className="text-center text-muted-foreground py-12">No Politics articles yet.</p>
                                    })()}
                                </TabsContent>
                            </Tabs>
                        </div>
                    </section>

                    {/* Dynamic events calendar — curated events (+ open data for cities that have it), with Event JSON-LD */}
                    <section className="w-full">
                        <div className="container mx-auto px-4 md:px-6">
                            <CityEventsCalendar citySlug={config.slug} cityLabel={config.eventLocation} />
                        </div>
                    </section>

                    {/* Neighborhoods */}
                    <section className="w-full py-6">
                        <div className="container mx-auto px-4 md:px-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="font-display text-3xl font-bold">{config.name} Neighbourhoods</h2>
                                <Link href={`/neighborhoods?city=${config.slug}`} className="text-blue-600 hover:text-blue-700 flex items-center gap-2 font-body font-medium">
                                    View All <ArrowRight className="w-4 h-4" />
                                </Link>
                            </div>
                            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                                {neighborhoodArticles.slice(0, 4).map((article) => (
                                    <Link key={article.id} href={getArticleUrl(article)} className="group block">
                                        <div className="rounded-2xl overflow-hidden border border-gray-100 bg-white shadow-sm hover:shadow-lg transition-all duration-300">
                                            <div className="aspect-[4/3] relative overflow-hidden">
                                                <Image src={article.imageUrl || '/placeholder.svg'} alt={article.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw" loading="lazy" />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                                                <div className="absolute bottom-0 left-0 right-0 p-4">
                                                    <h3 className="font-semibold text-lg text-white drop-shadow-md line-clamp-2">{article.title}</h3>
                                                </div>
                                            </div>
                                            <div className="p-4">
                                                <p className="text-gray-600 text-sm line-clamp-2">{article.excerpt}</p>
                                                <span className="inline-flex items-center gap-1 mt-2 text-blue-600 font-medium text-sm group-hover:gap-2 transition-all">Explore <ArrowRight className="w-4 h-4" /></span>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                                {neighborhoodArticles.length === 0 && (
                                    <div className="col-span-full text-center py-12">
                                        <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4"><span className="text-2xl">🏘️</span></div>
                                        <h3 className="font-semibold text-lg mb-2">No Neighbourhood Articles Yet</h3>
                                        <p className="text-gray-600 text-sm">Check back soon for {config.name} neighbourhood guides.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>

                    {/* Guides */}
                    <section className="w-full py-6">
                        <div className="container mx-auto px-4 md:px-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="font-display text-3xl font-bold">{config.name} Guides</h2>
                                <Link href={`/guides?city=${config.slug}`} className="text-blue-600 hover:text-blue-700 flex items-center gap-2 font-body font-medium">
                                    View All <ArrowRight className="w-4 h-4" />
                                </Link>
                            </div>
                            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                                {guideArticles.slice(0, 4).map((article) => (
                                    <Link key={article.id} href={getArticleUrl(article)} className="group block">
                                        <div className="rounded-2xl overflow-hidden border border-gray-100 bg-white shadow-sm hover:shadow-lg transition-all duration-300">
                                            <div className="aspect-[4/3] relative overflow-hidden">
                                                <Image src={article.imageUrl || '/placeholder.svg'} alt={article.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw" loading="lazy" />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                                                <div className="absolute bottom-0 left-0 right-0 p-4">
                                                    <h3 className="font-semibold text-lg text-white drop-shadow-md line-clamp-2">{article.title}</h3>
                                                </div>
                                            </div>
                                            <div className="p-4">
                                                <p className="text-gray-600 text-sm line-clamp-2">{article.excerpt}</p>
                                                <span className="inline-flex items-center gap-1 mt-2 text-blue-600 font-medium text-sm group-hover:gap-2 transition-all">Read Guide <ArrowRight className="w-4 h-4" /></span>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                                {guideArticles.length === 0 && (
                                    <div className="col-span-full text-center py-12">
                                        <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4"><span className="text-2xl">📖</span></div>
                                        <h3 className="font-semibold text-lg mb-2">No Guide Articles Yet</h3>
                                        <p className="text-gray-600 text-sm">Check back soon for {config.name} guides.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>
                </main>
            </div>
        </>
    )
}
