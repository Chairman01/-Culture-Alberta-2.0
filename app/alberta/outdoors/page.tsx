import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft } from 'lucide-react'
import { getArticleUrl } from '@/lib/utils/article-url'
import { getAllAlbertaArticles } from '@/lib/alberta-cities'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Outdoors - Around Alberta - Culture Alberta',
  description: "Outdoor adventures and nature stories from communities across Alberta.",
}

export const dynamic = 'force-dynamic'
export const revalidate = 300

export default async function AlbertaOutdoorsPage() {
  const allArticles = await getAllAlbertaArticles()
  const articles = allArticles
    .filter((a) => a.type !== 'event' && a.type !== 'Event')
    .filter((a) => a.category?.toLowerCase().includes('outdoor'))
    .sort((a, b) => new Date(b.date || b.createdAt || 0).getTime() - new Date(a.date || a.createdAt || 0).getTime())

  const formatDate = (s: string) => {
    try {
      const d = new Date(s)
      const now = new Date()
      const diff = Math.ceil((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
      if (diff === 1) return '1 day ago'
      if (diff < 7) return `${diff} days ago`
      if (diff < 14) return '1 week ago'
      return '3 weeks ago'
    } catch {
      return 'Recently'
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        <section className="w-full py-6 bg-amber-50">
          <div className="container mx-auto px-4 md:px-6">
            <Link href="/alberta" className="inline-flex items-center gap-2 text-amber-700 hover:text-amber-800 font-medium mb-4">
              <ArrowLeft className="w-4 h-4" /> Back to Around Alberta
            </Link>
            <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl text-amber-800">Outdoors</h1>
            <p className="mt-2 text-muted-foreground md:text-xl">Outdoor adventures from across Alberta</p>
          </div>
        </section>
        <section className="w-full py-8">
          <div className="container mx-auto px-4 md:px-6">
            {articles.length > 0 ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {articles.map((article) => (
                  <Link key={article.id} href={getArticleUrl(article)} className="group block">
                    <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all">
                      <div className="aspect-[4/3] relative">
                        <Image
                          src={article.imageUrl || '/placeholder.svg'}
                          alt={article.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>
                      <div className="p-4">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                          <span className="rounded-full bg-amber-100 text-amber-800 px-2.5 py-0.5 font-semibold">{article.category}</span>
                          <span>{formatDate(article.date || '')}</span>
                        </div>
                        <h3 className="font-bold text-lg group-hover:text-amber-700 line-clamp-2">{article.title}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{article.excerpt}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-12">No Outdoors articles yet.</p>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}
