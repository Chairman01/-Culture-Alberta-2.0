/**
 * Events Client Component
 * 
 * Client-side component for interactive event filtering
 * 
 * Performance optimizations:
 * - Memoized filtering calculations
 * - Efficient state management
 * - Optimized re-renders
 * 
 * Used in:
 * - app/events/page.tsx (events listing page)
 */

'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Calendar, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getEventUrl } from '@/lib/utils/article-url'
import { formatEventDate } from '@/lib/utils/date'
import { filterEvents, type EventFilters } from '@/lib/utils/event-filters'
import { Article } from '@/lib/types/article'

interface EventsClientProps {
  initialEvents: Article[]
}

/**
 * Events Client Component
 * 
 * Handles client-side filtering and rendering of events
 * 
 * @param initialEvents - Server-fetched events array
 */
export default function EventsClient({ initialEvents }: EventsClientProps) {
  const [selectedLocation, setSelectedLocation] = useState<string>('all')
  const [selectedDate, setSelectedDate] = useState<string>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  // PERFORMANCE: Memoize filtered events to avoid recalculation on every render
  const filteredEvents = useMemo(() => {
    const filters: EventFilters = {
      location: selectedLocation,
      date: selectedDate,
      category: selectedCategory,
      tags: selectedTags,
    }
    return filterEvents(initialEvents, filters)
  }, [initialEvents, selectedLocation, selectedDate, selectedCategory, selectedTags])

  const handleTagClick = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
  }

  const clearAllFilters = () => {
    setSelectedLocation('all')
    setSelectedDate('all')
    setSelectedCategory('all')
    setSelectedTags([])
  }

  // Extract unique locations and categories for filter options
  const uniqueLocations = useMemo(() => {
    const locations = new Set<string>()
    initialEvents.forEach(event => {
      if (event.location) {
        locations.add(event.location)
      }
    })
    return Array.from(locations).sort()
  }, [initialEvents])

  const uniqueCategories = useMemo(() => {
    const categories = new Set<string>()
    initialEvents.forEach(event => {
      if (event.category) {
        categories.add(event.category)
      }
    })
    return Array.from(categories).sort()
  }, [initialEvents])

  return (
    <>
      {filteredEvents.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-24 w-full min-h-[300px]">
          <div className="max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
              <Calendar className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold">No events match your current filters</h3>
            <p className="text-muted-foreground">
              We found {initialEvents.length} event{initialEvents.length !== 1 ? 's' : ''} total, but none match your selected filters.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              <Button 
                variant="outline" 
                size="sm"
                onClick={clearAllFilters}
              >
                Clear All Filters
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setSelectedDate('all')}
              >
                Show All Dates
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setSelectedLocation('all')}
              >
                Show All Locations
              </Button>
            </div>
            {uniqueLocations.length > 0 && (
              <div className="text-sm text-muted-foreground mt-4">
                Available locations: {uniqueLocations.join(', ')}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col md:flex-row justify-center items-start gap-12 w-full max-w-7xl mx-auto">
          {/* Filters Sidebar */}
          <div className="md:w-1/4 w-full mb-8 md:mb-0 flex-shrink-0">
            <div>
              <h3 className="text-lg font-semibold mb-2">Filter by Location</h3>
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">All Locations</SelectItem>
                    {uniqueLocations.map(location => (
                      <SelectItem key={location} value={location.toLowerCase()}>
                        {location}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-2">Filter by Date</h3>
              <Select value={selectedDate} onValueChange={setSelectedDate}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">All Dates</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="this-week">This Week</SelectItem>
                    <SelectItem value="this-weekend">This Weekend</SelectItem>
                    <SelectItem value="this-month">This Month</SelectItem>
                    <SelectItem value="next-month">Next Month</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-2">Filter by Category</h3>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">All Categories</SelectItem>
                    {uniqueCategories.map(category => (
                      <SelectItem key={category} value={category.toLowerCase()}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="mt-6 space-y-2">
              <h3 className="text-lg font-semibold">Popular Tags</h3>
              <div className="flex flex-wrap gap-2">
                {["Family-friendly", "Free", "Indigenous", "Ukrainian", "Music", "Dance", "Food", "Workshop"].map(
                  (tag) => (
                    <Button 
                      key={tag} 
                      variant={selectedTags.includes(tag) ? "default" : "outline"}
                      size="sm" 
                      className="rounded-full"
                      onClick={() => handleTagClick(tag)}
                    >
                      {tag}
                    </Button>
                  ),
                )}
              </div>
            </div>
          </div>

          {/* Events List */}
          <div className="md:w-3/4 w-full flex flex-col items-center justify-center">
            <div className="grid gap-8 w-full">
              {filteredEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/**
 * Event Card Component
 * 
 * Reusable card component for displaying event previews
 * 
 * @param event - Event object to display
 */
function EventCard({ event }: { event: Article }) {
  const imageUrl = event.imageUrl || '/images/events-fallback.jpg'
  
  return (
    <div className="flex flex-col overflow-hidden rounded-lg border bg-background shadow-sm md:flex-row hover:shadow-md transition-shadow">
      <div className="md:w-1/3 relative aspect-video md:aspect-auto">
        {imageUrl.startsWith('data:image') ? (
          <img
            src={imageUrl}
            alt={event.title}
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <Image
            src={imageUrl}
            alt={event.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 33vw"
            loading="lazy"
            quality={75}
            onError={(e) => {
              // Fallback to placeholder on error
              const img = e.target as HTMLImageElement
              img.src = '/images/events-fallback.jpg'
            }}
          />
        )}
      </div>
      <div className="flex flex-1 flex-col justify-between p-6">
        <div className="space-y-2">
          <h3 className="text-2xl font-bold">{event.title}</h3>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" aria-hidden="true" />
              <time dateTime={event.date || event.createdAt}>
                {formatEventDate(event.date || event.createdAt)}
              </time>
            </div>
            {event.location && (
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" aria-hidden="true" />
                <span>{event.location}</span>
              </div>
            )}
            {event.category && (
              <span className="rounded-full bg-muted px-2 py-1 text-xs">
                {event.category}
              </span>
            )}
          </div>
          {(event.excerpt || event.description) && (
            <p className="text-muted-foreground line-clamp-2">
              {event.excerpt || event.description}
            </p>
          )}
        </div>
        <div className="mt-4 flex items-center justify-between">
          <Link href={getEventUrl(event)}>
            <Button variant="outline">View Details</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}


