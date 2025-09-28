// Static homepage for maximum performance
import { getOptimizedHomepageArticles } from '@/lib/optimized-articles'
import { Article } from '@/lib/types/article'
import Image from 'next/image'
import Link from 'next/link'
import { Metadata } from 'next'

// Generate metadata for SEO
export const metadata: Metadata = {
  title: 'Culture Alberta | Best Culture, Events & Food in Alberta',
  description: 'Discover the best cultural events, restaurants, and experiences in Alberta. Your guide to Edmonton, Calgary, and beyond.',
  keywords: 'Alberta culture, Edmonton events, Calgary restaurants, Alberta food, cultural events',
  openGraph: {
    title: 'Culture Alberta | Best Culture, Events & Food in Alberta',
    description: 'Discover the best cultural events, restaurants, and experiences in Alberta.',
    images: ['/images/culture-alberta-og.jpg'],
  },
}

// Static generation - this will be pre-rendered at build time
export default async function StaticHomePage() {
  // This will be cached and served statically
  const posts = await getOptimizedHomepageArticles()
  
  // Filter for different sections
  const featuredPosts = posts.filter(post => post.featuredHome).slice(0, 3)
  const trendingPosts = posts.filter(post => post.trendingHome).slice(0, 6)
  const recentPosts = posts.slice(0, 8)

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
    if (post.excerpt) return post.excerpt
    if (post.content && post.content.trim()) {
      return post.content.substring(0, 150) + '...'
    }
    return 'Article content coming soon...'
  }

  const getPostImage = (post: Article) => {
    return post.imageUrl || '/placeholder.svg'
  }

  const getPostCategory = (post: Article) => {
    return post.category || 'General'
  }

  const getArticleUrl = (post: Article) => {
    const slug = post.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 100)
    return `/articles/${slug}`
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Link href="/" className="text-2xl font-bold text-gray-900">
                Culture Alberta
              </Link>
            </div>
            <nav className="hidden md:flex space-x-8">
              <Link href="/edmonton" className="text-gray-600 hover:text-gray-900">Edmonton</Link>
              <Link href="/calgary" className="text-gray-600 hover:text-gray-900">Calgary</Link>
              <Link href="/food-drink" className="text-gray-600 hover:text-gray-900">Food & Drink</Link>
              <Link href="/events" className="text-gray-600 hover:text-gray-900">Events</Link>
              <Link href="/culture" className="text-gray-600 hover:text-gray-900">Culture</Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        {featuredPosts.length > 0 && (
          <section className="mb-12">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {featuredPosts.map((post, index) => (
                <article key={post.id} className={`${index === 0 ? 'lg:col-span-2' : ''}`}>
                  <Link href={getArticleUrl(post)}>
                    <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                      <div className={`relative ${index === 0 ? 'h-64 md:h-80' : 'h-48'}`}>
                        <Image
                          src={getPostImage(post)}
                          alt={getPostTitle(post)}
                          fill
                          className="object-cover"
                          priority={index === 0}
                          sizes={index === 0 ? "(max-width: 768px) 100vw, (max-width: 1200px) 66vw, 50vw" : "(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 25vw"}
                          quality={85}
                        />
                      </div>
                      <div className="p-6">
                        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                          <span className="rounded-full bg-gray-100 px-3 py-1.5 font-medium">
                            {getPostCategory(post)}
                          </span>
                          <span>•</span>
                          <span>{formatDate(post.date || '')}</span>
                        </div>
                        <h2 className="font-display font-bold text-xl mb-3 line-clamp-2">
                          {getPostTitle(post)}
                        </h2>
                        <p className="font-body text-sm text-gray-600 line-clamp-3">
                          {getPostExcerpt(post)}
                        </p>
                      </div>
                    </div>
                  </Link>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* Trending Section */}
        {trendingPosts.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Trending This Week</h2>
              <Link href="/best-of" className="text-blue-600 hover:text-blue-800 font-medium">
                View All
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {trendingPosts.map((post) => (
                <article key={post.id}>
                  <Link href={getArticleUrl(post)}>
                    <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                      <div className="aspect-[16/10] w-full bg-gray-200 relative overflow-hidden">
                        <Image
                          src={getPostImage(post)}
                          alt={getPostTitle(post)}
                          fill
                          className="object-cover"
                          loading="lazy"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          quality={75}
                        />
                      </div>
                      <div className="p-4">
                        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                          <span className="rounded-full bg-gray-100 px-3 py-1.5 font-medium">
                            {getPostCategory(post)}
                          </span>
                        </div>
                        <h3 className="font-display font-bold text-lg mb-2 line-clamp-2">
                          {getPostTitle(post)}
                        </h3>
                        <p className="font-body text-sm text-gray-600 line-clamp-2 mb-3">
                          {getPostExcerpt(post)}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">{formatDate(post.date || '')}</span>
                          <span className="text-xs text-blue-600 font-medium">Read More</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* Recent Articles */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Latest Articles</h2>
            <Link href="/articles" className="text-blue-600 hover:text-blue-800 font-medium">
              View All
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {recentPosts.map((post) => (
              <article key={post.id}>
                <Link href={getArticleUrl(post)}>
                  <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                    <div className="aspect-[16/10] w-full bg-gray-200 relative overflow-hidden">
                      <Image
                        src={getPostImage(post)}
                        alt={getPostTitle(post)}
                        fill
                        className="object-cover"
                        loading="lazy"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                        quality={75}
                      />
                    </div>
                    <div className="p-4">
                      <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                        <span className="rounded-full bg-gray-100 px-3 py-1.5 font-medium">
                          {getPostCategory(post)}
                        </span>
                      </div>
                      <h3 className="font-display font-bold text-lg mb-2 line-clamp-2">
                        {getPostTitle(post)}
                      </h3>
                      <p className="font-body text-sm text-gray-600 line-clamp-2 mb-3">
                        {getPostExcerpt(post)}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">{formatDate(post.date || '')}</span>
                        <span className="text-xs text-blue-600 font-medium">Read More</span>
                      </div>
                    </div>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">Culture Alberta</h3>
              <p className="text-gray-400 text-sm">
                Your guide to the best cultural experiences in Alberta.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Cities</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/edmonton" className="hover:text-white">Edmonton</Link></li>
                <li><Link href="/calgary" className="hover:text-white">Calgary</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Categories</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/food-drink" className="hover:text-white">Food & Drink</Link></li>
                <li><Link href="/events" className="hover:text-white">Events</Link></li>
                <li><Link href="/culture" className="hover:text-white">Culture</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Connect</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/contact" className="hover:text-white">Contact</Link></li>
                <li><Link href="/privacy" className="hover:text-white">Privacy</Link></li>
                <li><Link href="/terms" className="hover:text-white">Terms</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
            <p>&copy; 2024 Culture Alberta. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
