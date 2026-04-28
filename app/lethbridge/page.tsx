import Link from "next/link"
import Image from "next/image"
import { ArrowRight, Calendar, MapPin } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getArticleUrl } from '@/lib/utils/article-url'
import { getLethbridgeArticles } from '@/lib/alberta-cities'
import { Article } from "@/lib/types/article"
import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Lethbridge - Culture Alberta',
    description: "Discover the latest news, events, and stories from Lethbridge. Explore Southern Alberta's vibrant culture, attractions, and local happenings.",
    openGraph: {
        title: 'Lethbridge - Culture Alberta',
        description: "Discover the latest news, events, and stories from Lethbridge.",
        url: 'https://www.culturealberta.com/lethbridge',
    },
}

export const revalidate = 300
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

interface LethbridgeArticle extends Article {
    type?: string
}

async function getLethbridgeData() {
    try {
        console.log('🔄 Loading Lethbridge articles...')

        const allContent = await getLethbridgeArticles() as LethbridgeArticle[]
        const articles = allContent.filter(item => item.type !== 'event')

        console.log(`✅ Lethbridge articles loaded: ${articles.length}`)

        // Sort by date (newest first)
        const sortedArticles = articles.sort((a, b) => {
            const dateA = new Date(a.date || a.createdAt || 0).getTime()
            const dateB = new Date(b.date || b.createdAt || 0).getTime()
            return dateB - dateA
        })

        // Featured article
        const featuredArticle = sortedArticles[0] || null

        // Trending articles
        const trendingArticles = sortedArticles.slice(0, 4)

        const topStories = sortedArticles.slice(0, 6)

        const foodDrinkArticles = sortedArticles.filter(a =>
            a.category?.toLowerCase().includes('food') ||
            a.category?.toLowerCase().includes('drink') ||
            a.category?.toLowerCase().includes('restaurant') ||
            a.categories?.some((c: string) => c.toLowerCase().includes('food') || c.toLowerCase().includes('drink'))
        )

        const cultureArticles = sortedArticles.filter(a =>
            a.category?.toLowerCase().includes('culture') ||
            a.category?.toLowerCase().includes('art') ||
            a.category?.toLowerCase().includes('music') ||
            a.category?.toLowerCase().includes('theater') ||
            a.categories?.some((c: string) => c.toLowerCase().includes('culture') || c.toLowerCase().includes('art'))
        )

        const sportsArticles = sortedArticles.filter(a =>
            a.category?.toLowerCase().includes('sport') ||
            a.categories?.some((c: string) => c.toLowerCase().includes('sport')) ||
            (a as any).tags?.some((t: string) => t.toLowerCase().includes('sport'))
        )

        const realEstateArticles = sortedArticles.filter(a =>
            a.category?.toLowerCase().includes('real estate') ||
            a.category?.toLowerCase().includes('housing') ||
            a.category?.toLowerCase().includes('property') ||
            a.category?.toLowerCase().includes('mortgage') ||
            a.categories?.some((c: string) => c.toLowerCase().includes('real estate') || c.toLowerCase().includes('housing')) ||
            (a as any).tags?.some((t: string) => t.toLowerCase().includes('real estate') || t.toLowerCase().includes('housing'))
        )

        const crimeArticles = sortedArticles.filter(a =>
            a.category?.toLowerCase().includes('crime') ||
            a.category?.toLowerCase().includes('safety') ||
            a.categories?.some((c: string) => c.toLowerCase().includes('crime') || c.toLowerCase().includes('safety')) ||
            (a as any).tags?.some((t: string) => t.toLowerCase().includes('crime'))
        )

        const politicsArticles = sortedArticles.filter(a =>
            a.category?.toLowerCase().includes('politic') ||
            a.category?.toLowerCase().includes('government') ||
            a.categories?.some((c: string) => c.toLowerCase().includes('politic') || c.toLowerCase().includes('government')) ||
            (a as any).tags?.some((t: string) => t.toLowerCase().includes('politic'))
        )

        return {
            articles: sortedArticles,
            featuredArticle,
            trendingArticles,
            topStories,
            foodDrinkArticles,
            cultureArticles,
            sportsArticles,
            realEstateArticles,
            crimeArticles,
            politicsArticles,
        }
    } catch (error) {
        console.error('❌ Error loading Lethbridge data:', error)
        return {
            articles: [],
            featuredArticle: null,
            trendingArticles: [],
            topStories: [],
            foodDrinkArticles: [],
            cultureArticles: [],
            sportsArticles: [],
            realEstateArticles: [],
            crimeArticles: [],
            politicsArticles: [],
        }
    }
}

