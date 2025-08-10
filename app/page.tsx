"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { getAllArticles } from '@/lib/articles'
import { Footer } from '@/components/footer'
import { ArrowRight } from 'lucide-react'

import { Article } from '@/lib/types/article'

export default function Home() {
  const [posts, setPosts] = useState<Article[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isClient, setIsClient] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setIsClient(true)
    async function loadPosts() {
      try {
        const apiArticles = await getAllArticles()
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
      const date = new Date(dateString)
      const now = new Date()
      const diffTime = Math.abs(now.getTime() - date.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      
      if (diffDays === 1) return '1 day ago'
      if (diffDays < 7) return `${diffDays} days ago`
      if (diffDays < 14) return '1 week ago'
      if (diffDays < 21) return '2 weeks ago'
      return '3 weeks ago'
    } catch {
      return 'Recently'
    }
  }

  const getPostTitle = (post: Article) => {
    return post.title || 'Untitled Article'
  }

  const getPostExcerpt = (post: Article) => {
    return post.excerpt || post.content?.substring(0, 100) + '...' || 'No excerpt available'
  }

  const getPostImage = (post: Article) => {
    return post.imageUrl || '/placeholder.svg'
  }

  const getPostCategory = (post: Article) => {
    return post.category || 'General'
  }

  const getPostDate = (post: Article) => {
    return post.date || post.createdAt || new Date().toISOString()
  }

  const getPostAuthor = (post: Article) => {
    return post.author || 'Culture Alberta'
  }

  const featuredPost = posts[0] || null
  const edmontonPosts = posts.filter(post => post.category === 'Edmonton').slice(0, 3)
  const calgaryPosts = posts.filter(post => post.category === 'Calgary').slice(0, 3)
  const foodDrinkPosts = posts.filter(post => post.category === 'Food & Drink').slice(0, 2)
  const trendingPosts = posts.slice(0, 5)

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        {/* Featured Article + Trending Sidebar */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-gradient-to-b from-gray-50 to-white">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Featured Article */}
              <div className="lg:col-span-2">
                {featuredPost ? (
                  <Link href={`/articles/${featuredPost.id}`} className="group block">
                    <div className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                      <div className="aspect-[16/9] w-full bg-gray-200 relative">
                        <Image
                          src={getPostImage(featuredPost)}
                          alt={getPostTitle(featuredPost)}
                          width={800}
                          height={450}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-6">
                        <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                          <span className="rounded-full bg-black text-white px-3 py-1">{getPostCategory(featuredPost)}</span>
                          <span>{formatDate(getPostDate(featuredPost))}</span>
                        </div>
                        <h1 className="font-bold text-3xl group-hover:text-blue-600 mb-3">{getPostTitle(featuredPost)}</h1>
                        <p className="text-gray-600 text-lg">{getPostExcerpt(featuredPost)}</p>
                      </div>
                    </div>
                  </Link>
                ) : (
                  <div className="bg-white rounded-lg overflow-hidden shadow-sm p-6">
                    <div className="aspect-[16/9] w-full bg-gray-200 relative flex items-center justify-center">
                      <div className="text-gray-400 text-center">
                        <div className="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center mx-auto mb-4">
                          <span className="text-2xl">📷</span>
                        </div>
                        <p>No featured article available</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Trending Sidebar */}
              <div className="space-y-8">
                {/* Trending This Week */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="font-bold text-xl mb-4">Trending This Week</h2>
                  <div className="space-y-3">
                    {trendingPosts.map((post, index) => (
                      <Link key={post.id} href={`/articles/${post.id}`} className="block group">
                        <div className="flex items-start space-x-3">
                          <span className="text-sm font-bold text-gray-400">{index + 1}</span>
                          <div>
                            <h3 className="font-semibold text-sm group-hover:text-blue-600 line-clamp-2">{getPostTitle(post)}</h3>
                            <p className="text-xs text-gray-500">{formatDate(getPostDate(post))}</p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Newsletter */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="font-bold text-xl mb-4">Newsletter</h2>
                  <p className="text-gray-600 text-sm mb-4">
                    Stay updated with the latest cultural news and events from across Alberta.
                  </p>
                  <div className="space-y-3">
                    <input
                      type="email"
                      placeholder="Enter your email"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button className="w-full bg-black text-white py-2 px-4 rounded-md text-sm hover:bg-gray-800 transition-colors">
                      Subscribe
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Edmonton Spotlight */}
        <section className="w-full py-12">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold text-blue-600">Edmonton Spotlight</h2>
              <Link href="/edmonton" className="text-blue-600 hover:text-blue-700 flex items-center gap-1">
                View All <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {edmontonPosts.map((post) => (
                <Link key={post.id} href={`/articles/${post.id}`} className="group block">
                  <div className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                    <div className="aspect-[16/9] w-full bg-gray-200 relative">
                      <Image
                        src={getPostImage(post)}
                        alt={getPostTitle(post)}
                        width={400}
                        height={225}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-4">
                      <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                        <span className="rounded-full bg-blue-100 text-blue-800 px-2 py-1">Edmonton</span>
                        <span>{formatDate(getPostDate(post))}</span>
                      </div>
                      <h3 className="font-bold text-lg group-hover:text-blue-600 line-clamp-2">{getPostTitle(post)}</h3>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Calgary Spotlight */}
        <section className="w-full py-12 bg-gray-50">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold text-red-600">Calgary Spotlight</h2>
              <Link href="/calgary" className="text-red-600 hover:text-red-700 flex items-center gap-1">
                View All <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {calgaryPosts.map((post) => (
                <Link key={post.id} href={`/articles/${post.id}`} className="group block">
                  <div className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                    <div className="aspect-[16/9] w-full bg-gray-200 relative">
                      <Image
                        src={getPostImage(post)}
                        alt={getPostTitle(post)}
                        width={400}
                        height={225}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-4">
                      <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                        <span className="rounded-full bg-red-100 text-red-800 px-2 py-1">Calgary</span>
                        <span>{formatDate(getPostDate(post))}</span>
                      </div>
                      <h3 className="font-bold text-lg group-hover:text-red-600 line-clamp-2">{getPostTitle(post)}</h3>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Upcoming Events */}
        <section className="w-full py-12">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold">Upcoming Events</h2>
              <Link href="/events" className="text-blue-600 hover:text-blue-700 flex items-center gap-1">
                View All <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {/* Event Cards */}
              <div className="bg-white rounded-lg overflow-hidden shadow-sm">
                <div className="aspect-[16/9] w-full bg-gray-200 relative">
                  <div className="absolute top-2 left-2 bg-black text-white px-2 py-1 text-xs rounded">
                    October 12-21, 2024
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-gray-400 text-center">
                      <div className="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center mx-auto mb-2">
                        <span className="text-2xl">🎬</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                    <span className="rounded-full bg-gray-100 px-2 py-1">Edmonton</span>
                  </div>
                  <h3 className="font-bold text-lg mb-2">Edmonton International Film Festival</h3>
                  <p className="text-sm text-gray-600 mb-4">A celebration of cinema from around the world.</p>
                  <button className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded text-sm hover:bg-gray-50 transition-colors">
                    View Details
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-lg overflow-hidden shadow-sm">
                <div className="aspect-[16/9] w-full bg-gray-200 relative">
                  <div className="absolute top-2 left-2 bg-black text-white px-2 py-1 text-xs rounded">
                    July 25-28, 2024
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-gray-400 text-center">
                      <div className="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center mx-auto mb-2">
                        <span className="text-2xl">🎵</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                    <span className="rounded-full bg-gray-100 px-2 py-1">Calgary</span>
                  </div>
                  <h3 className="font-bold text-lg mb-2">Calgary Folk Music Festival</h3>
                  <p className="text-sm text-gray-600 mb-4">An annual gathering of folk music enthusiasts.</p>
                  <button className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded text-sm hover:bg-gray-50 transition-colors">
                    View Details
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-lg overflow-hidden shadow-sm">
                <div className="aspect-[16/9] w-full bg-gray-200 relative">
                  <div className="absolute top-2 left-2 bg-black text-white px-2 py-1 text-xs rounded">
                    July 18-28, 2024
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-gray-400 text-center">
                      <div className="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center mx-auto mb-2">
                        <span className="text-2xl">🍽️</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                    <span className="rounded-full bg-gray-100 px-2 py-1">Edmonton</span>
                  </div>
                  <h3 className="font-bold text-lg mb-2">Taste of Edmonton</h3>
                  <p className="text-sm text-gray-600 mb-4">A culinary showcase of Edmonton's diverse food scene.</p>
                  <button className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded text-sm hover:bg-gray-50 transition-colors">
                    View Details
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Food & Drink */}
        <section className="w-full py-12 bg-gray-50">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold">Food & Drink</h2>
              <Link href="/food-drink" className="text-blue-600 hover:text-blue-700 flex items-center gap-1">
                View All <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              {foodDrinkPosts.map((post) => (
                <Link key={post.id} href={`/articles/${post.id}`} className="group block">
                  <div className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                    <div className="aspect-[16/9] w-full bg-gray-200 relative">
                      <Image
                        src={getPostImage(post)}
                        alt={getPostTitle(post)}
                        width={600}
                        height={338}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-6">
                      <h3 className="font-bold text-xl group-hover:text-blue-600 mb-3">{getPostTitle(post)}</h3>
                      <p className="text-gray-600">{getPostExcerpt(post)}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Best of Alberta */}
        <section className="w-full py-12">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Best of Alberta</h2>
              <p className="text-gray-600 max-w-[600px] mx-auto">
                Discover the top-rated professionals and businesses across Alberta, from healthcare providers to legal services.
              </p>
            </div>
            
            {/* Navigation Tabs */}
            <div className="flex items-center justify-center mb-8">
              <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
                <button className="px-4 py-2 text-sm font-medium text-black border-b-2 border-black">Dentists</button>
                <button className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-black">Lawyers</button>
                <button className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-black">Accountants</button>
                <button className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-black">Restaurants</button>
              </div>
              <Link href="/best-of" className="ml-8 text-blue-600 hover:text-blue-700 flex items-center gap-1">
                View All <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Best of Content */}
            <div className="max-w-md mx-auto">
              <div className="bg-gray-200 rounded-lg p-8 text-center">
                <div className="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📧</span>
                </div>
                <p className="text-gray-600">Providing exceptional dental care for the whole family.</p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
