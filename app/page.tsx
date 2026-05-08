import Link from 'next/link'
import Image from 'next/image'
import { getHomepageArticles } from '@/lib/articles'
import { getAllAlbertaArticles } from '@/lib/alberta-cities'
import { getAllEvents } from '@/lib/events'
import { ArrowRight } from 'lucide-react'
import NewsletterSignup from '@/components/newsletter-signup'
import { SearchBar } from '@/components/search-bar'
import { Article } from '@/lib/types/article'
import { BestOfSection } from '@/components/best-of-section'
import { getArticleUrl, getEventUrl } from '@/lib/utils/article-url'
import { getTrendingByViews } from '@/lib/trending-articles'
import { loadOptimizedFallback } from '@/lib/optimized-fallback'

// ISR: cache for 10 min, revalidate in background — reduces Supabase load during traffic spikes
export const revalidate = 600
export const dynamicParams = true // Generate pages on-demand

// Server-side data loading for dynamic rendering (NOT static generation)
async function getHomePageData() {
  try {
    // Start parallel fetches early so homepage does not block on sequential waits
    const eventsPromise = getAllEvents()
    const albertaArticlesPromise = getAllAlbertaArticles()

    // Use the sustainable homepage articles function with optimized fallback
    const apiArticles = await getHomepageArticles()

    // Resolve in-flight parallel fetches
    const [eventsResult, albertaArticlesResult] = await Promise.allSettled([
      eventsPromise,
      albertaArticlesPromise
    ])

    let events: any[] = eventsResult.status === 'fulfilled' ? eventsResult.value : []
    if (eventsResult.status === 'rejected') {
      console.error('❌ Error fetching events:', eventsResult.reason)
    }

    const albertaArticles: Article[] = albertaArticlesResult.status === 'fulfilled' ? albertaArticlesResult.value : []
    if (albertaArticlesResult.status === 'rejected') {
      console.warn('⚠️ Failed to load Alberta articles for homepage:', albertaArticlesResult.reason)
    }


    // Convert events to article format for homepage display only
    const eventAsArticles = events.map(event => ({
      id: event.id,
      title: event.title,
      excerpt: event.excerpt || event.description || '',
      content: event.description || '',
      category: 'Events', // Mark as Events category
      categories: ['Events'], // Add to categories array
      location: event.location,
      author: event.organizer || 'Event Organizer',
      imageUrl: event.imageUrl || event.image_url || "",
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

    // Use articles only for general content (events are filtered out in getHomepageArticles)
    // Events are handled separately for the "Upcoming Events" section
    const combinedPosts = [...apiArticles, ...eventAsArticles]

    // DEDUPLICATE: Remove any duplicate IDs (can happen if same content is in both sources)
    const seenIds = new Set<string>()
    const allPosts = combinedPosts.filter(post => {
      if (seenIds.has(post.id)) return false
      seenIds.add(post.id)
      return true
    })

    // Simple approach: Use all posts for all sections, filter by categories
    const allPostsForFiltering = allPosts
    console.log('🔍 DEBUG: allPostsForFiltering length:', allPostsForFiltering.length)
    console.log('🔍 DEBUG: First few post titles:', allPostsForFiltering.slice(0, 3).map(p => p.title))

    // CRITICAL: If no posts are found, create fallback content to prevent empty homepage
    if (allPostsForFiltering.length === 0) {
      console.warn('⚠️ No articles found in database, using fast fallback content')
      console.log('🔍 DEBUG: allPostsForFiltering is empty, checking why...')
      console.log('🔍 DEBUG: apiArticles length:', apiArticles?.length || 0)
      console.log('🔍 DEBUG: events length:', events?.length || 0)
      console.log('🔍 DEBUG: combinedPosts length:', combinedPosts?.length || 0)

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
      return { posts: fallbackPosts, events: [], albertaArticles: [] }
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
      events,
      albertaArticles,
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
    return { posts: fallbackPosts, events: [], albertaArticles: [] }
  }
}

export default async function HomeStatic() {
  // Load data for static generation
  const { posts, events, albertaArticles } = await getHomePageData()

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
    if (!dateString) return 'Date TBA'

    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return 'Date TBA'

      const datePart = date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'America/Edmonton'
      })
      const timeMatch = dateString.match(/T\d{1,2}:\d{2}/)
      const isMidnight = timeMatch && date.getUTCHours() === 0 && date.getUTCMinutes() === 0
      const timePart = timeMatch && !isMidnight
        ? date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/Edmonton' })
        : ''

      return timePart ? `${datePart} at ${timePart}` : datePart
    } catch (error) {
      console.error('Error formatting date:', error, 'Date string:', dateString)
      return 'Date TBA'
    }
  }

  const getPostTitle = (post: Article) => {
    return post.title || 'Untitled Article'
  }

  const getPostExcerpt = (post: Article) => {
    if (post.excerpt) {
      return post.excerpt
    }
    if (post.content && post.content.trim()) {
      return post.content.substring(0, 150) + '...'
    }
    return 'Article content coming soon...'
  }

  const getPostImage = (post: Article) => {
    // BANDWIDTH FIX: Skip base64 images to prevent embedding in HTML
    const imageUrl = post.imageUrl
    if (!imageUrl || imageUrl.startsWith('data:image')) {
      return '/placeholder.svg'
    }
    return imageUrl
  }

  const getPostCategory = (post: Article) => {
    return post.category || 'General'
  }

  const getPostDate = (post: Article) => {
    // For events, use event_date field, otherwise use date or createdAt
    const eventDate = (post as any).event_date
    const regularDate = post.date
    const createdAt = post.createdAt
    const fallback = new Date().toISOString()

    console.log('Server getPostDate for post:', post.title, {
      event_date: eventDate,
      date: regularDate,
      createdAt: createdAt,
      type: (post as any).type
    })

    return eventDate || regularDate || createdAt || fallback
  }

  const getPostAuthor = (post: Article) => {
    return post.author || 'Culture Alberta'
  }

  let fallbackPosts: Article[] = []
  try {
    fallbackPosts = (await loadOptimizedFallback()).filter(post =>
      post.type !== 'event' &&
      (post.status === 'published' || post.status === undefined || post.status === null)
    )
  } catch (error) {
    console.warn('Failed to load homepage fallback posts:', error)
  }

  // Sort articles by date (newest first) before filtering
  // For articles, prioritize date; for events, use date or createdAt
  const sortedPosts = posts.sort((a, b) => {
    let dateA: Date, dateB: Date;

    if (a.type === 'event') {
      // For events, use event_date if available, otherwise createdAt
      dateA = new Date(a.date || a.createdAt || 0)
    } else {
      // For articles, prioritize date over createdAt (since articles use date field)
      dateA = new Date(a.date || a.createdAt || 0)
    }

    if (b.type === 'event') {
      // For events, use event_date if available, otherwise createdAt
      dateB = new Date(b.date || b.createdAt || 0)
    } else {
      // For articles, prioritize date over createdAt (since articles use date field)
      dateB = new Date(b.date || b.createdAt || 0)
    }

    return dateB.getTime() - dateA.getTime() // Newest first
  })

  const fallbackSortedPosts = fallbackPosts.sort((a, b) =>
    new Date(b.date || b.createdAt || 0).getTime() - new Date(a.date || a.createdAt || 0).getTime()
  )

  const homepageCandidatePosts = [...sortedPosts, ...fallbackSortedPosts].filter((post, index, arr) =>
    post.type !== 'event' && arr.findIndex(item => item.id === post.id) === index
  )

  // Prefer explicit featured flags, but never show an empty hero when articles exist.
  const featuredPost =
    homepageCandidatePosts.find(post => post.featuredHome === true) ||
    homepageCandidatePosts.find(post => !!getPostImage(post) && getPostImage(post) !== '/placeholder.svg') ||
    homepageCandidatePosts[0] ||
    null


  // Other Alberta cities - exclude these from Edmonton/Calgary spotlights (fixes mis-tagged articles)
  const OTHER_ALBERTA_CITIES = ['red deer', 'lethbridge', 'medicine hat', 'grande prairie', 'fort mcmurray', 'airdrie', 'st. albert', 'okotoks', 'canmore', 'banff', 'brooks', 'edson', 'camrose', 'lloydminster', 'drumheller', 'jasper']
  const isFromOtherAlbertaCity = (post: Article) => {
    const loc = (post.location || '').toLowerCase().trim()
    const cats = (post.categories || []).map((c: string) => c.toLowerCase())
    const tags = ((post as any).tags || []).map((t: string) => t.toLowerCase())
    const combined = [loc, ...cats, ...tags].join(' ')
    // Location "Alberta" = province-wide, not city-specific
    if (loc === 'alberta') return false
    return OTHER_ALBERTA_CITIES.some(city => combined.includes(city))
  }

  const hasCitySignal = (post: Article, city: string) => {
    const cityLower = city.toLowerCase()
    return post.category?.toLowerCase().includes(cityLower) ||
      post.categories?.some((cat: string) => cat.toLowerCase().includes(cityLower)) ||
      post.location?.toLowerCase().includes(cityLower) ||
      (post as any).tags?.some((tag: string) => tag.toLowerCase().includes(cityLower)) ||
      post.title?.toLowerCase().includes(cityLower)
  }

  // Edmonton Spotlight: Edmonton-only, exclude Red Deer/Lethbridge etc (even if mis-tagged)
  const primaryEdmontonPosts = homepageCandidatePosts.filter(post => {
    if (post.type === 'event') return false
    if (isFromOtherAlbertaCity(post)) return false

    return hasCitySignal(post, 'edmonton')
  }).slice(0, 3)
  const fallbackEdmontonPosts = fallbackSortedPosts.filter(post => {
    if (post.type === 'event') return false
    if (isFromOtherAlbertaCity(post)) return false
    return hasCitySignal(post, 'edmonton')
  }).slice(0, 3)
  const edmontonPosts = primaryEdmontonPosts.length > 0 ? primaryEdmontonPosts : fallbackEdmontonPosts

  // Calgary Spotlight: Calgary-only, exclude Red Deer/Lethbridge etc (even if mis-tagged)
  const calgaryPosts = homepageCandidatePosts.filter(post => {
    if (post.type === 'event') return false
    if (isFromOtherAlbertaCity(post)) return false

    return hasCitySignal(post, 'calgary')
  }).slice(0, 3)

  // More From Alberta: Alberta-wide, Red Deer, Lethbridge, Medicine Hat, Grande Prairie, other communities
  // Uses dedicated Alberta article fetch (not limited homepage pool) so all regions appear
  const albertaSorted = albertaArticles
    .filter(post => post.type !== 'event')
    .sort((a, b) =>
      new Date(b.date || b.createdAt || 0).getTime() - new Date(a.date || a.createdAt || 0).getTime()
    )
  const moreFromAlbertaPosts = albertaSorted.slice(0, 6)
  // SIMPLE CATEGORY-BASED FILTERING for Food & Drink
  const foodDrinkPosts = sortedPosts.filter(post => {
    // First filter out events - events should not appear in Food & Drink section
    if (post.type === 'event') return false;

    // Check if article has "Food & Drink" in category or categories array
    const category = post.category?.toLowerCase() || '';
    const categories = post.categories || [];
    const title = post.title?.toLowerCase() || '';

    // Check for "food" or "drink" in category or categories array
    // We match substrings for robustness but ONLY in the category fields (no title check)
    const hasFoodCategory = category.includes('food') || category.includes('drink');

    const hasFoodInCategories = categories.some((cat: string) => {
      const catLower = cat.toLowerCase();
      return catLower.includes('food') || catLower.includes('drink');
    });

    return hasFoodCategory || hasFoodInCategories;
  }).slice(0, 3) // Take the first 3 (which should be the newest since sortedPosts is already sorted by date)


  // Upcoming Events must only show real event records
  const eventPosts = sortedPosts.filter(post => {
    return post.type === 'event'
  })
  const rawEventPosts = (events || []).map((event: any) => ({
    id: event.id,
    title: event.title,
    excerpt: event.excerpt || event.description || '',
    content: event.description || '',
    category: 'Events',
    categories: ['Events'],
    location: event.location,
    author: event.organizer || 'Event Organizer',
    imageUrl: event.imageUrl || event.image_url || '',
    date: event.event_date,
    createdAt: event.created_at,
    updatedAt: event.updated_at,
    status: event.status,
    type: 'event',
  })) as Article[]

  // Trending: use actual view data when available, else recent articles
  const eligiblePosts = sortedPosts.filter(post => post.type !== 'event')
  const trendingByViews = await getTrendingByViews(eligiblePosts, { days: 7, limit: 5 })
  const trendingByFlag = eligiblePosts.filter(post => post.trendingHome === true)
  const trendingPosts = trendingByViews.length > 0
    ? trendingByViews
    : trendingByFlag.length > 0
      ? trendingByFlag.slice(0, 5)
      : eligiblePosts.slice(0, 5)

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

  const now = new Date()
  const eventCandidates = [...eventPosts, ...rawEventPosts]
    .filter((event, index, arr) => arr.findIndex(item => item.id === event.id) === index)
    .filter(event => {
      const eventDate = new Date(getPostDate(event))
      return !isNaN(eventDate.getTime()) && eventDate >= now
    })
    .sort((a, b) => new Date(getPostDate(a)).getTime() - new Date(getPostDate(b)).getTime())
  const upcomingEvents = eventCandidates.slice(0, 3)

  return (
    <>
      {/* Metadata is handled by layout.tsx - no PageSEO needed in App Router */}
      <div className="flex min-h-screen flex-col">
        <main className="flex-1">
          {/* SEO H1 - visually hidden but present for search engines */}
          <h1 className="sr-only">Culture Alberta — Your Guide to Events, Culture & Food in Calgary & Edmonton</h1>

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
                            <span className="bg-red-500 text-white px-2 py-1 text-xs rounded font-medium">Featured</span>
                            <span className="rounded-full bg-black text-white px-4 py-1.5 font-medium">{getPostCategory(featuredPost)}</span>
                          </div>
                          <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold group-hover:text-gray-600 transition-colors duration-300 mb-3 leading-tight">{getPostTitle(featuredPost)}</h2>
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
                  <div className="mt-3 text-center">
                    <Link href="/partner" className="text-sm text-gray-500 hover:text-gray-800 underline underline-offset-2">
                      Have your business featured today →
                    </Link>
                  </div>
                </div>

                {/* Trending Sidebar */}
                <div className="space-y-6">
                  {/* Search */}
                  <div className="bg-white rounded-xl shadow-sm p-6">
                    <SearchBar variant="default" className="mb-0" />
                  </div>
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
                                <h3 className="font-display font-semibold text-base group-hover:text-gray-600 transition-colors duration-300 line-clamp-2 leading-tight">{getPostTitle(post)}</h3>
                              </div>
                            </div>
                          </Link>
                        ))
                      ) : (
                        // Fallback: show recent articles if no trending articles
                        posts.filter(post => post.type !== 'event').slice(0, 3).map((post, index) => (
                          <Link key={post.id} href={getArticleUrl(post)} className="block group">
                            <div className="flex items-start space-x-4">
                              <span className="text-lg font-bold text-gray-300 bg-gray-100 rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">{index + 1}</span>
                              <div>
                                <h3 className="font-display font-semibold text-base group-hover:text-gray-600 transition-colors duration-300 line-clamp-2 leading-tight">{getPostTitle(post)}</h3>
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
                <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-blue-600">Edmonton Spotlight</h2>
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
                          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />
                      </div>
                      <div className="p-4">
                        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                          <span className="rounded-full bg-blue-100 text-blue-800 px-3 py-1.5 font-medium">Edmonton</span>
                          <span className="font-medium">{formatDate(getPostDate(post))}</span>
                        </div>
                        <h3 className="font-display font-bold text-xl group-hover:text-gray-600 transition-colors duration-300 line-clamp-2 leading-tight">{getPostTitle(post)}</h3>
                        {getPostExcerpt(post) && <p className="font-body text-sm text-gray-500 mt-1 line-clamp-2">{getPostExcerpt(post)}</p>}
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
                <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-red-600">Calgary Spotlight</h2>
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
                          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />
                      </div>
                      <div className="p-4">
                        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                          <span className="rounded-full bg-red-100 text-red-800 px-3 py-1.5 font-medium">Calgary</span>
                          <span className="font-medium">{formatDate(getPostDate(post))}</span>
                        </div>
                        <h3 className="font-display font-bold text-xl group-hover:text-red-600 transition-colors duration-300 line-clamp-2 leading-tight">{getPostTitle(post)}</h3>
                        {getPostExcerpt(post) && <p className="font-body text-sm text-gray-500 mt-1 line-clamp-2">{getPostExcerpt(post)}</p>}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>

          {/* More From Alberta */}
          {moreFromAlbertaPosts.length > 0 && (
            <section className="w-full py-8">
              <div className="container mx-auto px-4 md:px-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-emerald-700">More From Alberta</h2>
                  <Link href="/alberta" className="text-emerald-700 hover:text-emerald-800 flex items-center gap-2 font-body font-medium">
                    View All <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {moreFromAlbertaPosts.map((post) => {
                    const loc = (post.location || '').trim() || post.categories?.[0] || (post as any).tags?.[0] || ''
                    const displayLoc = loc || 'Alberta'
                    return (
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
                              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            />
                          </div>
                          <div className="p-4">
                            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                              <span className="rounded-full bg-emerald-100 text-emerald-800 px-3 py-1.5 font-medium">{displayLoc}</span>
                              <span className="font-medium">{formatDate(getPostDate(post))}</span>
                            </div>
                            <h3 className="font-display font-bold text-xl group-hover:text-emerald-600 transition-colors duration-300 line-clamp-2 leading-tight">{getPostTitle(post)}</h3>
                            {getPostExcerpt(post) && <p className="font-body text-sm text-gray-500 mt-1 line-clamp-2">{getPostExcerpt(post)}</p>}
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            </section>
          )}

          {/* Upcoming Events */}
          <section className="w-full py-8">
            <div className="container mx-auto px-4 md:px-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold">Upcoming Events</h2>
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
                          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
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
                <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold">Food & Drink</h2>
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
                            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
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
