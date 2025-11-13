"use client"

import { useState, useEffect, useCallback, use } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, Calendar, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Article } from '@/lib/data'
import { ArticleSEO } from '@/components/seo/article-seo'

interface ExtendedArticle extends Partial<Article> {
  name?: string;
  description?: string;
  rating?: number;
  content?: string;
  contact?: string;
  location?: string;
  image?: string;
}

interface PageParams {
  category: string;
  id: string;
}

export default function BestOfDetailPage({ params }: { params: Promise<PageParams> }) {
  const [resolvedParams, setResolvedParams] = useState<PageParams | null>(null)
  
  // Handle async params
  useEffect(() => {
    params.then((params) => setResolvedParams(params))
  }, [params])
  const [item, setItem] = useState<ExtendedArticle | null>(null)
  const [relatedItems, setRelatedItems] = useState<ExtendedArticle[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const category = resolvedParams?.category ? resolvedParams.category.charAt(0).toUpperCase() + resolvedParams.category.slice(1) : ""

  const loadItem = useCallback(async () => {
    if (!resolvedParams) return
    
    try {
      setIsLoading(true)
      
      // PERFORMANCE: Use optimized API endpoint instead of localStorage
      const params = new URLSearchParams({
        category: resolvedParams.category,
        limit: '50' // Get enough to find the item and related items
      })
      
      const response = await fetch(`/api/best-of?${params.toString()}`)
      
      if (response.ok) {
        const data = await response.json()
        const allItems = data.articles || []
        
        // Find the current item by ID
        const foundItem = allItems.find((item: any) => item.id === resolvedParams.id)
        
        if (foundItem) {
          setItem(foundItem)
          
          // Find related items (same category, different ID)
          const related = allItems
            .filter((item: any) => 
              item.id !== resolvedParams.id && 
              item.category?.toLowerCase() === resolvedParams.category.toLowerCase()
            )
            .sort((a: any, b: any) => {
              const dateA = new Date(a.date || a.createdAt || 0).getTime()
              const dateB = new Date(b.date || b.createdAt || 0).getTime()
              return dateB - dateA
            })
            .slice(0, 3)
          
          setRelatedItems(related)
        }
      }
    } catch (error) {
      console.error('Error loading item:', error)
    } finally {
      setIsLoading(false)
    }
  }, [resolvedParams?.id, resolvedParams?.category])

  useEffect(() => {
    loadItem();
  }, [loadItem])

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!item) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Item not found</h1>
          <p className="text-muted-foreground mb-4">The item you're looking for doesn't exist or has been removed.</p>
          <Button asChild>
            <Link href="/best-of">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Best Of
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <>
      {item && (
        <ArticleSEO
          title={item.title || ""}
          description={item.excerpt || item.description || ""}
          url={`/best-of/${resolvedParams?.category}/${resolvedParams?.id}`}
          image={item.image}
          publishedTime={item.date}
          author="Culture Alberta"
          section={category}
          tags={[category, item.location].filter(Boolean) as string[]}
          category={category}
        />
      )}
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Button variant="ghost" asChild>
            <Link href="/best-of">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Best Of
            </Link>
          </Button>
        </div>

      <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
        <div>
          <div className="aspect-video w-full relative rounded-lg overflow-hidden mb-6">
            <Image
              src={item.image || "/placeholder.svg"}
              alt={item.title || ""}
              fill
              className="object-cover"
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold">
                {category}
              </span>
              {item.date && (
                <span className="text-sm text-muted-foreground">
                  {item.date}
                </span>
              )}
            </div>

            <h1 className="text-3xl font-bold">{item.title}</h1>
            
            {item.excerpt && (
              <p className="text-lg text-muted-foreground">
                {item.excerpt}
              </p>
            )}

            {item.content && (
              <div className="prose max-w-none">
                {item.content}
              </div>
            )}

            {item.location && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{item.location}</span>
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="rounded-lg border bg-card p-4">
            <h2 className="font-bold mb-4">Related Items</h2>
            <div className="space-y-4">
              {relatedItems.map((relatedItem) => (
                <Link
                  key={relatedItem.id}
                  href={`/best-of/${resolvedParams?.category}/${relatedItem.id}`}
                  className="block group"
                >
                  <div className="aspect-video relative rounded-lg overflow-hidden mb-2">
                    <Image
                      src={relatedItem.image || "/placeholder.svg"}
                      alt={relatedItem.title || ""}
                      fill
                      className="object-cover transition-transform group-hover:scale-105"
                    />
                  </div>
                  <h3 className="font-medium group-hover:text-primary">
                    {relatedItem.title}
                  </h3>
                  {relatedItem.date && (
                    <p className="text-sm text-muted-foreground">
                      {relatedItem.date}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  )
}
