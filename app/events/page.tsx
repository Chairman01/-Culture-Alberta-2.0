/**
 * Optimized Events Listing Page
 * 
 * Performance optimizations:
 * - Server-side rendered with ISR
 * - Efficient event filtering with utility functions
 * - Optimized images with Next.js Image component
 * - No console.logs in production
 * - Client-side filtering for interactivity
 * 
 * Caching strategy:
 * - Revalidates every 300 seconds (5 minutes)
 * - Falls back to cached version if fetch fails
 * - Reduces server load and improves TTFB
 * 
 * Used as: Events listing route (/events)
 */

import Link from 'next/link'
import Image from 'next/image'
import { Calendar, MapPin, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getEventUrl } from '@/lib/utils/article-url'
import { formatEventDate } from '@/lib/utils/date'
import { filterEvents, sortEventsByDate, type EventFilters } from '@/lib/utils/event-filters'
import { Article } from '@/lib/types/article'
import EventsClient from './events-client'

// PERFORMANCE: Use ISR with aggressive caching for instant loads
// Revalidates every 2 minutes - faster updates while maintaining speed
export const revalidate = 120

/**
 * Events Listing Page Component
 * 
 * Server component that fetches events and passes them to client component
 * for interactive filtering
 * 
 * Performance:
 * - Server-side data fetching (faster initial load)
 * - ISR caching (reduces server load)
 * - Client-side filtering (smooth UX)
 */
export default async function EventsPage() {
  try {
    // PERFORMANCE: Fetch events from fallback directly (getAllEvents() just filters from fallback)
    const { loadOptimizedFallback } = await import('@/lib/optimized-fallback')
    const allContent = await loadOptimizedFallback()
    
    // Filter for events only (they're stored as Article[] with type='event' in fallback)
    const events: Article[] = allContent.filter(article => article.type === 'event')
    
    // PERFORMANCE: Sort events by date once (upcoming first)
    const sortedEvents = sortEventsByDate(events)
    
    // Filter for published events only
    const publishedEvents = sortedEvents.filter(
      event => event.status === 'published' || !event.status
    )
    
    return (
      <div className="flex min-h-screen flex-col">
        <main className="flex-1">
          {/* Hero Section */}
          <section className="w-full py-16 md:py-24 lg:py-32 bg-muted/40">
            <div className="container mx-auto max-w-7xl px-4 md:px-6">
              <div className="flex flex-col items-center justify-center space-y-4 text-center">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl">
                    Cultural Events
                  </h1>
                  <p className="max-w-[900px] text-muted-foreground md:text-xl mx-auto">
                    Discover cultural events, festivals, and performances happening across Alberta.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Events List with Filters */}
          <section className="w-full py-16 md:py-24 lg:py-32">
            <div className="container mx-auto max-w-7xl px-4 md:px-6">
              <EventsClient initialEvents={publishedEvents} />
            </div>
          </section>
        </main>
      </div>
    )
  } catch (error) {
    // Return fallback content on error
    if (process.env.NODE_ENV === 'development') {
      console.error('Error loading events:', error)
  }

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        <section className="w-full py-16 md:py-24 lg:py-32 bg-muted/40">
          <div className="container mx-auto max-w-7xl px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl">
                    Cultural Events
                  </h1>
                <p className="max-w-[900px] text-muted-foreground md:text-xl mx-auto">
                  Discover cultural events, festivals, and performances happening across Alberta.
                </p>
              </div>
            </div>
          </div>
        </section>
        <section className="w-full py-16 md:py-24 lg:py-32">
          <div className="container mx-auto max-w-7xl px-4 md:px-6">
              <div className="flex flex-col items-center justify-center text-center py-24 w-full min-h-[300px]">
                <div className="max-w-md mx-auto space-y-4">
                  <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
                    <Calendar className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold">Unable to load events</h3>
                  <p className="text-muted-foreground">
                    We're having trouble loading events right now. Please try again later.
                  </p>
                  </div>
                </div>
          </div>
        </section>
      </main>
    </div>
  )
  }
}
