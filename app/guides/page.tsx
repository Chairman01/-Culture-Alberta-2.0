/**
 * Optimized Guides Page
 * 
 * Performance optimizations:
 * - Uses ISR (Incremental Static Regeneration) for fast loads
 * - Server-side data fetching (no localStorage)
 * - Optimized images with Next.js Image component
 * - No console.logs in production
 * - Client-side filtering for interactivity
 * 
 * Caching strategy:
 * - Revalidates every 300 seconds (5 minutes)
 * - Falls back to cached version if fetch fails
 * 
 * Used as: Guides listing page (/guides)
 */

import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'
import { PageSEO } from '@/components/seo/page-seo'
import { getArticleUrl } from '@/lib/utils/article-url'
import { getAllArticles } from '@/lib/articles'
import { formatRelativeDate } from '@/lib/utils/date'
import { getArticleTitle, getArticleExcerpt, getArticleImage, getArticleCategory, sortArticlesByDate } from '@/lib/utils/article-helpers'
import { Article } from '@/lib/types/article'
import { GuidesClient } from './guides-client'

// PERFORMANCE: Use ISR instead of client-side rendering
// PERFORMANCE: Use ISR with aggressive caching for instant loads
// Revalidates every 2 minutes - faster updates while maintaining speed
export const revalidate = 120

/**
 * Guides Page Component
 * 
 * Displays travel and city guides for Alberta
 */
export default async function GuidesPage() {
  const allArticles = await getAllArticles()
  
  // PERFORMANCE: Remove content field for listings (not needed for guide cards)
  const articlesWithoutContent = allArticles.map(article => ({
    ...article,
    content: undefined
  }))
  
  // Filter for guide articles
  const guideArticles = articlesWithoutContent.filter((article: Article) => {
    const type = (article.type || '').toLowerCase()
    const category = (article.category || '').toLowerCase()
    return type.includes('guide') || category.includes('guide')
  })
  
  // PERFORMANCE: Sort once
  const sortedGuides = sortArticlesByDate(guideArticles)

  return (
    <>
      <PageSEO
        title="Travel & City Guides - Culture Alberta"
        description="Discover the best of Alberta's cities with our comprehensive guides. Explore Edmonton, Calgary, and more with expert travel recommendations."
      />
      <div className="flex min-h-screen flex-col">
        <main className="flex-1">
          {/* Hero Section */}
          <section className="w-full py-6 bg-muted/30">
            <div className="container px-4 md:px-6">
              <div className="flex flex-col items-center justify-center space-y-4 text-center">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl">
                    Travel & City Guides
                  </h1>
                  <p className="max-w-[900px] text-muted-foreground md:text-xl">
                    Discover the best of Alberta's cities with our comprehensive guides.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Guides Content - Client Component for Filtering */}
          <section className="w-full py-6">
            <div className="container px-4 md:px-6">
              <GuidesClient guides={sortedGuides} />
            </div>
          </section>
        </main>
      </div>
    </>
  )
}
