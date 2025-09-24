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

  const loadItem = useCallback(() => {
    if (!resolvedParams) return
    
    try {
      const keys = Object.keys(localStorage)
      const postKeys = keys.filter(key => key.startsWith('post_') && !key.includes('image_'))
      const articleKeys = keys.filter(key => key.startsWith('article_') && !key.includes('image_'))

      // Find the current item
      for (const key of [...postKeys, ...articleKeys]) {
        const itemId = key.replace('post_', '').replace('article_', '')
        
        if (itemId === resolvedParams.id) {
          const savedJson = localStorage.getItem(key)
          if (savedJson) {
            const item = JSON.parse(savedJson)
            
            // Handle image loading
            if (item.image && item.image.startsWith('__BASE64_IMAGE_')) {
              const imageId = item.image.replace('__BASE64_IMAGE_', '').replace('__', '')
              const savedImage = localStorage.getItem(`post_image_${imageId}`) || 
                               localStorage.getItem(`article_image_${imageId}`)
              if (savedImage) {
                item.image = savedImage
              }
            }
            
            setItem(item)
            break
          }
        }
      }

      // Find related items
      const relatedItems: ExtendedArticle[] = []
      for (const key of [...postKeys, ...articleKeys]) {
        if (key.replace('post_', '').replace('article_', '') !== resolvedParams.id) {
          const savedJson = localStorage.getItem(key)
          if (savedJson) {
            const item = JSON.parse(savedJson)
            if (item.category?.toLowerCase() === resolvedParams.category.toLowerCase()) {
              // Handle image loading
              if (item.image && item.image.startsWith('__BASE64_IMAGE_')) {
                const imageId = item.image.replace('__BASE64_IMAGE_', '').replace('__', '')
                const savedImage = localStorage.getItem(`post_image_${imageId}`) || 
                                 localStorage.getItem(`article_image_${imageId}`)
                if (savedImage) {
                  item.image = savedImage
                }
              }
              
              relatedItems.push(item)
            }
          }
        }
      }

      // Sort related items by date and limit to 3
      relatedItems.sort((a, b) => {
        const dateA = new Date(a.date || 0).getTime()
        const dateB = new Date(b.date || 0).getTime()
        return dateB - dateA
      })
      setRelatedItems(relatedItems.slice(0, 3))

    } catch (error) {
      console.error('Error loading item:', error)
    }
    setIsLoading(false)
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
