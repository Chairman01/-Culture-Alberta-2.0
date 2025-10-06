import Link from 'next/link'
import Image from 'next/image'
import { getHomepageArticles } from '@/lib/articles'
import { getAllEvents } from '@/lib/events'
import { ArrowRight } from 'lucide-react'
import NewsletterSignup from '@/components/newsletter-signup'
import { PageSEO } from '@/components/seo/page-seo'
import { Article } from '@/lib/types/article'
import { BestOfSection } from '@/components/best-of-section'
import { getArticleUrl, getEventUrl } from '@/lib/utils/article-url'

// Enable ISR for better performance
export const revalidate = 120 // 2 minutes

// Server-side data loading for static generation
async function getHomePageData() {
  try {
    // Use the optimized homepage articles function for better performance
    const apiArticles = await getHomepageArticles()
    console.log('🔍 DEBUG: getHomepageArticles returned:', apiArticles?.length || 0, 'articles')
    if (apiArticles && apiArticles.length > 0) {
      console.log('🔍 DEBUG: First article:', apiArticles[0].title)
    }
    
    // Also get events from the events table
    let events: any[] = []
    try {
      events = await getAllEvents()
      console.log('🔍 DEBUG: getAllEvents returned:', events?.length || 0, 'events')
    } catch (error) {
      console.error('❌ Error fetching events:', error)
      events = [] // Fallback to empty array
    }
    
    // Convert events to article format for consistent handling
    const eventAsArticles = events.map(event => ({
      id: event.id,
      title: event.title,
      excerpt: event.excerpt || event.description || '',
      content: event.description || '',
      category: 'Events', // Mark as Events category
      categories: ['Events'], // Add to categories array
      location: event.location,
      author: event.organizer || 'Event Organizer',
      imageUrl: event.image_url,
      date: event.event_date,
      createdAt: event.created_at,
      updatedAt: event.updated_at,
      status: event.status,
      trendingHome: event.featured_home || false,
      trendingEdmonton: event.featured_edmonton || false,
      trendingCalgary: event.featured_calgary || false,
      featuredHome: event.featured_home || false,
      featuredEdmonton: event.featured_edmonton || false,
      featuredCalgary: event.featured_calgary || false,
      type: 'event'
    }))
    
    // Combine articles and events
    const allPosts = [...apiArticles, ...eventAsArticles]
    console.log('🔍 DEBUG: Combined posts (articles + events):', allPosts.length)
    
    // Simple approach: Use all posts for all sections, filter by categories
    const allPostsForFiltering = allPosts
    console.log('🔍 DEBUG: allPostsForFiltering length:', allPostsForFiltering.length)
    
    // CRITICAL: If no posts are found, create fallback content to prevent empty homepage
    if (allPostsForFiltering.length === 0) {
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
    
    // Debug: Check what status values we have
    console.log('🔍 DEBUG: Status values in articles:', allPostsForFiltering.map(p => ({ title: p.title, status: p.status })).slice(0, 3))
    
    // Filter by status, but be more lenient if status is undefined
    const publishedPosts = allPostsForFiltering.filter(post => 
      post.status === 'published' || post.status === undefined || post.status === null
    )
    console.log('🔍 DEBUG: Published posts after filtering:', publishedPosts.length)
    
    return {
      posts: publishedPosts,
      events: [] // We'll filter events by category later
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
  
  
  // SIMPLE CATEGORY-BASED FILTERING
  const edmontonPosts = sortedPosts.filter(post => {
    // Check if article has "Edmonton" in category or categories array
    const hasEdmontonCategory = post.category?.toLowerCase().includes('edmonton');
    const hasEdmontonInCategories = post.categories?.some((cat: string) => 
      cat.toLowerCase().includes('edmonton')
    );
    
    return hasEdmontonCategory || hasEdmontonInCategories;
  }).slice(0, 3)
  
  const calgaryPosts = sortedPosts.filter(post => {
    // Check if article has "Calgary" in category or categories array
    const hasCalgaryCategory = post.category?.toLowerCase().includes('calgary');
    const hasCalgaryInCategories = post.categories?.some((cat: string) => 
      cat.toLowerCase().includes('calgary')
    );
    
    return hasCalgaryCategory || hasCalgaryInCategories;
  }).slice(0, 3)
  // SIMPLE CATEGORY-BASED FILTERING for Food & Drink
  const foodDrinkPosts = sortedPosts.filter(post => {
    // Check if article has "Food & Drink" in category or categories array
    const category = post.category?.toLowerCase() || '';
    const categories = post.categories || [];
    const title = post.title?.toLowerCase() || '';
    
    // Check for exact match or contains food/drink
    const hasFoodCategory = category.includes('food & drink') || 
                           category.includes('food') || 
                           category.includes('drink');
    
    const hasFoodInCategories = categories.some((cat: string) => {
      const catLower = cat.toLowerCase();
      return catLower.includes('food & drink') ||
             catLower.includes('food') ||
             catLower.includes('drink');
    });
    
    // Also check title for food-related keywords (fallback for missing categories)
    const hasFoodInTitle = title.includes('restaurant') || 
                          title.includes('sushi') || 
                          title.includes('food') ||
                          title.includes('romantic') ||
                          title.includes('dining') ||
                          title.includes('cafe') ||
                          title.includes('bar') ||
                          title.includes('drink');
    
    const isFoodDrink = hasFoodCategory || hasFoodInCategories || hasFoodInTitle;
    
    // Debug logging for each post
    if (post.title?.toLowerCase().includes('restaurant') || 
        post.title?.toLowerCase().includes('sushi') || 
        post.title?.toLowerCase().includes('food') ||
        post.title?.toLowerCase().includes('romantic')) {
      console.log(`🔍 FOOD DEBUG: "${post.title}" - category: "${post.category}", categories: [${categories.join(', ')}], hasFoodInTitle: ${hasFoodInTitle}, isFoodDrink: ${isFoodDrink}, date: ${post.date || post.createdAt}`)
    }
    
    return isFoodDrink;
  }).slice(0, 3) // Take the first 3 (which should be the newest since sortedPosts is already sorted by date)
  
  // SIMPLE CATEGORY-BASED FILTERING for Events
  const eventPosts = sortedPosts.filter(post => {
    // Check if article has "Events" in category or categories array
    const hasEventCategory = post.category?.toLowerCase().includes('event');
    const hasEventInCategories = post.categories?.some((cat: string) => 
      cat.toLowerCase().includes('event')
    );
    
    return hasEventCategory || hasEventInCategories;
  }).slice(0, 3)
  
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
  console.log('=== SIMPLE CATEGORY-BASED FILTERING RESULTS ===')
  console.log('Edmonton posts found:', edmontonPosts.length)
  console.log('Edmonton posts:', edmontonPosts.map(p => ({ title: p.title, category: p.category, categories: p.categories })))
  
  console.log('Calgary posts found:', calgaryPosts.length)
  console.log('Calgary posts:', calgaryPosts.map(p => ({ title: p.title, category: p.category, categories: p.categories })))
  
  console.log('Food & Drink posts found:', foodDrinkPosts.length)
  console.log('Food & Drink posts:', foodDrinkPosts.map(p => ({ title: p.title, category: p.category, categories: p.categories })))
  
  // Debug: Check all posts with food/drink related content
  console.log('DEBUG: All posts with food/drink keywords:')
  sortedPosts.forEach((post, index) => {
    const title = post.title?.toLowerCase() || '';
    const category = post.category?.toLowerCase() || '';
    const categories = post.categories?.map(c => c.toLowerCase()) || [];
    
    if (title.includes('food') || title.includes('restaurant') || title.includes('sushi') || 
        title.includes('drink') || category.includes('food') || category.includes('drink') ||
        categories.some(c => c.includes('food') || c.includes('drink'))) {
      console.log(`  ${index}: "${post.title}" - category: "${post.category}", categories: [${categories.join(', ')}]`)
    }
  })
  
  console.log('Events found:', eventPosts.length)
  console.log('Events:', eventPosts.map(p => ({ title: p.title, category: p.category, categories: p.categories })))
  
  const upcomingEvents = eventPosts.slice(0, 3) // Get the first 3 events

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
                          loading="lazy"
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
                        <Link href={getEventUrl(event)}>
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