"use client"

import React, { useState, useCallback, memo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar, MapPin, Clock, ExternalLink, Heart, Share2 } from 'lucide-react'
import { format, isToday, isTomorrow, isThisWeek } from 'date-fns'
import { cn } from '@/lib/utils'

// Types that Cursor web can enhance with better IntelliSense
interface EventData {
  id: string
  title: string
  description: string
  excerpt?: string
  location?: string
  organizer?: string
  price?: string
  link?: string
  status?: string
  imageUrl?: string
  event_date: string
  event_end_date?: string
  category?: string
  featured_home?: boolean
  featured_calgary?: boolean
  featured_edmonton?: boolean
  trending_home?: boolean
  trending_calgary?: boolean
  trending_edmonton?: boolean
}

interface SmartEventCardProps {
  event: EventData
  variant?: 'default' | 'featured' | 'compact'
  showActions?: boolean
  onFavorite?: (eventId: string) => void
  onShare?: (event: EventData) => void
  className?: string
}

// Utility functions that Cursor web can optimize
const formatEventDate = (dateString: string): string => {
  if (!dateString) return 'Date TBA'
  
  try {
    const date = new Date(dateString)
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.error('Invalid date string:', dateString)
      return 'Date TBA'
    }
    
    if (isToday(date)) {
      return `Today at ${format(date, 'h:mm a')}`
    }
    
    if (isTomorrow(date)) {
      return `Tomorrow at ${format(date, 'h:mm a')}`
    }
    
    if (isThisWeek(date)) {
      return format(date, 'EEEE \'at\' h:mm a')
    }
    
    return format(date, 'MMM d, yyyy \'at\' h:mm a')
  } catch (error) {
    console.error('Error formatting date:', error, 'Date string:', dateString)
    return 'Date TBA'
  }
}

const getEventStatus = (event: EventData): { status: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } => {
  const now = new Date()
  const eventDate = new Date(event.event_date)
  const endDate = event.event_end_date ? new Date(event.event_end_date) : null
  
  if (event.status === 'cancelled') {
    return { status: 'Cancelled', variant: 'destructive' }
  }
  
  if (event.status === 'postponed') {
    return { status: 'Postponed', variant: 'secondary' }
  }
  
  if (endDate && now > endDate) {
    return { status: 'Ended', variant: 'outline' }
  }
  
  if (now > eventDate) {
    return { status: 'In Progress', variant: 'default' }
  }
  
  return { status: 'Upcoming', variant: 'default' }
}

const getFeaturedBadges = (event: EventData): string[] => {
  const badges: string[] = []
  
  if (event.featured_home) badges.push('Featured')
  if (event.trending_home) badges.push('Trending')
  if (event.featured_calgary) badges.push('Calgary')
  if (event.featured_edmonton) badges.push('Edmonton')
  
  return badges
}

// Main component with Cursor web optimizations
export const SmartEventCard = memo<SmartEventCardProps>(({
  event,
  variant = 'default',
  showActions = true,
  onFavorite,
  onShare,
  className
}) => {
  const [isFavorited, setIsFavorited] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  
  // Memoized values that Cursor web can optimize
  const eventStatus = getEventStatus(event)
  const featuredBadges = getFeaturedBadges(event)
  const formattedDate = formatEventDate(event.event_date)
  
  // Event handlers with proper error handling
  const handleFavorite = useCallback(async () => {
    if (!onFavorite) return
    
    setIsLoading(true)
    try {
      await onFavorite(event.id)
      setIsFavorited(!isFavorited)
    } catch (error) {
      console.error('Failed to favorite event:', error)
    } finally {
      setIsLoading(false)
    }
  }, [event.id, isFavorited, onFavorite])
  
  const handleShare = useCallback(() => {
    if (onShare) {
      onShare(event)
    } else if (navigator.share) {
      navigator.share({
        title: event.title,
        text: event.excerpt || event.description,
        url: event.link || window.location.href
      })
    }
  }, [event, onShare])
  
  // Dynamic styling based on variant
  const cardVariants = {
    default: 'hover:shadow-lg transition-all duration-300',
    featured: 'ring-2 ring-primary hover:shadow-xl transition-all duration-300',
    compact: 'hover:shadow-md transition-all duration-200'
  }
  
  return (
    <Card className={cn(
      'group cursor-pointer overflow-hidden',
      cardVariants[variant],
      className
    )}>
      {/* Image Section */}
      {event.imageUrl && (
        <div className="relative h-48 w-full overflow-hidden">
          <img
            src={event.imageUrl}
            alt={event.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          
          {/* Featured badges */}
          {featuredBadges.length > 0 && (
            <div className="absolute top-2 left-2 flex gap-1 flex-wrap">
              {featuredBadges.map((badge) => (
                <Badge key={badge} variant="secondary" className="text-xs">
                  {badge}
                </Badge>
              ))}
            </div>
          )}
          
          {/* Status badge */}
          <div className="absolute top-2 right-2">
            <Badge variant={eventStatus.variant}>
              {eventStatus.status}
            </Badge>
          </div>
        </div>
      )}
      
      <CardHeader className="pb-3">
        <CardTitle className="line-clamp-2 text-lg group-hover:text-primary transition-colors">
          {event.title}
        </CardTitle>
        
        {event.excerpt && (
          <CardDescription className="line-clamp-2">
            {event.excerpt}
          </CardDescription>
        )}
      </CardHeader>
      
      <CardContent className="pt-0">
        {/* Event Details */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{formattedDate}</span>
          </div>
          
          {event.location && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span className="line-clamp-1">{event.location}</span>
            </div>
          )}
          
          {event.organizer && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className="line-clamp-1">by {event.organizer}</span>
            </div>
          )}
          
          {event.price && (
            <div className="text-sm font-medium text-primary">
              {event.price}
            </div>
          )}
        </div>
        
        {/* Category */}
        {event.category && (
          <div className="mb-4">
            <Badge variant="outline" className="text-xs">
              {event.category}
            </Badge>
          </div>
        )}
        
        {/* Actions */}
        {showActions && (
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleFavorite}
                disabled={isLoading}
                className="h-8 px-2"
              >
                <Heart 
                  className={cn(
                    "h-4 w-4",
                    isFavorited && "fill-red-500 text-red-500"
                  )} 
                />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleShare}
                className="h-8 px-2"
              >
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
            
            {event.link && (
              <Button
                variant="outline"
                size="sm"
                asChild
                className="h-8"
              >
                <a href={event.link} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-1" />
                  View Event
                </a>
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
})

SmartEventCard.displayName = 'SmartEventCard'

// Export types for better Cursor web assistance
export type { EventData, SmartEventCardProps }
