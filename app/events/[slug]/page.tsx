/**
 * Optimized Event Detail Page
 * 
 * Performance optimizations:
 * - Uses ISR (Incremental Static Regeneration) for fast loads
 * - Efficient data fetching with utility functions
 * - Optimized images with Next.js Image component
 * - No console.logs in production
 * - Reusable components for better maintainability
 * 
 * Caching strategy:
 * - Revalidates every 300 seconds (5 minutes)
 * - Falls back to cached version if fetch fails
 * - Reduces server load and improves TTFB
 * 
 * Used as: Event detail page route (/events/[slug])
 */

import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, Calendar, MapPin, User, Mail, ExternalLink, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createSlug } from '@/lib/utils/slug'
import { getAllArticles } from '@/lib/articles'
import { getArticleUrl } from '@/lib/utils/article-url'
import { ArticleContent } from '@/components/article-content'
import ArticleNewsletterSignup from '@/components/article-newsletter-signup'
import { Article } from '@/lib/types/article'
import { Metadata } from 'next'
import { EventImage } from '@/components/event-image'
import { Event } from '@/lib/types/event'
import { findEventBySlug, generateEventStaticParams, getEventDetailPageData } from '@/lib/data/event-data'
import { formatEventDate, formatEventTime, formatEventDateWithWeekday } from '@/lib/utils/date'
import { getArticleTitle, getArticleExcerpt, getArticleImage, getArticleCategory } from '@/lib/utils/article-helpers'

// PERFORMANCE: Use ISR for better performance
// Revalidates every 5 minutes - balances freshness with performance
// PERFORMANCE: Use ISR with aggressive caching for instant loads
// Revalidates every 2 minutes - faster updates while maintaining speed
export const revalidate = 120

/**
 * Generates static params for all published events
 * 
 * @returns Array of slug parameters for static generation
 * 
 * Performance:
 * - Only generates params for published events
 * - Uses consistent slug generation
 */
export async function generateStaticParams() {
  return await generateEventStaticParams()
}

/**
 * Generates metadata for SEO and social media sharing
 * 
 * @param params - Route parameters containing slug
 * @returns Metadata object for Next.js
 * 
 * Performance:
 * - Uses fast event lookup
 * - Falls back gracefully if event not found
 * - Optimizes image URLs
 */
export async function generateMetadata({ 
  params 
}: { 
  params: Promise<{ slug: string }> 
}): Promise<Metadata> {
  const resolvedParams = await params
  const slug = resolvedParams.slug
  
  try {
    const event = await findEventBySlug(slug)
    
    if (!event) {
      return {
        title: 'Event Not Found | Culture Alberta',
        description: 'The requested event could not be found.',
      }
    }
    
    const fullTitle = event.title.includes('Culture Alberta') 
      ? event.title 
      : `${event.title} | Culture Alberta`
    
    const description = event.excerpt || 
                       event.description || 
                       `Join us for ${event.title} in ${event.location || 'Alberta'}`
    
    const fullUrl = `https://www.culturealberta.com/events/${slug}`
    
    // Handle image URL properly
    let eventImage = event.image_url || '/images/culture-alberta-og.jpg'
    
    // Ensure image URL is absolute
    const absoluteImageUrl = eventImage.startsWith('http') 
      ? eventImage 
      : eventImage.startsWith('data:image')
      ? eventImage
      : `https://www.culturealberta.com${eventImage}`
    
    return {
      title: fullTitle,
      description: description,
      keywords: [...(event.tags || []), event.category, 'Alberta', 'Events', 'Culture'].filter(Boolean).join(', '),
      authors: [{ name: event.organizer || 'Culture Alberta' }],
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
            alt: event.title,
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
    if (process.env.NODE_ENV === 'development') {
      console.error('Error generating event metadata:', error)
    }
    return {
      title: 'Event | Culture Alberta',
      description: 'Discover amazing events in Alberta.',
    }
  }
}

/**
 * Event Detail Page Component
 * 
 * Displays event details with related content
 * 
 * Performance:
 * - Server-side rendered with ISR
 * - Optimized data fetching
 * - Efficient image loading
 */
export default async function EventDetailPage({ 
  params 
}: { 
  params: Promise<{ slug: string }> 
}) {
  const resolvedParams = await params
  const slug = resolvedParams.slug
  
  try {
    // PERFORMANCE: Fetch event by slug
    const event = await findEventBySlug(slug)
    
    if (!event) {
      notFound()
    }
    
    // PERFORMANCE: Fetch related content
    const relatedData = await getEventDetailPageData(event.id)
    
    if (!relatedData) {
      // Fallback: fetch minimal related content (exclude content field)
      const { loadOptimizedFallback } = await import('@/lib/optimized-fallback')
      const allContent = await loadOptimizedFallback()
      
      const allArticles = allContent
        .filter((item: any) => item.type !== 'event')
        .map((item: any) => ({
          ...item,
          content: undefined // Don't include content for related articles
        }))
      
      const allEvents = allContent.filter((item: any) => item.type === 'event')
      
      return (
        <EventDetailContent
          event={event}
          latestArticles={allArticles.slice(0, 3) as Article[]}
          moreEvents={allEvents.filter((e: any) => e.id !== event.id && (e.status === 'published' || !e.status)).slice(0, 3) as Event[]}
          moreArticles={allArticles.slice(0, 6) as Article[]}
          slug={slug}
        />
      )
    }
    
    return (
      <EventDetailContent
        event={event}
        latestArticles={relatedData.latestArticles}
        moreEvents={relatedData.moreEvents as Event[]}
        moreArticles={relatedData.moreArticles}
        slug={slug}
      />
    )
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error loading event:', error)
    }
    notFound()
  }
}