export default async function LethbridgePage() {
    const { articles, featuredArticle, trendingArticles, topStories, foodDrinkArticles, cultureArticles, sportsArticles, realEstateArticles, crimeArticles, politicsArticles } = await getLethbridgeData()

    const formatDate = (dateString: string) => {
        try {
            const date = new Date(dateString)
            return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
        } catch {
            return 'Recently'
        }
    }

    return (
        <div className="flex min-h-screen flex-col">
            <main className="flex-1">
                {/* Header Section */}
                <section className="w-full py-6 bg-green-50">
                    <div className="container mx-auto px-4 md:px-6">
                        <div className="flex flex-col items-center justify-center space-y-2 text-center">
                            <div className="space-y-1">
                                <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl">Lethbridge</h1>
                                <p className="max-w-[900px] text-muted-foreground md:text-xl mx-auto">
                                    Discover the latest news, events, and stories from Southern Alberta.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Featured Article */}
                {featuredArticle && (
                    <section className="w-full py-6">
                        <div className="container mx-auto px-4 md:px-6">
                            <Link href={getArticleUrl(featuredArticle)} className="group block">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
                                    <div className="relative aspect-video overflow-hidden rounded-lg">
                                        <Image
                                            src={featuredArticle.imageUrl || '/placeholder.svg'}
                                            alt={featuredArticle.title}
                                            fill
                                            className="object-cover transition-transform group-hover:scale-105"
                                        />
                                    </div>
                                    <div className="space-y-4">
                                        <div className="inline-block px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                                            Featured
                                        </div>
                                        <h2 className="text-3xl font-bold tracking-tight group-hover:text-primary transition-colors">
                                            {featuredArticle.title}
                                        </h2>
                                        <p className="text-muted-foreground line-clamp-3">
                                            {featuredArticle.excerpt}
                                        </p>
                                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                <Calendar className="h-4 w-4" />
                                                {formatDate(featuredArticle.date || featuredArticle.createdAt || '')}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <MapPin className="h-4 w-4" />
                                                Lethbridge
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        </div>
                    </section>
                )}

                {/* Trending Section */}
                {trendingArticles.length > 0 && (
                    <section className="w-full py-6 bg-muted/40">
                        <div className="container mx-auto px-4 md:px-6">
                            <h2 className="text-2xl font-bold mb-6">Trending in Lethbridge</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {trendingArticles.map((article) => (
                                    <Link key={article.id} href={getArticleUrl(article)} className="group">
                                        <div className="space-y-3">
                                            <div className="relative aspect-video overflow-hidden rounded-lg">
                                                <Image
                                                    src={article.imageUrl || '/placeholder.svg'}
                                                    alt={article.title}
                                                    fill
                                                    className="object-cover transition-transform group-hover:scale-105"
                                                />
                                            </div>
                                            <h3 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors">
                                                {article.title}
                                            </h3>
                                            <p className="text-sm text-muted-foreground line-clamp-2">
                                                {article.excerpt}
                                            </p>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </section>
                )}

                {/* Category Tabs */}
                <section className="w-full py-12">
                    <div className="container mx-auto px-4 md:px-6">
                        <Tabs defaultValue="all" className="w-full">
                            <div className="mb-6 overflow-x-auto -mx-4 px-4 pb-1">
                                <TabsList className="inline-flex min-w-max">
                                    <TabsTrigger value="all">All</TabsTrigger>
                                    <TabsTrigger value="top">Top Stories</TabsTrigger>
                                    <TabsTrigger value="food">Food & Drink</TabsTrigger>
                                    <TabsTrigger value="culture">Arts & Culture</TabsTrigger>
                                    <TabsTrigger value="sports">Sports</TabsTrigger>
                                    <TabsTrigger value="realestate">Real Estate</TabsTrigger>
                                    <TabsTrigger value="crime">Crime</TabsTrigger>
                                    <TabsTrigger value="politics">Politics</TabsTrigger>
                                </TabsList>
                            </div>

                            {[
                                { value: 'all', label: null, items: articles.slice(0, 6) },
                                { value: 'top', label: 'Top Story', badge: 'bg-blue-100 text-blue-800', items: topStories },
                                { value: 'food', label: 'Food & Drink', badge: 'bg-orange-100 text-orange-800', items: foodDrinkArticles.slice(0, 6) },
                                { value: 'culture', label: 'Arts & Culture', badge: 'bg-purple-100 text-purple-800', items: cultureArticles.slice(0, 6) },
                                { value: 'sports', label: 'Sports', badge: 'bg-yellow-100 text-yellow-800', items: sportsArticles.slice(0, 6) },
                                { value: 'realestate', label: 'Real Estate', badge: 'bg-teal-100 text-teal-800', items: realEstateArticles.slice(0, 6) },
                                { value: 'crime', label: 'Crime', badge: 'bg-red-100 text-red-800', items: crimeArticles.slice(0, 6) },
                                { value: 'politics', label: 'Politics', badge: 'bg-gray-100 text-gray-800', items: politicsArticles.slice(0, 6) },
                            ].map(({ value, label, badge, items }) => (
                                <TabsContent key={value} value={value} className="mt-4">
                                    {items.length > 0 ? (
                                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                            {items.map((article) => (
                                                <Link key={article.id} href={getArticleUrl(article)} className="group block">
                                                    <div className="overflow-hidden rounded-lg">
                                                        <div className="aspect-[4/3] w-full bg-gray-200">
                                                            <Image src={article.imageUrl || '/placeholder.svg'} alt={article.title} width={400} height={300} className="w-full h-full object-cover" loading="lazy" />
                                                        </div>
                                                    </div>
                                                    <div className="mt-2 space-y-1">
                                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                            {label && <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge}`}>{label}</span>}
                                                            <span>{formatDate(article.date || article.createdAt || '')}</span>
                                                        </div>
                                                        <h3 className="font-bold group-hover:text-primary">{article.title}</h3>
                                                        <p className="text-sm text-muted-foreground line-clamp-2">{article.excerpt}</p>
                                                    </div>
                                                </Link>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-center text-muted-foreground py-12">No {label || 'articles'} yet. Check back soon!</p>
                                    )}
                                </TabsContent>
                            ))}
                        </Tabs>
                    </div>
                </section>
            </main>
        </div>
    )
}
