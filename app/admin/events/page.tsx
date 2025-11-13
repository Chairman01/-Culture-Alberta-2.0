"use client"

import { useState, useEffect, useRef } from "react"
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

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export default function EventsAdminPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [locationFilter, setLocationFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false
  })
  const hasLoadedRef = useRef(false)
  const [deleteEventId, setDeleteEventId] = useState<string | null>(null)
  const [events, setEvents] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [locations, setLocations] = useState<string[]>([])
  const { toast } = useToast()

  const loadEvents = async (page: number = currentPage) => {
    setIsLoading(true)
    try {
      // Build query parameters
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
      })
      
      if (searchTerm) params.append('search', searchTerm)
      if (locationFilter && locationFilter !== 'all') params.append('location', locationFilter)
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter)
      
      const url = `/api/admin/events?${params.toString()}`
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`)
      }
      
      const data = await response.json()
      
      // Handle new API response format with pagination
      if (data.events && data.pagination) {
        // Transform events to match the expected format
        const formattedEvents = data.events.map((event: any) => ({
          id: event.id,
          title: event.title,
          category: event.category,
          date: event.event_date || event.date,
          location: event.location,
          image: event.image_url || event.image,
          image_url: event.image_url || event.image,
          status: event.status || 'published',
        }))
        
        setEvents(formattedEvents)
        setPagination(data.pagination)
        
        // Extract unique locations for filter
        if (data.events.length > 0) {
          const uniqueLocations = Array.from(new Set(
            data.events.map((e: any) => e.location).filter((l: string) => l && l.trim() !== '')
          )) as string[]
          
          if (uniqueLocations.length > 0) {
            setLocations(prev => {
              const combined = [...new Set([...prev, ...uniqueLocations])]
              return combined.sort()
            })
          }
        }
      } else {
        // Fallback for old API format (backward compatibility)
        const eventsData = Array.isArray(data) ? data : []
        const formattedEvents = eventsData.map((event: any) => ({
          id: event.id,
          title: event.title,
          category: event.category,
          date: event.event_date || event.date,
          location: event.location,
          image: event.image_url || event.image,
          status: event.status || 'published',
        }))
        
        setEvents(formattedEvents)
        setPagination({
          page: 1,
          limit: 10,
          total: formattedEvents.length,
          totalPages: Math.ceil(formattedEvents.length / 10),
          hasNextPage: false,
          hasPrevPage: false
        })
      }
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

  // Single useEffect to handle all loading - prevents multiple calls
  useEffect(() => {
    // Skip if already loaded initially and this is just a filter/page change
    if (!hasLoadedRef.current) {
      // Initial load - no debounce needed
      hasLoadedRef.current = true
      loadEvents(1)
      return
    }

    // For filter changes, use debounce for search only
    const timeoutId = setTimeout(() => {
      if (searchTerm || locationFilter !== 'all' || statusFilter !== 'all') {
        // Filter change - reset to page 1
        setCurrentPage(1)
        loadEvents(1)
      } else if (currentPage !== pagination.page) {
        // Page change only
        loadEvents(currentPage)
      }
    }, searchTerm ? 300 : 0) // Debounce search by 300ms

    return () => clearTimeout(timeoutId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, locationFilter, statusFilter, currentPage])

  // Filtering now handled server-side, use events directly
  const displayedEvents = events

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
      await loadEvents(currentPage)

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
          <p className="text-gray-500 mt-1">
            Showing {events.length} of {pagination.total} events
            {pagination.totalPages > 1 && ` (Page ${pagination.page} of ${pagination.totalPages})`}
          </p>
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
            {locations.map((location) => {
              const city = location.split(",")[0].trim()
              return (
                <SelectItem key={location} value={city.toLowerCase()}>
                  {city}
                </SelectItem>
              )
            })}
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
            {displayedEvents.length > 0 ? (
              displayedEvents.map((event) => (
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

      {pagination.totalPages > 1 && (
        <div className="flex justify-center mt-6">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => pagination.hasPrevPage && setCurrentPage(p => Math.max(1, p - 1))}
                  className={!pagination.hasPrevPage ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
              
              {/* Show page numbers */}
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                let pageNum: number
                if (pagination.totalPages <= 5) {
                  pageNum = i + 1
                } else if (pagination.page <= 3) {
                  pageNum = i + 1
                } else if (pagination.page >= pagination.totalPages - 2) {
                  pageNum = pagination.totalPages - 4 + i
                } else {
                  pageNum = pagination.page - 2 + i
                }
                
                return (
                  <PaginationItem key={pageNum}>
                    <PaginationLink
                      isActive={pageNum === pagination.page}
                      onClick={() => setCurrentPage(pageNum)}
                      className="cursor-pointer"
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                )
              })}
              
              <PaginationItem>
                <PaginationNext
                  onClick={() => pagination.hasNextPage && setCurrentPage(p => Math.min(pagination.totalPages, p + 1))}
                  className={!pagination.hasNextPage ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  )
}