/**
 * Event Detail Content Component
 * 
 * Main content component for event detail page
 * 
 * @param event - Event object
 * @param latestArticles - Latest articles for sidebar
 * @param moreEvents - More events for sidebar
 * @param moreArticles - More articles for bottom section
 * @param slug - Event slug for sharing
 */
function EventDetailContent({
  event,
  latestArticles,
  moreEvents,
  moreArticles,
  slug,
}: {
  event: Event
  latestArticles: Article[]
  moreEvents: Event[]
  moreArticles: Article[]
  slug: string
}) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.culturealberta.com'
  const eventUrl = `${baseUrl}/events/${slug}`
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 md:px-8 py-8">
        {/* Back Button */}
        <div className="mb-6">
          <Button variant="ghost" asChild>
            <Link href="/events">
              <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
              Back to Events
            </Link>
          </Button>
        </div>

        <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
          {/* Main Content */}
          <div className="space-y-8">
            {/* Event Image */}
            <EventImage 
              imageUrl={(event as any).imageUrl || event.image_url}
              image_url={event.image_url}
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
            <EventInfoCard event={event} />
            <ShareEventCard event={event} eventUrl={eventUrl} />
            {latestArticles.length > 0 && (
              <LatestArticlesCard articles={latestArticles} />
            )}
            {moreEvents.length > 0 && (
              <MoreEventsCard events={moreEvents} />
            )}
          </div>
        </div>

        {/* More Articles Section */}
        {moreArticles.length > 0 && (
          <MoreArticlesSection articles={moreArticles} />
        )}
      </div>
    </div>
  )
}

/**
 * Event Info Card Component
 * 
 * Displays event details (date, location, organizer, etc.)
 * 
 * @param event - Event object
 */
