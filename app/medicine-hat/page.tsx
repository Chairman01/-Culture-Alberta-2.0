import Link from "next/link"
import Image from "next/image"
import { Calendar, MapPin } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getArticleUrl } from '@/lib/utils/article-url'
import { getMedicineHatArticles } from '@/lib/alberta-cities'
import { Article } from "@/lib/types/article"
import { Metadata } from 'next'
import NewsletterSignup from "@/components/newsletter-signup"

export const metadata: Metadata = {
    title: 'Medicine Hat - Culture Alberta',
    description: "Discover the latest news, events, and stories from Medicine Hat. Explore Southeastern Alberta's vibrant culture, attractions, and local happenings.",
    openGraph: {
        title: 'Medicine Hat - Culture Alberta',
        description: "Discover the latest news, events, and stories from Medicine Hat.",
        url: 'https://www.culturealberta.com/medicine-hat',
    },
}

export const revalidate = 0
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

interface MedicineHatArticle extends Article {
    type?: string
}

async function getMedicineHatData() {
    try {
        console.log('🔄 Loading Medicine Hat articles...')

        const allContent = await getMedicineHatArticles() as MedicineHatArticle[]
        const articles = allContent.filter(item => item.type !== 'event')

        console.log(`✅ Medicine Hat articles loaded: ${articles.length}`)

        const sortedArticles = articles.sort((a, b) => {
            const dateA = new Date(a.date || a.createdAt || 0).getTime()
            const dateB = new Date(b.date || b.createdAt || 0).getTime()
            return dateB - dateA
        })

        const featuredArticle = sortedArticles[0] || null
        const trendingArticles = sortedArticles.slice(0, 4)

        return { articles: sortedArticles, featuredArticle, trendingArticles }
    } catch (error) {
        console.error('❌ Error loading Medicine Hat data:', error)
        return { articles: [], featuredArticle: null, trendingArticles: [] }
    }
}

