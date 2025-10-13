import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, Calendar, MapPin, User, Phone, Mail, ExternalLink, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getAllEvents, getEventBySlug } from '@/lib/events'
import { createSlug } from '@/lib/utils/slug'
import { getAllArticles } from '@/lib/supabase-articles'
import { getArticleUrl } from '@/lib/utils/article-url'
import { ArticleContent } from '@/components/article-content'
import ArticleNewsletterSignup from '@/components/article-newsletter-signup'
import { Article } from '@/lib/types/article'
import { Metadata } from 'next'
import { EventImage } from '@/components/event-image'

// Generate static params for all published events
export async function generateStaticParams() {
  try {
    console.log('🔧 Generating static params for events...')
    const events = await getAllEvents()
    
    // Only generate params for published events
    const publishedEvents = events.filter(event => event.status === 'published')
    
    const params = publishedEvents.map((event) => {
      // Use consistent slug generation
      const slug = createSlug(event.title)
      
      return {
        slug: slug,
      }
    })
    
    console.log(`✅ Generated ${params.length} static params for published events`)
    return params
  } catch (error) {
    console.error('❌ Error generating static params:', error)
    // Return empty array to prevent build failure
    return []
  }
}

// Enable ISR (Incremental Static Regeneration)
export const revalidate = 300 // 5 minutes

// Generate metadata for social media sharing
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const resolvedParams = await params
  const slug = resolvedParams.slug
  
  try {
    // Load event data for metadata
    const loadedEvent = await getEventBySlug(slug)
    
    if (!loadedEvent) {
      return {
        title: 'Event Not Found | Culture Alberta',
        description: 'The requested event could not be found.',
      }
    }
    
    const fullTitle = loadedEvent.title.includes('Culture Alberta') ? loadedEvent.title : `${loadedEvent.title} | Culture Alberta`
    const description = loadedEvent.excerpt || loadedEvent.description || `Join us for ${loadedEvent.title} in ${loadedEvent.location || 'Alberta'}`
    const fullUrl = `https://www.culturealberta.com/events/${slug}`
    
    // Handle image URL properly - use event image if available, otherwise use default
    let eventImage = loadedEvent.image_url || '/images/culture-alberta-og.jpg'
    
    // Ensure image URL is absolute
    const absoluteImageUrl = eventImage.startsWith('http') 
      ? eventImage 
      : eventImage.startsWith('data:image')
      ? eventImage
      : `https://www.culturealberta.com${eventImage}`
    
    // Debug logging for metadata
    console.log('Event Metadata Debug:', {
      title: fullTitle,
      description: description,
      image: absoluteImageUrl,
      url: fullUrl,
      originalImage: loadedEvent.image_url
    })
    
    return {
      title: fullTitle,
      description: description,
      keywords: [...(loadedEvent.tags || []), loadedEvent.category, 'Alberta', 'Events', 'Culture'].filter(Boolean).join(', '),
      authors: [{ name: loadedEvent.organizer || 'Culture Alberta' }],
      openGraph: {
        type: 'website',
        title: fullTitle,
        description: description,
        url: fullUrl,
        images: [
          {
            url: absoluteImageUrl,
            width: 1200,
            height: 630,
            alt: loadedEvent.title,
          }
        ],
        siteName: 'Culture Alberta',
        locale: 'en_CA',
      },
      twitter: {
        card: 'summary_large_image',
        title: fullTitle,
        description: description,
        images: [absoluteImageUrl],
        site: '@culturealberta',
        creator: '@culturealberta',
      },
      alternates: {
        canonical: fullUrl,
      },
    }
  } catch (error) {
    console.error('Error generating event metadata:', error)
    return {
      title: 'Event | Culture Alberta',
      description: 'Discover amazing events in Alberta.',
    }
  }
}

