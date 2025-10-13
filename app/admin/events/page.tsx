"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Edit, Plus, Search, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"

export default function EventsAdminPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [locationFilter, setLocationFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [deleteEventId, setDeleteEventId] = useState<string | null>(null)
  const [events, setEvents] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  const eventsPerPage = 10

  // Load events data on component mount
  useEffect(() => {
    async function loadEvents() {
      try {
        console.log('🔄 Loading events from events table...')
        // Load events from API
        const response = await fetch('/api/admin/events')
        if (!response.ok) {
          throw new Error(`API responded with status: ${response.status}`)
        }
        const eventsData = await response.json()
        console.log('📅 Events loaded:', eventsData.length, 'events')
        console.log('📅 Event details:', eventsData.map(e => ({ id: e.id, title: e.title, eventDate: e.event_date })))
        
        // Transform events to match the expected format
        const formattedEvents = eventsData.map(event => ({
          id: event.id,
          title: event.title,
          category: event.category,
          date: event.event_date, // Use event_date instead of eventDate
          location: event.location,
          description: event.description,
          image: event.image_url,
          status: event.status,
          organizer: event.organizer
        }))

        console.log('✅ Formatted events:', formattedEvents.length)
        setEvents(formattedEvents)
      } catch (error) {
        console.error("Error loading events:", error)
        toast({
          title: "Error loading events",
          description: "There was a problem loading the events.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadEvents()
  }, [toast])

  // Filter events based on search term, location, and status
  const filteredEvents = events.filter((event) => {
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesLocation = locationFilter === "all" || event.location.toLowerCase().includes(locationFilter)
    const matchesStatus = statusFilter === "all" || event.status?.toLowerCase() === statusFilter.toLowerCase()

    return matchesSearch && matchesLocation && matchesStatus
  })

  // Calculate pagination
  const indexOfLastEvent = currentPage * eventsPerPage
  const indexOfFirstEvent = indexOfLastEvent - eventsPerPage
  const currentEvents = filteredEvents.slice(indexOfFirstEvent, indexOfLastEvent)
  const totalPages = Math.ceil(filteredEvents.length / eventsPerPage)

  // Get unique locations for filter dropdown
  const locations = Array.from(
    new Set(
      events
        .filter((event) => event.location) // Filter out events without location
        .map((event) => {
          const city = event.location.split(",")[0].trim()
          return city
        }),
    ),
  )

  const handleDeleteEvent = async (id: string) => {
    try {
      // Delete from the events system via API
      const deleteResponse = await fetch('/api/admin/events', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id }),
      })
      
      if (!deleteResponse.ok) {
        throw new Error('Failed to delete event')
      }

      // Reload events from server to get updated data
      const response = await fetch('/api/admin/events')
      if (response.ok) {
        const eventsData = await response.json()
        const formattedEvents = eventsData.map(event => ({
          id: event.id,
          title: event.title,
          category: event.category,
          date: event.event_date,
          location: event.location,
          description: event.description,
          image: event.image_url,
          status: event.status,
          organizer: event.organizer
        }))
        setEvents(formattedEvents)
      }

      toast({
        title: "Event deleted",
        description: "The event has been successfully deleted.",
      })
    } catch (error) {
      console.error("Error deleting event:", error)
      toast({
        title: "Error deleting event",
        description: "There was a problem deleting the event.",
        variant: "destructive",
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Events</h1>
          <p className="text-gray-500 mt-1">Upcoming Events ({events.length})</p>
        </div>
        <Button asChild>
          <Link href="/admin/new-event">
            <Plus className="mr-2 h-4 w-4" />
            Create New Event
          </Link>
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search events..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={locationFilter} onValueChange={setLocationFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Locations" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Locations</SelectItem>
            {locations.map((location) => (
              <SelectItem key={location} value={location.toLowerCase()}>
                {location}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="upcoming">Upcoming</SelectItem>
            <SelectItem value="past">Past</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="text-left p-4 font-medium">Title</th>
              <th className="text-left p-4 font-medium">Location</th>
              <th className="text-left p-4 font-medium">Date</th>
              <th className="text-left p-4 font-medium">Status</th>
              <th className="text-right p-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredEvents.length > 0 ? (
              filteredEvents.map((event) => (
                <tr key={event.id} className="border-b">
                  <td className="p-4">
                    <div className="font-medium">{event.title}</div>
                    <div className="text-sm text-gray-500 line-clamp-1">
                      {event.location}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {event.location}
                    </span>
                  </td>
                  <td className="p-4 text-gray-500">{event.date}</td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      event.status === 'upcoming' 
                        ? 'bg-green-100 text-green-800'
                        : event.status === 'cancelled'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {event.status || 'Upcoming'}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/admin/edit-event/${event.id}`}>
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">Edit</span>
                        </Link>
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteEvent(event.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-500">
                  No events found. {searchTerm || locationFilter !== "all" || statusFilter !== "all" ? "Try adjusting your filters." : ""}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <Pagination className="mt-4">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>

            {Array.from({ length: totalPages }).map((_, index) => (
              <PaginationItem key={index}>
                <PaginationLink isActive={currentPage === index + 1} onClick={() => setCurrentPage(index + 1)}>
                  {index + 1}
                </PaginationLink>
              </PaginationItem>
            ))}

            <PaginationItem>
              <PaginationNext
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  )
}


