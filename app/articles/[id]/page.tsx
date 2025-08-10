"use client"

import { useState, useEffect } from 'react'
import { Calendar, Clock } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { getPostById } from '@/lib/posts'
import { use } from 'react'

interface ExtendedArticle {
  id: string;
  title: string;
  image?: string;
  category?: string;
  location?: string;
  date?: string;
  readTime?: string;
  excerpt?: string;
  description?: string;
  content?: string;
  type?: string;
}

export default function ArticlePage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const articleId = params.id
  const [article, setArticle] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadArticle() {
      try {
        const post = await getPostById(articleId)
        setArticle(post)
      } catch (error) {
        console.error("Article not found:", articleId)
        setArticle(null)
      } finally {
        setLoading(false)
      }
    }
    loadArticle()
  }, [articleId])

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black"></div>
      </div>
    )
  }

  if (!article) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-red-600">Article not found</h1>
        <p className="mt-4">The article you're looking for could not be found.</p>
        <Link href="/" className="text-blue-600 hover:underline mt-4 inline-block">
          ← Back to Home
        </Link>
      </div>
    )
  }

  return (
    <article className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-4xl font-bold mb-4">{article.title}</h1>
      <div className="flex flex-wrap gap-4 text-gray-600 mb-6">
        {article.created_at && (
          <div className="flex items-center gap-2">
            <span>{new Date(article.created_at).toLocaleDateString()}</span>
          </div>
        )}
        {article.category && (
          <span className="rounded-full bg-gray-100 px-3 py-1 text-sm">
            {article.category}
          </span>
        )}
        {article.author && (
          <span className="rounded-full bg-gray-100 px-3 py-1 text-sm">
            {article.author}
          </span>
        )}
      </div>
      {article.image_url && (
        <div className="relative w-full h-[400px] mb-8">
          <img
            src={article.image_url}
            alt={article.title || 'Article image'}
            className="object-cover rounded-lg w-full h-full"
          />
        </div>
      )}
      <div className="prose max-w-none">
        <p>{article.excerpt}</p>
        <div dangerouslySetInnerHTML={{ __html: article.content }} />
      </div>
    </article>
  )
}
