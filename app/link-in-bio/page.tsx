import Link from 'next/link'
import { getFastArticles } from '@/lib/fast-articles'
import ArticleFeed from './ArticleFeed'

export const revalidate = 300

export const metadata = {
  title: 'Culture Alberta — Link in Bio',
  description: 'The latest stories from Culture Alberta.',
  robots: { index: false },
}

export default async function LinkInBioPage() {
  let articles: any[] = []

  try {
    const all = await getFastArticles()
    articles = all
      .filter((a: any) => a.status === 'published' && a.type !== 'event')
      .sort((a: any, b: any) => {
        const da = new Date(a.date || a.createdAt || 0).getTime()
        const db = new Date(b.date || b.createdAt || 0).getTime()
        return db - da
      })
      .slice(0, 200)
  } catch {
    articles = []
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between shadow-sm">
        <span className="text-xl font-bold text-gray-900 tracking-tight">Culture Alberta</span>
        <Link
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium px-4 py-1.5 rounded-full bg-gray-900 text-white hover:bg-gray-700 transition-colors"
        >
          Visit site
        </Link>
      </div>

      {/* Intro */}
      <div className="px-4 py-5 text-center">
        <p className="text-sm text-gray-500">Alberta&apos;s latest stories</p>
      </div>

      {/* Article feed */}
      <ArticleFeed articles={articles} />

      {/* Footer */}
      <div className="text-center text-xs text-gray-400 pb-8">
        <Link href="/" target="_blank" className="hover:underline">culturealberta.com</Link>
      </div>
    </div>
  )
}
