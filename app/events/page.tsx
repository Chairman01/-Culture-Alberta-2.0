"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowRight, Calendar, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Article } from "@/lib/data"
import { Footer } from "@/components/footer"

interface ExtendedEvent extends Article {
  description?: string;
}

export default function EventsPage() {
  const [events, setEvents] = useState<ExtendedEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedLocation, setSelectedLocation] = useState("all")
  const [selectedDate, setSelectedDate] = useState("all")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  useEffect(() => {
    loadEvents()
  }, [])

  const loadEvents = () => {
    try {
      const keys = Object.keys(localStorage)
      const postKeys = keys.filter(key => key.startsWith('post_') && !key.startsWith('post_image_'))
      const articleKeys = keys.filter(key => key.startsWith('article_') && !key.startsWith('article_image_'))
      
      const allEvents: ExtendedEvent[] = []
      
      for (const key of [...postKeys, ...articleKeys]) {
        const savedJson = localStorage.getItem(key)
        if (savedJson) {
          const event = JSON.parse(savedJson)
          
          // Only include events (articles with future dates or marked as events)
          const eventDate = new Date(event.date || 0)
          const isEvent = event.type === 'event' || eventDate > new Date()
          
          if (isEvent) {
            // Handle image loading
            if (event.image && event.image.startsWith('__BASE64_IMAGE_')) {
              const imageId = event.image.replace('__BASE64_IMAGE_', '').replace('__', '')
              const savedImage = localStorage.getItem(`post_image_${imageId}`) || 
                               localStorage.getItem(`article_image_${imageId}`)
              if (savedImage) {
                event.image = savedImage
              }
            }

            allEvents.push({
              ...event,
              id: key.replace('post_', '').replace('article_', ''),
              category: event.category || 'General',
              location: event.location || 'Alberta',
              date: event.date || new Date().toISOString(),
              image: event.image || `/placeholder.svg?width=400&height=300&text=${encodeURIComponent(event.title)}`
            })
          }
        }
      }

      // Sort by date
      allEvents.sort((a, b) => {
        const dateA = new Date(a.date || 0).getTime()
        const dateB = new Date(b.date || 0).getTime()
        return dateA - dateB // Sort by closest date first
      })

      setEvents(allEvents)
      setIsLoading(false)
    } catch (error) {
      console.error('Error loading events:', error)
      setIsLoading(false)
    }
  }

  const handleTagClick = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
  }

  const filterEvents = (event: ExtendedEvent) => {
    // Location filter
    if (selectedLocation !== "all" && !event.location?.toLowerCase().includes(selectedLocation.toLowerCase())) {
      return false
    }

    // Date filter
    const eventDate = new Date(event.date || 0)
    const today = new Date()
    const thisWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
    const thisMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 2, 0)

    if (selectedDate === "today" && eventDate.toDateString() !== today.toDateString()) {
      return false
    }
    if (selectedDate === "this-week" && eventDate > thisWeek) {
      return false
    }
    if (selectedDate === "this-weekend") {
      const isWeekend = eventDate.getDay() === 0 || eventDate.getDay() === 6
      const isThisWeek = eventDate <= thisWeek
      if (!isWeekend || !isThisWeek) return false
    }
    if (selectedDate === "this-month" && eventDate > thisMonth) {
      return false
    }
    if (selectedDate === "next-month" && (eventDate <= thisMonth || eventDate > nextMonth)) {
      return false
    }

    // Category filter
    if (selectedCategory !== "all" && !event.category?.toLowerCase().includes(selectedCategory.toLowerCase())) {
      return false
    }

    // Tags filter
    if (selectedTags.length > 0) {
      const eventText = `${event.title} ${event.description} ${event.category} ${event.location}`.toLowerCase()
      return selectedTags.some(tag => eventText.includes(tag.toLowerCase()))
    }

    return true
  }

  const filteredEvents = events.filter(filterEvents)

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 bg-muted/40">
          <div className="container mx-auto max-w-7xl px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl">Cultural Events</h1>
                <p className="max-w-[900px] text-muted-foreground md:text-xl mx-auto">
                  Discover cultural events, festivals, and performances happening across Alberta.
                </p>
              </div>
            </div>
          </div>
        </section>
        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container mx-auto max-w-7xl px-4 md:px-6">
            {isLoading ? (
              <div className="flex items-center justify-center h-64 w-full">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-24 w-full min-h-[300px]">
                <h3 className="text-lg font-semibold">No events found</h3>
                <p className="text-muted-foreground">Try adjusting your filters to find more events.</p>
              </div>
            ) : (
              <div className="flex flex-col md:flex-row justify-center items-start gap-12 w-full max-w-7xl mx-auto">
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
                          <SelectItem value="edmonton">Edmonton</SelectItem>
                          <SelectItem value="calgary">Calgary</SelectItem>
                          <SelectItem value="lethbridge">Lethbridge</SelectItem>
                          <SelectItem value="banff">Banff</SelectItem>
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
                          <SelectItem value="festivals">Festivals</SelectItem>
                          <SelectItem value="music">Music</SelectItem>
                          <SelectItem value="dance">Dance</SelectItem>
                          <SelectItem value="theater">Theater</SelectItem>
                          <SelectItem value="art">Art Exhibitions</SelectItem>
                          <SelectItem value="food">Food & Culinary</SelectItem>
                          <SelectItem value="heritage">Heritage</SelectItem>
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
                <div className="md:w-3/4 w-full flex flex-col items-center justify-center">
                  <div className="grid gap-8 w-full">
                    {filteredEvents.map((event) => (
                      <div
                        key={event.id}
                        className="flex flex-col overflow-hidden rounded-lg border bg-background shadow-sm md:flex-row"
                      >
                        <div className="md:w-1/3">
                          <img
                            src={event.image || "/placeholder.svg"}
                            alt={event.title}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              const img = e.target as HTMLImageElement
                              img.src = `/placeholder.svg?width=400&height=300&text=${encodeURIComponent(event.title)}`
                            }}
                          />
                        </div>
                        <div className="flex flex-1 flex-col justify-between p-6">
                          <div className="space-y-2">
                            <h3 className="text-2xl font-bold">{event.title}</h3>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                <span>{event.date}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                <span>{event.location}</span>
                              </div>
                              <span className="rounded-full bg-muted px-2 py-1 text-xs">{event.category}</span>
                            </div>
                            <p className="text-muted-foreground">{event.excerpt || event.description}</p>
                          </div>
                          <div className="mt-4 flex items-center justify-between">
                            <Link href={`/articles/${event.id}`}>
                              <Button variant="outline">View Details</Button>
                            </Link>
                            <Button>Register</Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
