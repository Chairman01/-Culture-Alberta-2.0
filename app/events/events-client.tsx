"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRight, Calendar, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getEventUrl } from '@/lib/utils/article-url'

interface Event {
    id: string
    title: string
    excerpt: string
    description?: string
    category: string
    location: string
    date: string
    imageUrl: string
    author: string
}

interface EventsClientProps {
    events: Event[]
}

export default function EventsClient({ events }: EventsClientProps) {
    const [selectedLocation, setSelectedLocation] = useState("all")
    const [selectedDate, setSelectedDate] = useState("all")
    const [selectedCategory, setSelectedCategory] = useState("all")
    const [selectedTags, setSelectedTags] = useState<string[]>([])

    const handleTagClick = (tag: string) => {
        setSelectedTags(prev =>
            prev.includes(tag)
                ? prev.filter(t => t !== tag)
                : [...prev, tag]
        )
    }

    const filterEvents = (event: Event) => {
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

    const formatEventDate = (dateString: string) => {
        if (!dateString) return 'Date TBA'

        try {
            let date: Date
            if (dateString.includes('T')) {
                const isoDate = new Date(dateString)
                const year = isoDate.getUTCFullYear()
                const month = isoDate.getUTCMonth()
                const day = isoDate.getUTCDate()
                date = new Date(year, month, day)
            } else {
                const [year, month, day] = dateString.split('-').map(Number)
                date = new Date(year, month - 1, day)
            }

            if (isNaN(date.getTime())) {
                return 'Date TBA'
            }

            return date.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric'
            })
        } catch {
            return 'Date TBA'
        }
    }

    if (filteredEvents.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center text-center py-24 w-full min-h-[300px]">
                <div className="max-w-md mx-auto space-y-4">
                    <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
                        <Calendar className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-xl font-semibold">No events match your current filters</h3>
                    <p className="text-muted-foreground">
                        We found {events.length} event{events.length !== 1 ? 's' : ''} total, but none match your selected filters.
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                setSelectedLocation("all")
                                setSelectedDate("all")
                                setSelectedCategory("all")
                                setSelectedTags([])
                            }}
                        >
                            Clear All Filters
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    return (
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
                                <SelectItem value="festival">Festivals</SelectItem>
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

            {/* Events Grid */}
            <div className="md:w-3/4 w-full flex flex-col items-center justify-center">
                <div className="grid gap-8 w-full">
                    {filteredEvents.map((event) => (
                        <div
                            key={event.id}
                            className="flex flex-col overflow-hidden rounded-lg border bg-background shadow-sm md:flex-row"
                        >
                            <div className="md:w-1/3">
                                <img
                                    src={event.imageUrl || ""}
                                    alt={event.title}
                                    className="h-full w-full object-cover"
                                    onError={(e) => {
                                        const img = e.target as HTMLImageElement
                                        img.src = ""
                                    }}
                                />
                            </div>
                            <div className="flex flex-1 flex-col justify-between p-6">
                                <div className="space-y-2">
                                    <h3 className="text-2xl font-bold">{event.title}</h3>
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                                        <div className="flex items-center gap-1">
                                            <Calendar className="h-4 w-4" />
                                            <span>{formatEventDate(event.date || '')}</span>
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
                                    <Link href={getEventUrl(event as any)}>
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
    )
}
