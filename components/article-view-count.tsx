"use client"

import { useEffect, useState } from "react"
import { Eye } from "lucide-react"

interface ArticleViewCountProps {
  slug: string
  articleTitle?: string
  className?: string
}

const countCache = new Map<string, number>()
const countRequests = new Map<string, Promise<number | null>>()

export function ArticleViewCount({ slug, articleTitle, className = "" }: ArticleViewCountProps) {
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    if (!slug) return

    const cachedCount = countCache.get(slug)
    if (cachedCount !== undefined) {
      setCount(cachedCount)
      return
    }

    const sessionKey = `article_view_counted:${slug}`
    const shouldIncrement = typeof window !== 'undefined' && !sessionStorage.getItem(sessionKey)
    if (shouldIncrement) {
      sessionStorage.setItem(sessionKey, '1')
    }

    const existingRequest = countRequests.get(slug)
    const request = existingRequest || fetch(`/api/articles/views?slug=${encodeURIComponent(slug)}&increment=${shouldIncrement ? '1' : '0'}`)
      .then(r => r.json())
      .then(data => {
        const nextCount = data.count || 0
        countCache.set(slug, nextCount)
        countRequests.delete(slug)
        return nextCount
      })
      .catch(() => {
        countRequests.delete(slug)
        return null
      })

    if (!existingRequest) {
      countRequests.set(slug, request)
    }

    request.then(nextCount => setCount(nextCount))
  }, [slug])

  // Render invisible placeholder while loading to prevent layout shift.
  // The span occupies the same space so nothing in the flex row moves.
  if (count === null) return (
    <span className={`inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full invisible ${className}`} aria-hidden="true">
      <Eye className="w-4 h-4" />
      0 views
    </span>
  )

  return (
    <span className={`inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full ${className}`}>
      <Eye className="w-4 h-4" />
      {count.toLocaleString()} {count === 1 ? 'view' : 'views'}
    </span>
  )
}
