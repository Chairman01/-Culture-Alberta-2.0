"use client"

import { useEffect, useState } from "react"
import { Eye } from "lucide-react"

interface ArticleViewCountProps {
  slug: string
  articleTitle?: string
  className?: string
}

export function ArticleViewCount({ slug, articleTitle, className = "" }: ArticleViewCountProps) {
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    if (!slug) return

    // Track this view
    try {
      import('@/lib/analytics').then(({ trackArticleView }) => {
        trackArticleView(slug, articleTitle || slug)
      }).catch(() => {})
    } catch {}

    // Fetch view count
    fetch(`/api/articles/views?slug=${encodeURIComponent(slug)}`)
      .then(r => r.json())
      .then(data => setCount(data.count || 0))
      .catch(() => setCount(null))
  }, [slug, articleTitle])

  if (count === null) return null

  return (
    <span className={`inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full ${className}`}>
      <Eye className="w-4 h-4" />
      {count.toLocaleString()} {count === 1 ? 'view' : 'views'}
    </span>
  )
}
