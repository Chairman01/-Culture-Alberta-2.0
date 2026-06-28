import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft } from 'lucide-react'
import { getAlbertaCityArticles } from '@/lib/alberta-cities'
import { isRegularArticle } from '@/lib/utils/article-filters'
import { getArticleUrl } from '@/lib/utils/article-url'
import { Article } from '@/lib/types/article'
import type { CityPageConfig } from '@/lib/city-pages'

interface CityArticle extends Article {
    type?: string
    location?: string
}

function formatDate(dateString: string): string {
    try {
        const date = new Date(dateString)
        const diffDays = Math.ceil(Math.abs(Date.now() - date.getTime()) / (1000 * 60 * 60 * 24))
        if (diffDays === 1) return '1 day ago'
        if (diffDays < 7) return `${diffDays} days ago`
        if (diffDays < 14) return '1 week ago'
        if (diffDays < 31) return `${Math.floor(diffDays / 7)} weeks ago`
        return date.toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' })
    } catch {
        return 'Recently'
    }
}

export async function CityAllArticles({ config }: { config: CityPageConfig }) {
    const all = (await getAlbertaCityArticles(config.eventLocation)) as CityArticle[]
    const articles = all
        .filter((item) => item.type !== 'event' && item.type !== 'Event')
        .filter(isRegularArticle)

    return (
        <div className="flex min-h-screen flex-col">
            <main className="flex-1">
                <section className="w-full py-6 bg-blue-50">
                    <div className="container mx-auto px-4 md:px-6">
                        <div className="flex items-center gap-4 mb-4">
                            <Link href={`/${config.slug}`} className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium">
                                <ArrowLeft className="w-4 h-4" />
                                Back to {config.name}
                            </Link>
                        </div>
                        <div className="flex flex-col items-center justify-center space-y-2 text-center">
                            <div className="space-y-1">
                                <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl text-blue-600">All {config.name} Articles</h1>
                                <p className="max-w-[900px] text-muted-foreground md:text-xl mx-auto">
                                    Discover all {articles.length} articles about {config.name}, {config.region}.
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
                                                <Image src={article.imageUrl || '/placeholder.svg'} alt={article.title} width={400} height={300} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                            </div>
                                            <div className="p-4">
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                                                    <span className="rounded-full bg-blue-100 text-blue-800 px-2.5 py-0.5 text-xs font-semibold">{article.category}</span>
                                                    <span>{formatDate(article.date || '')}</span>
                                                </div>
                                                <h3 className="font-bold text-lg group-hover:text-blue-600 transition-colors duration-300 line-clamp-2 leading-tight mb-2">{article.title}</h3>
                                                <p className="text-sm text-muted-foreground line-clamp-3">{article.excerpt}</p>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4"><span className="text-2xl">📰</span></div>
                                <h3 className="font-semibold text-lg mb-2">No Articles Found</h3>
                                <p className="text-gray-600 text-sm">Check back later for new {config.name} articles.</p>
                            </div>
                        )}
                    </div>
                </section>
            </main>
        </div>
    )
}
