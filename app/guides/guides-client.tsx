/**
 * Guides Client Component
 * 
 * Handles client-side filtering and tab navigation for guides
 * 
 * @param guides - Array of guide articles
 */

"use client"

import Link from 'next/link'
import Image from 'next/image'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getArticleUrl } from '@/lib/utils/article-url'
import { formatRelativeDate } from '@/lib/utils/date'
import { getArticleTitle, getArticleExcerpt, getArticleImage, getArticleCategory } from '@/lib/utils/article-helpers'
import { Article } from '@/lib/types/article'

interface GuidesClientProps {
  guides: Article[]
}

/**
 * Guides Client Component
 * 
 * Provides interactive filtering by guide type
 */
export function GuidesClient({ guides }: GuidesClientProps) {
  // Filter guides by type
  const allGuides = guides
  const edmontonGuides = guides.filter(g => {
    const type = (g.type || '').toLowerCase()
    return type === 'edmonton-guide' || type.includes('edmonton')
  })
  const calgaryGuides = guides.filter(g => {
    const type = (g.type || '').toLowerCase()
    return type === 'calgary-guide' || type.includes('calgary')
  })
  const generalGuides = guides.filter(g => {
    const type = (g.type || '').toLowerCase()
    return type === 'guide' && !type.includes('edmonton') && !type.includes('calgary')
  })

  return (
    <Tabs defaultValue="all" className="w-full">
      <div className="flex items-center justify-between mb-6">
        <TabsList>
          <TabsTrigger value="all">All Guides ({allGuides.length})</TabsTrigger>
          <TabsTrigger value="edmonton">Edmonton ({edmontonGuides.length})</TabsTrigger>
          <TabsTrigger value="calgary">Calgary ({calgaryGuides.length})</TabsTrigger>
          <TabsTrigger value="general">General ({generalGuides.length})</TabsTrigger>
        </TabsList>
      </div>
      
      <TabsContent value="all" className="mt-6">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {allGuides.length > 0 ? (
            allGuides.map((article) => (
              <GuideCard key={article.id} article={article} />
            ))
          ) : (
            <EmptyState />
          )}
        </div>
      </TabsContent>
      
      <TabsContent value="edmonton" className="mt-6">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {edmontonGuides.length > 0 ? (
            edmontonGuides.map((article) => (
              <GuideCard key={article.id} article={article} />
            ))
          ) : (
            <EmptyState />
          )}
        </div>
      </TabsContent>
      
      <TabsContent value="calgary" className="mt-6">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {calgaryGuides.length > 0 ? (
            calgaryGuides.map((article) => (
              <GuideCard key={article.id} article={article} />
            ))
          ) : (
            <EmptyState />
          )}
        </div>
      </TabsContent>
      
      <TabsContent value="general" className="mt-6">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {generalGuides.length > 0 ? (
            generalGuides.map((article) => (
              <GuideCard key={article.id} article={article} />
            ))
          ) : (
            <EmptyState />
          )}
        </div>
      </TabsContent>
    </Tabs>
  )
}

/**
 * Guide Card Component
 * 
 * Reusable card component for displaying guide articles
 * 
 * @param article - Guide article object
 */
function GuideCard({ article }: { article: Article }) {
  return (
    <Link href={getArticleUrl(article)} className="group">
      <article className="overflow-hidden rounded-lg bg-white shadow-sm hover:shadow-md transition-all duration-300">
        <div className="aspect-[4/3] w-full bg-muted relative overflow-hidden">
          <Image
            src={getArticleImage(article)}
            alt={getArticleTitle(article)}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            loading="lazy"
            quality={75}
          />
        </div>
        <div className="mt-3 space-y-1 p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold">
              {getArticleCategory(article)}
            </span>
            <time dateTime={article.date || article.createdAt} className="text-xs">
              {formatRelativeDate(article.date || article.createdAt)}
            </time>
          </div>
          <h3 className="font-bold group-hover:text-primary transition-colors line-clamp-2">
            {getArticleTitle(article)}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {getArticleExcerpt(article, 100)}
          </p>
        </div>
      </article>
    </Link>
  )
}

/**
 * Empty State Component
 */
function EmptyState() {
  return (
    <div className="col-span-full text-center py-12">
      <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
        <span className="text-2xl" aria-hidden="true">📚</span>
      </div>
      <h3 className="font-semibold text-lg mb-2">No Guides Available</h3>
      <p className="text-gray-600 text-sm">Check back later for new travel guides.</p>
    </div>
  )
}


