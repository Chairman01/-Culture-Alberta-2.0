'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

interface Article {
  id: string
  title: string
  slug?: string
  imageUrl?: string
  category?: string
  date?: string
  createdAt?: string
  excerpt?: string
}

interface ArticleFeedProps {
  articles: Article[]
}

const PAGE_SIZE = 12

function formatDate(dateStr?: string) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function ArticleFeed({ articles }: ArticleFeedProps) {
  const [visible, setVisible] = useState(PAGE_SIZE)

  const shown = articles.slice(0, visible)
  const hasMore = visible < articles.length

  return (
    <>
      <div className="flex flex-col gap-3 px-4 pb-4">
        {shown.map((article) => {
          const href = `/articles/${article.slug || article.id}`
          const date = formatDate(article.date || article.createdAt)

          return (
            <Link
              key={article.id}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex gap-3 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow active:scale-[0.98] transition-transform"
            >
              {article.imageUrl ? (
                <div className="relative w-24 h-24 shrink-0">
                  <Image
                    src={article.imageUrl}
                    alt={article.title}
                    fill
                    className="object-cover"
                    sizes="96px"
                  />
                </div>
              ) : (
                <div className="w-24 h-24 shrink-0 bg-gray-100 flex items-center justify-center text-gray-300">
                  <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
                    <rect width="24" height="24" rx="4" fill="currentColor" />
                  </svg>
                </div>
              )}

              <div className="flex flex-col justify-center py-2 pr-3 gap-1 min-w-0">
                {article.category && (
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 truncate">
                    {article.category}
                  </span>
                )}
                <span className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2">
                  {article.title}
                </span>
                {date && (
                  <span className="text-[11px] text-gray-400">{date}</span>
                )}
              </div>
            </Link>
          )
        })}
      </div>

      {hasMore && (
        <div className="flex justify-center pb-8 px-4">
          <button
            onClick={() => setVisible((v) => v + PAGE_SIZE)}
            className="w-full max-w-xs py-3 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700 transition-colors"
          >
            Load more
          </button>
        </div>
      )}
    </>
  )
}
