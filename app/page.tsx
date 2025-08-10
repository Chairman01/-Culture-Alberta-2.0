"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { getAllArticles } from '@/lib/articles'
import { Footer } from '@/components/footer'

interface Article {
  id: string
  title: string
  excerpt?: string
  description?: string
  content?: string
  category?: string
  location?: string
  date?: string
  readTime?: string
  type?: string
  author?: string
  status?: string
  tags?: string[]
  rating?: number
  featured?: boolean
  image?: string
}

export default function Home() {
  const [posts, setPosts] = useState<Article[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isClient, setIsClient] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const clearSampleArticles = () => {
    try {
      // Clear all possible article keys from localStorage
      const keys = Object.keys(localStorage)
      const articleKeys = keys.filter((key) => 
        key.startsWith("article_") || 
        key.startsWith("post_") || 
        key.startsWith("event_") ||
        key.includes('content') ||
        key.includes('blog') ||
        key.includes('story') ||
        key.includes('news')
      )
      
      articleKeys.forEach(key => {
        localStorage.removeItem(key)
        console.log(`Removed: ${key}`)
      })
      
      console.log('Cleared all sample articles from localStorage')
      console.log(`Removed ${articleKeys.length} items`)
      
      // Reload the page to refresh the articles
      window.location.reload()
    } catch (e) {
      console.error('Error clearing articles:', e)
    }
  }



  useEffect(() => {
    setIsClient(true)
    async function loadPosts() {
      try {
        const apiArticles = await getAllArticles()
        
        // For now, just use API articles (simpler approach)
        const allPosts = apiArticles
        setPosts(allPosts)
      } catch (error) {
        console.error("Error loading posts:", error)
        setError(error instanceof Error ? error.message : 'Unknown error')
      } finally {
        setIsLoading(false)
      }
    }
    loadPosts()
  }, [])

  // Don't render anything until client-side hydration is complete
  if (!isClient) {
    return (
      <div className="flex min-h-screen flex-col">
        <main className="flex-1">
          <div className="flex justify-center items-center min-h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black"></div>
          </div>
        </main>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <main className="flex-1">
          <div className="flex justify-center items-center min-h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black"></div>
          </div>
        </main>
      </div>
    )
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    } catch {
      return 'Invalid date'
    }
  }

  const getPostTitle = (post: Article) => {
    return post.title || 'Untitled'
  }

  const getPostExcerpt = (post: Article) => {
    return post.excerpt || post.description || 'No excerpt available'
  }

  const getPostImage = (post: Article) => {
    return post.image || "/placeholder.svg"
  }

  const getPostCategory = (post: Article) => {
    return post.category || 'Uncategorized'
  }

  const getPostDate = (post: Article) => {
    return post.date || 'No date'
  }

  const getPostAuthor = (post: Article) => {
    return post.author || 'Unknown Author'
  }

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-gradient-to-b from-gray-50 to-white">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2 max-w-[900px] mx-auto">
                <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl lg:text-6xl">
                  Culture Alberta
                </h1>
                <p className="text-gray-600 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed max-w-[700px] mx-auto">
                  Discover the rich cultural heritage, vibrant arts scene, and exciting events across Alberta.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Blog Posts Section */}
        <section className="w-full py-12">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Latest Posts</h2>
              <p className="text-gray-600 max-w-[600px] mx-auto">
                Stay updated with the latest cultural news and stories from across Alberta
              </p>
            </div>
            
            {error && (
              <div className="text-center py-12">
                <p className="text-red-500 mb-4">Error loading posts: {error}</p>
                <p className="text-sm text-gray-400">Please check your API configuration</p>
              </div>
            )}
            
            {!error && posts.length > 0 ? (
              <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                {posts.map((post) => (
                  <Link key={post.id} href={`/articles/${post.id}`} className="group block">
                    <div className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                      <div className="aspect-[16/9] w-full bg-muted relative">
                        <Image
                          src={getPostImage(post)}
                          alt={getPostTitle(post)}
                          width={400}
                          height={225}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-6">
                        <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                          <span className="rounded-full bg-gray-100 px-2 py-1">{getPostCategory(post)}</span>
                          <span>{formatDate(getPostDate(post))}</span>
                        </div>
                        <h3 className="font-bold text-xl group-hover:text-blue-600 line-clamp-2 mb-3">{getPostTitle(post)}</h3>
                        <p className="text-sm text-gray-600 line-clamp-3 mb-4">{getPostExcerpt(post)}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500">By {getPostAuthor(post)}</span>
                          <span className="text-sm text-blue-600 group-hover:text-blue-700">Read more →</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : !error ? (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">No posts found</p>
                <p className="text-sm text-gray-400">Posts from your admin panel will appear here</p>
              </div>
            ) : null}
          </div>
        </section>

        {/* Quick Links */}
        <section className="w-full py-12 bg-gray-50">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Explore Alberta</h2>
              <p className="text-gray-600 max-w-[600px] mx-auto">
                Navigate through different aspects of Alberta's rich cultural landscape
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Link href="/edmonton" className="group block text-center p-6 rounded-lg border hover:border-blue-300 hover:bg-blue-50 transition-colors">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-200">
                  <span className="text-2xl">🏙️</span>
                </div>
                <h3 className="font-bold text-lg mb-2">Edmonton</h3>
                <p className="text-sm text-gray-600">Capital city culture and events</p>
              </Link>
              <Link href="/calgary" className="group block text-center p-6 rounded-lg border hover:border-red-300 hover:bg-red-50 transition-colors">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-red-200">
                  <span className="text-2xl">🌆</span>
                </div>
                <h3 className="font-bold text-lg mb-2">Calgary</h3>
                <p className="text-sm text-gray-600">Dynamic city life and culture</p>
              </Link>
              <Link href="/arts" className="group block text-center p-6 rounded-lg border hover:border-purple-300 hover:bg-purple-50 transition-colors">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-purple-200">
                  <span className="text-2xl">🎨</span>
                </div>
                <h3 className="font-bold text-lg mb-2">Arts & Culture</h3>
                <p className="text-sm text-gray-600">Visual arts, music, and performances</p>
              </Link>
              <Link href="/food-drink" className="group block text-center p-6 rounded-lg border hover:border-green-300 hover:bg-green-50 transition-colors">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-green-200">
                  <span className="text-2xl">🍽️</span>
                </div>
                <h3 className="font-bold text-lg mb-2">Food & Drink</h3>
                <p className="text-sm text-gray-600">Culinary experiences and local flavors</p>
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