export default async function MedicineHatPage() {
    const { articles, featuredArticle, trendingArticles } = await getMedicineHatData()

    const formatDate = (dateString: string) => {
        try {
            const date = new Date(dateString)
            return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
        } catch {
            return 'Recently'
        }
    }

    const foodDrinkArticles = articles.filter(a =>
        a.category?.toLowerCase().includes('food') || a.category?.toLowerCase().includes('drink') || a.category?.toLowerCase().includes('restaurant')
    )

    const cultureArticles = articles.filter(a =>
        a.category?.toLowerCase().includes('culture') || a.category?.toLowerCase().includes('art') || a.category?.toLowerCase().includes('music') || a.category?.toLowerCase().includes('theater')
    )

    const outdoorsArticles = articles.filter(a =>
        a.category?.toLowerCase().includes('outdoor') || a.category?.toLowerCase().includes('nature') || a.category?.toLowerCase().includes('park')
    )

    return (
        <div className="flex min-h-screen flex-col">
            <main className="flex-1">
                <section className="w-full py-6 bg-amber-50">
                    <div className="container mx-auto px-4 md:px-6">
                        <div className="flex flex-col items-center justify-center space-y-2 text-center">
                            <div className="space-y-1">
                                <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl">Medicine Hat</h1>
                                <p className="max-w-[900px] text-muted-foreground md:text-xl mx-auto">
                                    Discover the latest news, events, and stories from Southeastern Alberta.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {featuredArticle && (
                    <section className="w-full py-6">
                        <div className="container mx-auto px-4 md:px-6">
                            <Link href={getArticleUrl(featuredArticle)} className="group block">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
                                    <div className="relative aspect-video overflow-hidden rounded-lg">
                                        <Image src={featuredArticle.imageUrl || '/placeholder.svg'} alt={featuredArticle.title} fill className="object-cover transition-transform group-hover:scale-105" />
                                    </div>
                                    <div className="space-y-4">
                                        <div className="inline-block px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">Featured</div>
                                        <h2 className="text-3xl font-bold tracking-tight group-hover:text-primary transition-colors">{featuredArticle.title}</h2>
                                        <p className="text-muted-foreground line-clamp-3">{featuredArticle.excerpt}</p>
                                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                            <span className="flex items-center gap-1"><Calendar className="h-4 w-4" />{formatDate(featuredArticle.date || featuredArticle.createdAt || '')}</span>
                                            <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />Medicine Hat</span>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        </div>
                    </section>
                )}

                {trendingArticles.length > 0 && (
                    <section className="w-full py-6 bg-muted/40">
                        <div className="container mx-auto px-4 md:px-6">
                            <h2 className="text-2xl font-bold mb-6">Trending in Medicine Hat</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {trendingArticles.map((article) => (
                                    <Link key={article.id} href={getArticleUrl(article)} className="group">
                                        <div className="space-y-3">
                                            <div className="relative aspect-video overflow-hidden rounded-lg">
                                                <Image src={article.imageUrl || '/placeholder.svg'} alt={article.title} fill className="object-cover transition-transform group-hover:scale-105" />
                                            </div>
                                            <h3 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors">{article.title}</h3>
                                            <p className="text-sm text-muted-foreground line-clamp-2">{article.excerpt}</p>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </section>
                )}

                {/* Newsletter Signup */}
                <section className="w-full py-8 bg-amber-50/60">
                    <div className="container mx-auto px-4 md:px-6 max-w-xl">
                        <NewsletterSignup
                            defaultCity="medicine-hat"
                            title="The Hat — Medicine Hat Newsletter"
                            description="Get the latest culture, food, and events from Medicine Hat and Southeastern Alberta delivered to your inbox."
                        />
                    </div>
                </section>

                <section className="w-full py-12">
                    <div className="container mx-auto px-4 md:px-6">
                        <Tabs defaultValue="all" className="w-full">
                            <TabsList className="grid w-full grid-cols-4 mb-8">
                                <TabsTrigger value="all">All Stories</TabsTrigger>
                                <TabsTrigger value="food">Food & Drink</TabsTrigger>
                                <TabsTrigger value="culture">Arts & Culture</TabsTrigger>
                                <TabsTrigger value="outdoors">Outdoors</TabsTrigger>
                            </TabsList>

                            <TabsContent value="all" className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {articles.slice(0, 12).map((article) => (
                                        <Link key={article.id} href={getArticleUrl(article)} className="group">
                                            <div className="space-y-3">
                                                <div className="relative aspect-video overflow-hidden rounded-lg">
                                                    <Image src={article.imageUrl || '/placeholder.svg'} alt={article.title} fill className="object-cover transition-transform group-hover:scale-105" />
                                                </div>
                                                <div className="space-y-2">
                                                    <h3 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors">{article.title}</h3>
                                                    <p className="text-sm text-muted-foreground line-clamp-2">{article.excerpt}</p>
                                                    <div className="text-xs text-muted-foreground">{formatDate(article.date || article.createdAt || '')}</div>
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </TabsContent>

                            <TabsContent value="food" className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {foodDrinkArticles.slice(0, 12).map((article) => (
                                        <Link key={article.id} href={getArticleUrl(article)} className="group">
                                            <div className="space-y-3">
                                                <div className="relative aspect-video overflow-hidden rounded-lg">
                                                    <Image src={article.imageUrl || '/placeholder.svg'} alt={article.title} fill className="object-cover transition-transform group-hover:scale-105" />
                                                </div>
                                                <div className="space-y-2">
                                                    <h3 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors">{article.title}</h3>
                                                    <p className="text-sm text-muted-foreground line-clamp-2">{article.excerpt}</p>
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                                {foodDrinkArticles.length === 0 && <p className="text-center text-muted-foreground py-12">No Food & Drink articles yet. Check back soon!</p>}
                            </TabsContent>

                            <TabsContent value="culture" className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {cultureArticles.slice(0, 12).map((article) => (
                                        <Link key={article.id} href={getArticleUrl(article)} className="group">
                                            <div className="space-y-3">
                                                <div className="relative aspect-video overflow-hidden rounded-lg">
                                                    <Image src={article.imageUrl || '/placeholder.svg'} alt={article.title} fill className="object-cover transition-transform group-hover:scale-105" />
                                                </div>
                                                <div className="space-y-2">
                                                    <h3 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors">{article.title}</h3>
                                                    <p className="text-sm text-muted-foreground line-clamp-2">{article.excerpt}</p>
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                                {cultureArticles.length === 0 && <p className="text-center text-muted-foreground py-12">No Arts & Culture articles yet. Check back soon!</p>}
                            </TabsContent>

                            <TabsContent value="outdoors" className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {outdoorsArticles.slice(0, 12).map((article) => (
                                        <Link key={article.id} href={getArticleUrl(article)} className="group">
                                            <div className="space-y-3">
                                                <div className="relative aspect-video overflow-hidden rounded-lg">
                                                    <Image src={article.imageUrl || '/placeholder.svg'} alt={article.title} fill className="object-cover transition-transform group-hover:scale-105" />
                                                </div>
                                                <div className="space-y-2">
                                                    <h3 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors">{article.title}</h3>
                                                    <p className="text-sm text-muted-foreground line-clamp-2">{article.excerpt}</p>
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                                {outdoorsArticles.length === 0 && <p className="text-center text-muted-foreground py-12">No Outdoors articles yet. Check back soon!</p>}
                            </TabsContent>
                        </Tabs>
                    </div>
                </section>
            </main>
        </div>
    )
}
