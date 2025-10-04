import Link from 'next/link'
import Image from 'next/image'
import { getHomepageArticles } from '@/lib/articles'
import { ArrowRight } from 'lucide-react'
import NewsletterSignup from '@/components/newsletter-signup'
import { PageSEO } from '@/components/seo/page-seo'
import { Article } from '@/lib/types/article'
import { BestOfSection } from '@/components/best-of-section'
import { getArticleUrl } from '@/lib/utils/article-url'

// Enable ISR for better performance
export const revalidate = 120 // 2 minutes

// Server-side data loading for static generation
async function getHomePageData() {
  try {
    // Use the optimized homepage articles function for better performance
    const apiArticles = await getHomepageArticles()
    const allPosts = apiArticles
    
        // Separate events from regular articles - ONLY use type === 'event'
        const regularPosts = allPosts.filter(post => {
          // Exclude AFRO MUSIC FEST from regular posts since it's now treated as an event
          if (post.title.includes('AFRO MUSIC FEST')) return false
          return post.type !== 'event'
        })
        const eventPosts = allPosts.filter(post => {
          try {
            console.log(`Checking potential event: "${post.title}" (type: ${post.type})`)
            
            // Allow AFRO MUSIC FEST as a placeholder event (even if it's not marked as type='event')
            const isAfroFest = post.title.includes('AFRO MUSIC FEST')
            if (isAfroFest) {
              console.log(`Including AFRO FEST as placeholder event: "${post.title}"`)
              return true
            }
            
            // For other articles, ONLY include those with type === 'event' AND exclude incorrect ones
            if (post.type !== 'event') return false
            
            // Check for specific incorrect events using partial matching
            const isIncorrectEvent = post.title.includes('Edmonton Designer Maria Wozniak Showcases') ||
                                   post.title.includes('Measles Exposure Alert at U of A')
            
            console.log(`Is incorrect event: ${isIncorrectEvent}`)
            
            if (isIncorrectEvent) {
              console.log(`Excluding incorrect event: "${post.title}"`)
              return false
            }
            
            return true
          } catch (error) {
            console.log(`Error filtering event article "${post.title}":`, error)
            return false
          }
        })
    
    // CRITICAL: If no posts are found, create fallback content to prevent empty homepage
    if (regularPosts.length === 0) {
      console.warn('⚠️ No articles found in database, using fast fallback content')
      // Pre-created fallback for maximum speed - no object creation overhead
      const fallbackPosts = [{
        id: 'fallback-1',
        title: 'Welcome to Culture Alberta',
        excerpt: 'Discover the best of Alberta\'s culture, events, and experiences. From Calgary to Edmonton, we bring you the stories that matter.',
        content: 'Welcome to Culture Alberta! We\'re working on bringing you amazing content about Alberta\'s vibrant culture, events, and experiences.',
        category: 'Culture',
        categories: ['Culture'],
        location: 'Alberta',
        imageUrl: '/images/culture-alberta-og.jpg',
        author: 'Culture Alberta',
        date: '2024-01-01T00:00:00.000Z',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        featuredHome: true,
        trendingHome: true,
        type: 'article',
        status: 'published',
        tags: ['Alberta', 'Culture', 'Welcome']
      }]
      return { posts: fallbackPosts, events: [] }
    }
    
    return {
      posts: regularPosts,
      events: eventPosts
    }
  } catch (error) {
    console.error("Error loading posts:", error)
    
    // CRITICAL: Always return fallback content instead of empty arrays
    console.warn('⚠️ Database error, using fast fallback content to prevent empty homepage')
    // Pre-created fallback for maximum speed - no Date() calls or object creation overhead
    const fallbackPosts = [{
      id: 'fallback-error-1',
      title: 'Welcome to Culture Alberta',
      excerpt: 'Discover the best of Alberta\'s culture, events, and experiences. From Calgary to Edmonton, we bring you the stories that matter.',
      content: 'Welcome to Culture Alberta! We\'re working on bringing you amazing content about Alberta\'s vibrant culture, events, and experiences.',
      category: 'Culture',
      categories: ['Culture'],
      location: 'Alberta',
      imageUrl: '/images/culture-alberta-og.jpg',
      author: 'Culture Alberta',
      date: '2024-01-01T00:00:00.000Z',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      featuredHome: true,
      trendingHome: true,
      type: 'article',
      status: 'published',
      tags: ['Alberta', 'Culture', 'Welcome']
    }]
    return { posts: fallbackPosts, events: [] }
  }
}

