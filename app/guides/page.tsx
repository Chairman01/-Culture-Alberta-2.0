"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { ArrowRight } from "lucide-react"
import { Article } from "@/lib/data"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getArticleUrl } from '@/lib/utils/article-url'

interface ExtendedArticle extends Article {
  description?: string;
  type?: string;
}

function ArticleCard({ article }: { article: ExtendedArticle }) {
  return (
    <Link href={getArticleUrl(article)} className="group">
      <div className="overflow-hidden rounded-lg">
        <div className="aspect-[4/3] w-full bg-muted relative">
          <Image
            src={article.image || "/placeholder.svg"}
            alt={article.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
      </div>
      <div className="mt-3 space-y-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold">
            {article.category}
          </span>
          <span>{article.date}</span>
        </div>
        <h3 className="font-bold group-hover:text-primary">{article.title}</h3>
        <p className="text-sm text-muted-foreground line-clamp-2">{article.excerpt || article.description}</p>
      </div>
    </Link>
  )
}

export default function GuidesPage() {
  const [articles, setArticles] = useState<ExtendedArticle[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadArticles()
  }, [])

  const loadArticles = () => {
    try {
      const keys = Object.keys(localStorage)
      const articleKeys = keys.filter(key => 
        (key.startsWith('article_') || key.startsWith('post_')) && 
        !key.includes('image_')
      )
      
      const allArticles: ExtendedArticle[] = []
      
      for (const key of articleKeys) {
        const savedJson = localStorage.getItem(key)
        if (savedJson) {
          const article = JSON.parse(savedJson)
          
          // Handle image loading
          if (article.image && article.image.startsWith('__BASE64_IMAGE_')) {
            const imageId = article.image.replace('__BASE64_IMAGE_', '').replace('__', '')
            const savedImage = localStorage.getItem(`post_image_${imageId}`) || 
                             localStorage.getItem(`article_image_${imageId}`)
            if (savedImage) {
              article.image = savedImage
            }
          }
          
          // Only include guide articles
          if (article.type?.toLowerCase().includes('guide')) {
            allArticles.push({
              ...article,
              id: article.id || key.replace('article_', '').replace('post_', ''),
              category: article.category || 'General',
              date: article.date || new Date().toISOString(),
              image: article.image || `/placeholder.svg`
            })
          }
        }
      }

      // Sort by date
      allArticles.sort((a, b) => {
        const dateA = new Date(a.date || 0).getTime()
        const dateB = new Date(b.date || 0).getTime()
        return dateB - dateA
      })

      setArticles(allArticles)
      setIsLoading(false)
    } catch (error) {
      console.error('Error loading articles:', error)
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black"></div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        <section className="w-full py-6 bg-muted/30">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl">Travel & City Guides</h1>
                <p className="max-w-[900px] text-muted-foreground md:text-xl">
                  Discover the best of Alberta's cities with our comprehensive guides.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="w-full py-6">
          <div className="container px-4 md:px-6">
            <Tabs defaultValue="all" className="w-full">
              <div className="flex items-center justify-between">
                <TabsList>
                  <TabsTrigger value="all">All Guides</TabsTrigger>
                  <TabsTrigger value="edmonton">Edmonton</TabsTrigger>
                  <TabsTrigger value="calgary">Calgary</TabsTrigger>
                  <TabsTrigger value="general">General</TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="all" className="mt-6">
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {articles.map((article, index) => (
                    <ArticleCard key={`all-${article.id}-${index}`} article={article} />
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="edmonton" className="mt-6">
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {articles
                    .filter((article) => article.type?.toLowerCase() === 'edmonton-guide')
                    .map((article, index) => (
                      <ArticleCard key={`edmonton-${article.id}-${index}`} article={article} />
                    ))}
                </div>
              </TabsContent>
              <TabsContent value="calgary" className="mt-6">
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {articles
                    .filter((article) => article.type?.toLowerCase() === 'calgary-guide')
                    .map((article, index) => (
                      <ArticleCard key={`calgary-${article.id}-${index}`} article={article} />
                    ))}
                </div>
              </TabsContent>
              <TabsContent value="general" className="mt-6">
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {articles
                    .filter((article) => article.type?.toLowerCase() === 'guide')
                    .map((article, index) => (
                      <ArticleCard key={`general-${article.id}-${index}`} article={article} />
                    ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </section>
      </main>
    </div>
  )
} 