export default async function EventDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params
  const slug = resolvedParams.slug
  
  try {
    console.log('🚀 Loading event:', slug)
    
    // Try to get event by slug
    let event = await getEventBySlug(slug)
    
    if (!event) {
      console.log('❌ Event not found:', slug)
      notFound()
    }
    
    console.log('✅ Event loaded:', event.title)
    console.log('🔍 Event description:', event.description)
    console.log('🔍 Event excerpt:', event.excerpt)
    
    // Load related content for sidebar and bottom sections
    let latestArticles: Article[] = []
    let moreEvents: any[] = []
    let moreArticlesForBottom: Article[] = []
    
    try {
      // Get latest articles for sidebar
      const allArticles = await getAllArticles()
      latestArticles = allArticles
        .filter(article => article.status === 'published')
        .slice(0, 3)
      
      // Get more articles for bottom section
      moreArticlesForBottom = allArticles
        .filter(article => article.status === 'published')
        .slice(0, 6)
      
      // Get more events
      const allEvents = await getAllEvents()
      moreEvents = allEvents
        .filter(e => e.id !== event.id && e.status === 'published')
        .slice(0, 3)
    } catch (error) {
      console.warn('Failed to load related content:', error)
    }
    
    // Format event date
    const formatEventDate = (dateString: string | undefined | null) => {
      if (!dateString) return 'Date TBA'
      try {
        const date = new Date(dateString)
        if (isNaN(date.getTime())) return 'Date TBA'
        return date.toLocaleDateString('en-US', { 
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      } catch {
        return 'Date TBA'
      }
    }

    const formatEventTime = (dateString: string | undefined | null) => {
      if (!dateString) return 'Time TBA'
      try {
        const date = new Date(dateString)
        if (isNaN(date.getTime())) return 'Time TBA'
        return date.toLocaleTimeString('en-US', { 
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        })
      } catch {
        return 'Time TBA'
      }
    }

    return (
      <>
        {/* Metadata is now handled by generateMetadata function */}
        <div className="min-h-screen bg-gray-50">
          <div className="container mx-auto px-8 py-8">
            {/* Back Button */}
            <div className="mb-6">
              <Button variant="ghost" asChild>
                <Link href="/events">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Events
                </Link>
              </Button>
            </div>

            <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
              {/* Main Content */}
              <div className="space-y-8">
                {/* Event Image */}
                <EventImage 
                  image_url={event.imageUrl || event.image_url}
                  title={event.title}
                />

                {/* Event Details */}
                <div className="space-y-6">
                  <div>
                    <h1 className="text-4xl font-bold mb-4">{event.title}</h1>
                    {event.excerpt && (
                      <p className="text-xl text-gray-600 mb-4">{event.excerpt}</p>
                    )}
                  </div>

                  {/* Event Description */}
                  {event.description && (
                    <div className="prose max-w-none">
                      <ArticleContent content={event.description} />
                    </div>
                  )}
                </div>

                {/* Newsletter Signup */}
                <ArticleNewsletterSignup 
                  articleTitle={event.title}
                  articleCategory={event.category}
                />
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Event Info Card */}
                <div className="bg-white rounded-lg border p-6">
                  <h2 className="text-xl font-semibold mb-4">Event Details</h2>
                  
                  <div className="space-y-4">
                    {/* Date & Time */}
                    <div className="flex items-start gap-3">
                      <Calendar className="h-5 w-5 text-gray-500 mt-0.5" />
                      <div>
                        <div className="font-medium">{formatEventDate(event.event_date)}</div>
                        <div className="text-sm text-gray-600">{formatEventTime(event.event_date)}</div>
                        {event.event_end_date && (
                          <div className="text-sm text-gray-600">
                            Ends: {formatEventDate(event.event_end_date)}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Location */}
                    {event.location && (
                      <div className="flex items-start gap-3">
                        <MapPin className="h-5 w-5 text-gray-500 mt-0.5" />
                        <div>
                          <div className="font-medium">{event.location}</div>
                        </div>
                      </div>
                    )}

                    {/* Organizer */}
                    {event.organizer && (
                      <div className="flex items-start gap-3">
                        <User className="h-5 w-5 text-gray-500 mt-0.5" />
                        <div>
                          <div className="font-medium">Organizer</div>
                          <div className="text-sm text-gray-600">{event.organizer}</div>
                        </div>
                      </div>
                    )}

                    {/* Contact Information */}
                    {event.organizer_contact && (
                      <div className="flex items-start gap-3">
                        <Mail className="h-5 w-5 text-gray-500 mt-0.5" />
                        <div>
                          <div className="font-medium">Contact</div>
                          <div className="text-sm text-gray-600">{event.organizer_contact}</div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Ticket URL Button */}
                  {event.website_url && (
                    <div className="mt-6">
                      <Button asChild className="w-full">
                        <Link href={event.website_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Buy Tickets / More Info
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>

                {/* Share Event */}
                <div className="bg-white rounded-lg border p-6">
                  <h3 className="text-lg font-semibold mb-3">Share This Event</h3>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link 
                        href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out this event: ${event.title}`)}&url=${encodeURIComponent(`${process.env.VERCEL_URL || 'http://localhost:3000'}/events/${slug}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Twitter
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link 
                        href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${process.env.VERCEL_URL || 'http://localhost:3000'}/events/${slug}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Facebook
                      </Link>
                    </Button>
                  </div>
                </div>

                {/* Latest Articles */}
                {latestArticles.length > 0 && (
                  <div className="bg-white rounded-lg border p-6">
                    <h3 className="text-lg font-semibold mb-4">Latest Articles</h3>
                    <div className="space-y-4">
                      {latestArticles.map((article) => (
                        <Link 
                          key={article.id} 
                          href={getArticleUrl(article)}
                          className="group block"
                        >
                          <div className="flex gap-3">
                            <div className="flex-shrink-0 w-16 h-16 bg-gray-200 rounded-lg overflow-hidden">
                              {article.imageUrl ? (
                                (article.imageUrl && (article.imageUrl.startsWith('data:image') || (article.imageUrl.length > 1000 && !article.imageUrl.includes('http')))) ? (
                                  <img
                                    src={article.imageUrl.startsWith('data:image') ? article.imageUrl : `data:image/jpeg;base64,${article.imageUrl}`}
                                    alt={article.title}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                    decoding="async"
                                  />
                                ) : (
                                  <Image
                                    src={article.imageUrl || ""}
                                    alt={article.title}
                                    width={64}
                                    height={64}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                    sizes="64px"
                                    quality={60}
                                  />
                                )
                              ) : (
                                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                  <span className="text-gray-400 text-xs">No Image</span>
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                                {article.title}
                              </h4>
                              <p className="text-xs text-gray-500 mt-1">
                                {article.category}
                              </p>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* More Events */}
                {moreEvents.length > 0 && (
                  <div className="bg-white rounded-lg border p-6">
                    <h3 className="text-lg font-semibold mb-4">More Events</h3>
                    <div className="space-y-4">
                      {moreEvents.map((otherEvent) => (
                        <Link 
                          key={otherEvent.id} 
                          href={`/events/${createSlug(otherEvent.title)}`}
                          className="group block"
                        >
                          <div className="flex gap-3">
                            <div className="flex-shrink-0 w-16 h-16 bg-gray-200 rounded-lg overflow-hidden">
                              {otherEvent.imageUrl ? (
                                <Image
                                  src={otherEvent.imageUrl || ""}
                                  alt={otherEvent.title}
                                  width={64}
                                  height={64}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                  sizes="64px"
                                  quality={60}
                                />
                              ) : (
                                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                  <span className="text-gray-400 text-xs">No Image</span>
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                                {otherEvent.title}
                              </h4>
                              <p className="text-xs text-gray-500 mt-1">
                                {otherEvent.location}
                              </p>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* More Articles Section - Full Width Below Main Content */}
            {moreArticlesForBottom.length > 0 && (
              <div className="mt-16 pt-12 border-t border-gray-200">
                <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">More Articles</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {moreArticlesForBottom.map((article) => (
                    <Link 
                      key={article.id} 
                      href={getArticleUrl(article)}
                      className="group block"
                    >
                      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                        <div className="aspect-[16/10] w-full bg-gray-200 relative overflow-hidden">
                          {article.imageUrl ? (
                            (article.imageUrl && (article.imageUrl.startsWith('data:image') || (article.imageUrl.length > 1000 && !article.imageUrl.includes('http')))) ? (
                              <img
                                src={article.imageUrl.startsWith('data:image') ? article.imageUrl : `data:image/jpeg;base64,${article.imageUrl}`}
                                alt={article.title}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                loading="lazy"
                                decoding="async"
                              />
                            ) : (
                              <Image
                                src={article.imageUrl || ""}
                                alt={article.title}
                                fill
                                className="object-cover group-hover:scale-110 transition-transform duration-500"
                                loading="lazy"
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                quality={75}
                              />
                            )
                          ) : (
                            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                              <span className="text-gray-400 text-lg">No Image</span>
                            </div>
                          )}
                          {/* Bookmark icon overlay */}
                          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <div className="bg-white/90 backdrop-blur-sm rounded-full p-2 shadow-lg">
                              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                              </svg>
                            </div>
                          </div>
                        </div>
                        <div className="p-6">
                          <div className="flex items-center gap-3 text-sm text-gray-500 mb-3">
                            <span className="bg-blue-100 text-blue-800 px-3 py-1.5 rounded-full font-medium text-sm">
                              {article.category}
                            </span>
                            {article.date && (
                              <span className="font-medium">{formatEventDate(article.date)}</span>
                            )}
                          </div>
                          <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2 mb-3 leading-tight">
                            {article.title}
                          </h3>
                          {article.excerpt && (
                            <p className="text-gray-600 line-clamp-3 leading-relaxed">
                              {article.excerpt}
                            </p>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </>
    )
  } catch (error) {
    console.error('❌ Error loading event:', error)
    notFound()
  }
}