function EventInfoCard({ event }: { event: Event }) {
  return (
    <div className="bg-white rounded-lg border p-6">
      <h2 className="text-xl font-semibold mb-4">Event Details</h2>
      
      <div className="space-y-4">
        {/* Date & Time */}
        <div className="flex items-start gap-3">
          <Calendar className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" aria-hidden="true" />
          <div>
            <div className="font-medium">{formatEventDateWithWeekday(event.event_date)}</div>
            <div className="text-sm text-gray-600">{formatEventTime(event.event_date)}</div>
            {event.event_end_date && (
              <div className="text-sm text-gray-600 mt-1">
                Ends: {formatEventDate(event.event_end_date)}
              </div>
            )}
          </div>
        </div>

        {/* Location */}
        {event.location && (
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" aria-hidden="true" />
            <div>
              <div className="font-medium">{event.location}</div>
              {event.venue_address && (
                <div className="text-sm text-gray-600 mt-1">{event.venue_address}</div>
              )}
            </div>
          </div>
        )}

        {/* Organizer */}
        {event.organizer && (
          <div className="flex items-start gap-3">
            <User className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" aria-hidden="true" />
            <div>
              <div className="font-medium">Organizer</div>
              <div className="text-sm text-gray-600">{event.organizer}</div>
            </div>
          </div>
        )}

        {/* Contact Information */}
        {event.organizer_contact && (
          <div className="flex items-start gap-3">
            <Mail className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" aria-hidden="true" />
            <div>
              <div className="font-medium">Contact</div>
              <div className="text-sm text-gray-600">{event.organizer_contact}</div>
            </div>
          </div>
        )}

        {/* Price */}
        {event.price !== undefined && event.price !== null && (
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" aria-hidden="true" />
            <div>
              <div className="font-medium">Price</div>
              <div className="text-sm text-gray-600">
                {event.currency && event.currency !== 'CAD' ? `${event.currency} ` : '$'}
                {typeof event.price === 'number' ? event.price.toFixed(2) : event.price}
                {event.currency === 'CAD' || !event.currency ? ' CAD' : ''}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Ticket URL Button */}
      {event.website_url && (
        <div className="mt-6">
          <Button asChild className="w-full">
            <Link href={event.website_url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" />
              Buy Tickets / More Info
            </Link>
          </Button>
        </div>
      )}
    </div>
  )
}

/**
 * Share Event Card Component
 * 
 * @param event - Event object
 * @param eventUrl - Full URL to the event page
 */
function ShareEventCard({ event, eventUrl }: { event: Event; eventUrl: string }) {
  const shareText = `Check out this event: ${event.title}`
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(eventUrl)}`
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(eventUrl)}`
  
  return (
    <div className="bg-white rounded-lg border p-6">
      <h3 className="text-lg font-semibold mb-3">Share This Event</h3>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link 
            href={twitterUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Share on Twitter"
          >
            Twitter
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link 
            href={facebookUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Share on Facebook"
          >
            Facebook
          </Link>
        </Button>
      </div>
    </div>
  )
}

/**
 * Latest Articles Card Component
 * 
 * @param articles - Array of latest articles
 */
function LatestArticlesCard({ articles }: { articles: Article[] }) {
  return (
    <div className="bg-white rounded-lg border p-6">
      <h3 className="text-lg font-semibold mb-4">Latest Articles</h3>
      <nav className="space-y-4" aria-label="Latest articles">
        {articles.map((article) => (
          <Link 
            key={article.id} 
            href={getArticleUrl(article)}
            className="group block"
          >
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-16 h-16 bg-gray-200 rounded-lg overflow-hidden relative">
                <Image
                  src={getArticleImage(article)}
                  alt={getArticleTitle(article)}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  sizes="64px"
                  loading="lazy"
                  quality={70}
                />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                  {getArticleTitle(article)}
                </h4>
                <p className="text-xs text-gray-500 mt-1">
                  {getArticleCategory(article)}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </nav>
    </div>
  )
}

/**
 * More Events Card Component
 * 
 * @param events - Array of related events (can be Event or Article type)
 */
function MoreEventsCard({ events }: { events: (Event | Article)[] }) {
  return (
    <div className="bg-white rounded-lg border p-6">
      <h3 className="text-lg font-semibold mb-4">More Events</h3>
      <nav className="space-y-4" aria-label="More events">
        {events.map((otherEvent) => {
          const title = (otherEvent as any).title || (otherEvent as Article).title
          const location = (otherEvent as any).location || (otherEvent as Article).location || ''
          const imageUrl = (otherEvent as any).image_url || (otherEvent as Article).imageUrl || ''
          
          return (
            <Link 
              key={otherEvent.id} 
              href={`/events/${createSlug(title)}`}
              className="group block"
            >
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-16 h-16 bg-gray-200 rounded-lg overflow-hidden relative">
                  {imageUrl ? (
                    <Image
                      src={imageUrl}
                      alt={title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="64px"
                      loading="lazy"
                      quality={70}
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                      <span className="text-gray-400 text-xs">No Image</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                    {title}
                  </h4>
                  {location && (
                    <p className="text-xs text-gray-500 mt-1">
                      {location}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}

/**
 * More Articles Section Component
 * 
 * @param articles - Array of articles to display
 */
function MoreArticlesSection({ articles }: { articles: Article[] }) {
  return (
    <div className="mt-16 pt-12 border-t border-gray-200">
      <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">More Articles</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {articles.map((article) => (
          <Link 
            key={article.id} 
            href={getArticleUrl(article)}
            className="group block"
          >
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="aspect-[16/10] w-full bg-gray-200 relative overflow-hidden">
                <Image
                  src={getArticleImage(article)}
                  alt={getArticleTitle(article)}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-500"
                  loading="lazy"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  quality={75}
                />
              </div>
              <div className="p-6">
                <div className="flex items-center gap-3 text-sm text-gray-500 mb-3">
                  <span className="bg-blue-100 text-blue-800 px-3 py-1.5 rounded-full font-medium text-sm">
                    {getArticleCategory(article)}
                  </span>
                  {article.date && (
                    <time className="font-medium" dateTime={article.date}>
                      {formatEventDate(article.date)}
                    </time>
                  )}
                </div>
                <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2 mb-3 leading-tight">
                  {getArticleTitle(article)}
                </h3>
                {article.excerpt && (
                  <p className="text-gray-600 line-clamp-3 leading-relaxed">
                    {getArticleExcerpt(article, 120)}
                  </p>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