export default async function HomeStatic() {
  // Load data for static generation
  const { posts, events } = await getHomePageData()

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

  const formatEventDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', { 
        month: 'long',
        day: 'numeric', 
        year: 'numeric' 
      })
    } catch {
      return 'Date TBA'
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

  const getPostDate = (post: Article) => {
    return post.date || post.createdAt || new Date().toISOString()
  }

  const getPostAuthor = (post: Article) => {
    return post.author || 'Culture Alberta'
  }

  // Try to find a featured article, but fall back to any article if none are marked as featured
  const featuredPost = posts.find(post => post.featuredHome === true) || 
                      posts.find(post => post.type !== 'event') || 
                      posts[0] || 
                      null
  
  // Sort articles by date (newest first) before filtering
  const sortedPosts = posts.sort((a, b) => {
    const dateA = new Date(a.date || a.createdAt || 0).getTime()
    const dateB = new Date(b.date || b.createdAt || 0).getTime()
    return dateB - dateA // Newest first
  })
  
  // Use the same flexible filtering logic as getCityArticles
  const edmontonPosts = sortedPosts.filter(post => {
    const hasCityCategory = post.category?.toLowerCase().includes('edmonton');
    const hasCityLocation = post.location?.toLowerCase().includes('edmonton');
    const hasCityCategories = post.categories?.some((cat: string) => 
      cat.toLowerCase().includes('edmonton')
    );
    const hasCityTags = post.tags?.some((tag: string) => 
      tag.toLowerCase().includes('edmonton')
    );
    
    return hasCityCategory || hasCityLocation || hasCityCategories || hasCityTags;
  }).slice(0, 3)
  
  const calgaryPosts = sortedPosts.filter(post => {
    const hasCityCategory = post.category?.toLowerCase().includes('calgary');
    const hasCityLocation = post.location?.toLowerCase().includes('calgary');
    const hasCityCategories = post.categories?.some((cat: string) => 
      cat.toLowerCase().includes('calgary')
    );
    const hasCityTags = post.tags?.some((tag: string) => 
      tag.toLowerCase().includes('calgary')
    );
    
    return hasCityCategory || hasCityLocation || hasCityCategories || hasCityTags;
  }).slice(0, 3)
        // SMART filtering for Food & Drink posts - use same logic as /food-drink page
        const foodDrinkPosts = sortedPosts.filter(post => {
          try {
            // Check main category (same as /food-drink page)
            const hasFoodCategory = post.category?.toLowerCase().includes('food') || 
                                   post.category?.toLowerCase().includes('drink') ||
                                   post.category?.toLowerCase().includes('restaurant') ||
                                   post.category?.toLowerCase().includes('cafe') ||
                                   post.category?.toLowerCase().includes('brewery') ||
                                   post.category?.toLowerCase().includes('food & drink');
            
            // Check new categories field (same as /food-drink page)
            const hasFoodCategories = post.categories?.some((cat: string) => 
              cat.toLowerCase().includes('food') || 
              cat.toLowerCase().includes('drink') ||
              cat.toLowerCase().includes('restaurant') ||
              cat.toLowerCase().includes('cafe') ||
              cat.toLowerCase().includes('brewery') ||
              cat.toLowerCase().includes('food & drink')
            );
            
            // Check tags (same as /food-drink page)
            const hasFoodTags = post.tags?.some((tag: string) => 
              tag.toLowerCase().includes('food') || 
              tag.toLowerCase().includes('drink') ||
              tag.toLowerCase().includes('restaurant') ||
              tag.toLowerCase().includes('cafe') ||
              tag.toLowerCase().includes('brewery') ||
              tag.toLowerCase().includes('food & drink')
            );
            
            return Boolean(hasFoodCategory || hasFoodCategories || hasFoodTags)
          } catch (error) {
            console.log(`Error filtering food article "${post.title}":`, error)
            return false
          }
        }).slice(0, 3) // Show 3 newest instead of 2
  // Show top 5 most recent articles instead of only trending ones
  const trendingPosts = sortedPosts.slice(0, 5)
  
  // Debug logging for homepage articles
  console.log('Total posts loaded:', posts.length)
  console.log('Posts with trendingHome flag:', posts.filter(post => post.trendingHome === true).length)
  console.log('Top 5 articles selected:', trendingPosts.length)
  console.log('Featured post found:', featuredPost ? featuredPost.title : 'None')
  console.log('First few posts:', posts.slice(0, 3).map(p => ({ title: p.title, type: p.type, featuredHome: p.featuredHome })))
  
  // Debug: Show all unique categories and types
  const allCategories = [...new Set(posts.map(p => p.category).filter(Boolean))]
  const allTypes = [...new Set(posts.map(p => p.type).filter(Boolean))]
  const allCategoryArrays = [...new Set(posts.flatMap(p => p.categories || []))]
  console.log('All unique categories:', allCategories)
  console.log('All unique types:', allTypes)
  console.log('All unique category arrays:', allCategoryArrays)
  
  // Debug logging for Edmonton posts
  console.log('Edmonton posts found:', edmontonPosts.length)
  console.log('Edmonton posts:', edmontonPosts.map(p => ({ title: p.title, category: p.category, location: p.location })))
  
  // Debug logging for Food & Drink posts
  console.log('Food & Drink posts found:', foodDrinkPosts.length)
  try {
    console.log('Food & Drink posts:', foodDrinkPosts.map(p => ({ title: p.title, category: p.category, categories: p.categories, tags: p.tags })))
  } catch (error) {
    console.log('Error logging food posts:', error)
  }
  
  // Debug: Show all articles and their SMART food-related matching
  console.log('=== SMART FOOD MATCHING DEBUG ===')
  posts.slice(0, 5).forEach(post => {
    try {
      const hasFoodCategory = post.category?.toLowerCase() === 'food & drink' ||
                             post.category?.toLowerCase() === 'food and drink' ||
                             post.category?.toLowerCase() === 'food' ||
                             post.category?.toLowerCase() === 'drink'
      const hasFoodCategories = post.categories?.some((cat: string) => 
        cat.toLowerCase() === 'food & drink' ||
        cat.toLowerCase() === 'food and drink' ||
        cat.toLowerCase() === 'food' ||
        cat.toLowerCase() === 'drink'
      )
      const hasFoodTags = post.tags?.some((tag: string) => 
        tag.toLowerCase() === 'food & drink' ||
        tag.toLowerCase() === 'food and drink' ||
        tag.toLowerCase() === 'food' ||
        tag.toLowerCase() === 'drink'
      )
      
      const smartMatch = Boolean(hasFoodCategory || hasFoodCategories || hasFoodTags)
      console.log(`Article: "${post.title}" - Category: "${post.category}" - Smart Food match: ${smartMatch} (category: ${hasFoodCategory}, categories: ${hasFoodCategories}, tags: ${hasFoodTags})`)
    } catch (error) {
      console.log(`Error processing article "${post.title}":`, error)
    }
  })
  
  // Debug logging for Events
  console.log('Events found:', events.length)
  try {
    console.log('Events:', events.map(e => ({ title: e.title, type: e.type, category: e.category })))
  } catch (error) {
    console.log('Error logging events:', error)
  }
  
        // Debug: Show all articles and their type-based event matching
        console.log('=== TYPE-BASED EVENT MATCHING DEBUG ===')
        posts.slice(0, 5).forEach(post => {
          try {
            const isEvent = post.type === 'event'
            console.log(`Article: "${post.title}" - Type: "${post.type}" - Is Event: ${isEvent}`)
          } catch (error) {
            console.log(`Error processing article "${post.title}":`, error)
          }
        })
  
  const upcomingEvents = events.slice(0, 3) // Get the first 3 events

  return (
    <>
      <PageSEO
        title="Culture Alberta - Home"
        description="Discover the best of Alberta's culture, events, and local businesses. Stay informed with the latest news and updates."
      />
      <div className="flex min-h-screen flex-col">
        <main className="flex-1">
          {/* Featured Article + Trending Sidebar */}
          <section className="w-full py-8 md:py-10 lg:py-12 bg-gradient-to-b from-gray-50 to-white">
            <div className="container mx-auto px-4 md:px-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Featured Article */}
                <div className="lg:col-span-2">
                  {featuredPost ? (
                    <Link href={getArticleUrl(featuredPost)} className="group block">
                      <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300">
                        <div className="aspect-[16/9] w-full bg-gray-200 relative">
                          <Image
                            src={getPostImage(featuredPost)}
                            alt={getPostTitle(featuredPost)}
                            width={800}
                            height={450}
                            className="w-full h-full object-cover"
                            priority
                            placeholder="blur"
                            blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
                          />
                        </div>
                        <div className="p-6">
                          <div className="flex items-center gap-3 text-sm text-gray-500 mb-3">
                            <span className="rounded-full bg-black text-white px-4 py-1.5 font-medium">{getPostCategory(featuredPost)}</span>
                            <span className="font-medium">{formatDate(getPostDate(featuredPost))}</span>
                          </div>
                          <h1 className="font-display text-4xl font-bold group-hover:text-gray-600 transition-colors duration-300 mb-3 leading-tight">{getPostTitle(featuredPost)}</h1>
                          <p className="font-body text-gray-600 text-lg leading-relaxed">{getPostExcerpt(featuredPost)}</p>
                        </div>
                      </div>
                    </Link>
                  ) : (
                    <div className="bg-white rounded-xl overflow-hidden shadow-sm p-6">
                      <div className="aspect-[16/9] w-full bg-gray-200 relative flex items-center justify-center">
                        <div className="text-gray-400 text-center">
                          <div className="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center mx-auto mb-3">
                            <span className="text-2xl">📷</span>
                          </div>
                          <p className="font-body">No featured article available</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Trending Sidebar */}
                <div className="space-y-6">
                  {/* Trending This Week */}
                  <div className="bg-white rounded-xl shadow-sm p-6">
                    <h2 className="font-display text-2xl font-bold mb-4">Trending This Week</h2>
                    <div className="space-y-3">
                      {trendingPosts.length > 0 ? (
                        trendingPosts.map((post, index) => (
                          <Link key={post.id} href={getArticleUrl(post)} className="block group">
                            <div className="flex items-start space-x-4">
                              <span className="text-lg font-bold text-gray-300 bg-gray-100 rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">{index + 1}</span>
                              <div>
                                <h3 className="font-display font-semibold text-base group-hover:text-gray-600 transition-colors duration-300 line-clamp-2 leading-tight mb-1">{getPostTitle(post)}</h3>
                                <p className="font-body text-sm text-gray-500">{formatDate(getPostDate(post))}</p>
                              </div>
                            </div>
                          </Link>
                        ))
                      ) : (
                        // Fallback: show recent articles if no trending articles
                        posts.slice(0, 3).map((post, index) => (
                          <Link key={post.id} href={getArticleUrl(post)} className="block group">
                            <div className="flex items-start space-x-4">
                              <span className="text-lg font-bold text-gray-300 bg-gray-100 rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">{index + 1}</span>
                              <div>
                                <h3 className="font-display font-semibold text-base group-hover:text-gray-600 transition-colors duration-300 line-clamp-2 leading-tight mb-1">{getPostTitle(post)}</h3>
                                <p className="font-body text-sm text-gray-500">{formatDate(getPostDate(post))}</p>
                              </div>
                            </div>
                          </Link>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Newsletter */}
                  <NewsletterSignup 
                    title="Newsletter"
                    description="Stay updated with the latest cultural news and events from across Alberta."
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Edmonton Spotlight */}
          <section className="w-full py-8">
            <div className="container mx-auto px-4 md:px-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-4xl font-bold text-blue-600">Edmonton Spotlight</h2>
                <Link href="/edmonton" className="text-blue-600 hover:text-blue-700 flex items-center gap-2 font-body font-medium">
                  View All <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {edmontonPosts.map((post) => (
                  <Link key={post.id} href={getArticleUrl(post)} className="group block">
                    <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300">
                      <div className="aspect-[16/9] w-full bg-gray-200 relative">
                        <Image
                          src={getPostImage(post)}
                          alt={getPostTitle(post)}
                          width={400}
                          height={225}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      <div className="p-4">
                        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                          <span className="rounded-full bg-blue-100 text-blue-800 px-3 py-1.5 font-medium">Edmonton</span>
                          <span className="font-medium">{formatDate(getPostDate(post))}</span>
                        </div>
                        <h3 className="font-display font-bold text-xl group-hover:text-gray-600 transition-colors duration-300 line-clamp-2 leading-tight">{getPostTitle(post)}</h3>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>

          {/* Calgary Spotlight */}
          <section className="w-full py-8 bg-gray-50">
            <div className="container mx-auto px-4 md:px-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-4xl font-bold text-red-600">Calgary Spotlight</h2>
                <Link href="/calgary" className="text-red-600 hover:text-red-700 flex items-center gap-2 font-body font-medium">
                  View All <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {calgaryPosts.map((post) => (
                  <Link key={post.id} href={getArticleUrl(post)} className="group block">
                    <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300">
                      <div className="aspect-[16/9] w-full bg-gray-200 relative">
                        <Image
                          src={getPostImage(post)}
                          alt={getPostTitle(post)}
                          width={400}
                          height={225}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      <div className="p-4">
                        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                          <span className="rounded-full bg-red-100 text-red-800 px-3 py-1.5 font-medium">Calgary</span>
                          <span className="font-medium">{formatDate(getPostDate(post))}</span>
                        </div>
                        <h3 className="font-display font-bold text-xl group-hover:text-red-600 transition-colors duration-300 line-clamp-2 leading-tight">{getPostTitle(post)}</h3>
                      </div>
                    </div>
                  </Link>
                ))}
            </div>
          </div>
        </section>

          {/* Upcoming Events */}
          <section className="w-full py-8">
          <div className="container mx-auto px-4 md:px-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-4xl font-bold">Upcoming Events</h2>
                <Link href="/events" className="text-blue-600 hover:text-blue-700 flex items-center gap-2 font-body font-medium">
                  View All <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {upcomingEvents.length > 0 ? (
                  upcomingEvents.map((event) => (
                    <div key={event.id} className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300">
                      <div className="aspect-[16/9] w-full bg-gray-200 relative">
                        <Image
                          src={getPostImage(event)}
                          alt={getPostTitle(event)}
                          width={400}
                          height={225}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-3 left-3 bg-black text-white px-3 py-1.5 text-sm rounded-lg font-medium">
                          {formatEventDate(getPostDate(event))}
                        </div>
                      </div>
                      <div className="p-4">
                        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                          <span className="rounded-full bg-gray-100 px-3 py-1.5 font-medium">{event.location || 'Alberta'}</span>
                        </div>
                        <h3 className="font-display font-bold text-xl leading-tight mb-2">{getPostTitle(event)}</h3>
                        <p className="font-body text-sm text-gray-600 line-clamp-2 mb-3">{getPostExcerpt(event)}</p>
                        <Link href={getArticleUrl(event)}>
                          <button className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded text-sm hover:bg-gray-50 transition-colors font-body">
                            View Details
                </button>
                        </Link>
                      </div>
                    </div>
                  ))
                ) : (
                  // Show placeholder when no events are available
                  <>
                    <div className="bg-white rounded-xl overflow-hidden shadow-sm">
                      <div className="aspect-[16/9] w-full bg-gray-200 relative">
                        <div className="absolute top-3 left-3 bg-black text-white px-3 py-1.5 text-sm rounded-lg font-medium">
                          Coming Soon
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
                        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                          <span className="rounded-full bg-gray-100 px-3 py-1.5 font-medium">Alberta</span>
                        </div>
                        <h3 className="font-display font-bold text-xl mb-2">No Events Yet</h3>
                        <p className="font-body text-sm text-gray-600 mb-3">Check back soon for upcoming cultural events!</p>
                        <button className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded text-sm hover:bg-gray-50 transition-colors font-body">
                          View Details
                  </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </section>

          {/* Food & Drink */}
          <section className="w-full py-8 bg-gray-50">
            <div className="container mx-auto px-4 md:px-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-4xl font-bold">Food & Drink</h2>
                <Link href="/food-drink" className="text-blue-600 hover:text-blue-700 flex items-center gap-2 font-body font-medium">
                  View All <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {foodDrinkPosts.length > 0 ? (
                  foodDrinkPosts.map((post) => (
                    <Link key={post.id} href={getArticleUrl(post)} className="group block">
                      <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300">
                        <div className="aspect-[16/9] w-full bg-gray-200 relative">
                          <Image
                            src={getPostImage(post)}
                            alt={getPostTitle(post)}
                            width={400}
                            height={225}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                        <div className="p-4">
                          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                            <span className="rounded-full bg-orange-100 text-orange-800 px-3 py-1.5 font-medium">Food & Drink</span>
                            <span className="font-medium">{formatDate(getPostDate(post))}</span>
                          </div>
                          <h3 className="font-display font-bold text-xl group-hover:text-gray-600 transition-colors duration-300 line-clamp-2 leading-tight">{getPostTitle(post)}</h3>
                        </div>
                      </div>
                    </Link>
                  ))
                ) : (
                  // Show placeholder when no Food & Drink articles are available
                  <div className="bg-white rounded-xl overflow-hidden shadow-sm">
                    <div className="aspect-[16/9] w-full bg-gray-200 relative">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-gray-400 text-center">
                          <div className="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center mx-auto mb-2">
                            <span className="text-2xl">🍽️</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                        <span className="rounded-full bg-orange-100 text-orange-800 px-3 py-1.5 font-medium">Food & Drink</span>
                        <span className="font-medium">Coming Soon</span>
                      </div>
                      <h3 className="font-display font-bold text-xl mb-2">No Food & Drink Articles Yet</h3>
                      <p className="font-body text-sm text-gray-600 mb-3">Check back soon for delicious Alberta dining recommendations!</p>
                      <button className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded text-sm hover:bg-gray-50 transition-colors font-body">
                        View Details
                      </button>
                    </div>
                  </div>
                )}
              </div>
          </div>
        </section>

          {/* Best of Alberta */}
          <BestOfSection />
        </main>
      </div>
    </>
  )
}