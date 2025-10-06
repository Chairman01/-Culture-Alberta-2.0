"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowLeft, Save, Upload } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ImageUploader } from "@/app/admin/components/image-uploader"
import { SimpleTextEditor } from "@/app/admin/components/simple-text-editor"
import { useToast } from "@/hooks/use-toast"
import { getEventById, updateEvent } from "@/lib/events"
import { Event } from "@/lib/types/event"

export default function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState<string>("")
  const [event, setEvent] = useState<Event | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  // Handle async params
  useEffect(() => {
    params.then(({ id: paramId }) => setId(paramId))
  }, [params])

  // Fetch event data when ID is available
  useEffect(() => {
    if (id) {
      loadEvent()
    }
  }, [id])

  const loadEvent = async () => {
    try {
      setIsLoading(true)
      setError(null)
      console.log('Loading event with ID:', id)
      
      const eventData = await getEventById(id)
      
      if (!eventData) {
        setError('Event not found')
        return
      }
      
      setEvent(eventData)
      console.log('Loaded event:', eventData)
    } catch (err) {
      console.error('Error loading event:', err)
      setError('Failed to load event')
    } finally {
      setIsLoading(false)
    }
  }

  // Form state - initialize with empty values, will be populated when event loads
  const [title, setTitle] = useState("")
  const [category, setCategory] = useState("")
  const [type, setType] = useState("event")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [location, setLocation] = useState("")
  const [description, setDescription] = useState("")
  const [excerpt, setExcerpt] = useState("")
  const [imageUrl, setImageUrl] = useState("")
  const [showImageUploader, setShowImageUploader] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [ticketUrl, setTicketUrl] = useState("")
  const [organizer, setOrganizer] = useState("")
  const [contactEmail, setContactEmail] = useState("")
  const [contactPhone, setContactPhone] = useState("")

  // Update form fields when event data loads
  useEffect(() => {
    if (event) {
      setTitle(event.title || "")
      setCategory(event.category?.toLowerCase() || "")
      setLocation(event.location || "")
      setDescription(event.description || "")
      setExcerpt(event.excerpt || "")
      setImageUrl(event.image_url || "")
      setTicketUrl(event.website_url || "")
      setOrganizer(event.organizer || "")
      setContactEmail(event.organizer_contact || "")
      
      // Parse event dates
      if (event.event_date) {
        const startDate = new Date(event.event_date)
        setStartDate(startDate.toISOString().split('T')[0])
      }
      if (event.event_end_date) {
        const endDate = new Date(event.event_end_date)
        setEndDate(endDate.toISOString().split('T')[0])
      }
    }
  }, [event])

  const handleImageSelect = (url: string) => {
    setImageUrl(url)
    setShowImageUploader(false)

    toast({
      title: "Image updated",
      description: "The event image has been updated successfully.",
    })
  }

  const handleSave = async () => {
    console.log('🔧 handleSave called')
    console.log('🔧 Event ID:', event?.id)
    console.log('🔧 Current form data:', { title, category, location, description, excerpt })
    
    if (!event) {
      console.error('❌ No event data available')
      toast({
        title: "Error",
        description: "No event data available to update.",
        variant: "destructive",
      })
      return
    }
    
    setIsSaving(true)

    try {
      // Prepare the update data
      const updateData = {
        title,
        category: category.charAt(0).toUpperCase() + category.slice(1),
        location,
        description,
        excerpt: excerpt || description.substring(0, 150) + (description.length > 150 ? '...' : ''), // Use manual excerpt or auto-generate
        image_url: imageUrl,
        website_url: ticketUrl,
        organizer,
        organizer_contact: contactEmail,
        event_date: startDate ? new Date(startDate).toISOString() : undefined,
        event_end_date: endDate ? new Date(endDate).toISOString() : undefined,
      }

      console.log("🔧 Updating event with data:", updateData)

      // Update the event in the database
      console.log('🔧 Calling updateEvent...')
      const updatedEvent = await updateEvent(event.id, updateData)
      console.log('🔧 updateEvent result:', updatedEvent)

      if (updatedEvent) {
        console.log('✅ Event updated successfully')
        setEvent(updatedEvent)
        toast({
          title: "Event updated",
          description: "Your event has been updated successfully.",
        })
      } else {
        console.error('❌ updateEvent returned null/undefined')
        throw new Error('Failed to update event - no data returned')
      }
    } catch (error) {
      console.error("❌ Error saving event:", error)
      toast({
        title: "Error saving event",
        description: `Failed to update the event: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      })
    } finally {
      console.log('🔧 Setting isSaving to false')
      setIsSaving(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-6 md:gap-10">
            <Link href="/admin" className="flex items-center space-x-2">
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm font-medium">Back to Dashboard</span>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline">Save as Draft</Button>
            <Button onClick={() => {
              console.log('🔧 Update Event button clicked!')
              handleSave()
            }} disabled={isSaving}>
              {isSaving ? (
                <>Saving...</>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" /> Update Event
                </>
              )}
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1 container py-10">
        <div className="max-w-3xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold mb-6">Edit Event</h1>
            
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                <span className="ml-2">Loading event...</span>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <div className="text-red-600 mb-4">
                  <h3 className="text-lg font-semibold">Error Loading Event</h3>
                  <p className="text-sm">{error}</p>
                </div>
                <Button onClick={loadEvent} variant="outline">
                  Try Again
                </Button>
              </div>
            ) : !event ? (
              <div className="text-center py-12">
                <h3 className="text-lg font-semibold mb-2">Event Not Found</h3>
                <p className="text-muted-foreground">The event you're looking for doesn't exist.</p>
              </div>
            ) : (
              <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Event Title</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Content Type</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger id="type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="event">Event</SelectItem>
                      <SelectItem value="article">Article</SelectItem>
                      <SelectItem value="news">News</SelectItem>
                      <SelectItem value="guide">Guide</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="festival">Festival</SelectItem>
                      <SelectItem value="art">Art</SelectItem>
                      <SelectItem value="music">Music</SelectItem>
                      <SelectItem value="dance">Dance</SelectItem>
                      <SelectItem value="food">Food</SelectItem>
                      <SelectItem value="film">Film</SelectItem>
                      <SelectItem value="theater">Theater</SelectItem>
                      <SelectItem value="workshop">Workshop</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start-date">Start Date</Label>
                  <Input id="start-date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end-date">End Date (Optional)</Label>
                  <Input id="end-date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <SimpleTextEditor
                  content={description.replace(/<[^>]*>/g, '')} // Strip HTML for editing
                  onChange={setDescription}
                  placeholder="Write your event description here..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="excerpt">Excerpt (Short Summary)</Label>
                <Textarea
                  id="excerpt"
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  placeholder="Enter a short summary for event cards (optional - will auto-generate from description if empty)"
                  className="resize-none h-20"
                />
                <p className="text-sm text-muted-foreground">
                  This appears on event cards and listings. Leave empty to auto-generate from description.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="event-image">Event Image</Label>
                <div className="border rounded-lg overflow-hidden">
                  <div className="h-60 bg-muted">
                    {imageUrl ? (
                      <div className="w-full h-full relative">
                        <img
                          src={imageUrl || "/placeholder.svg"}
                          alt="Event image preview"
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            console.error("Image failed to load:", imageUrl)
                            e.currentTarget.src = `/placeholder.svg?height=400&width=600&text=${encodeURIComponent(title)}`
                          }}
                        />
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Upload className="h-10 w-10 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="p-4 flex justify-between items-center">
                    <span className="text-sm text-muted-foreground truncate max-w-[70%]">
                      {imageUrl || "No image selected"}
                    </span>
                    <Button variant="outline" size="sm" onClick={() => setShowImageUploader(true)}>
                      {imageUrl ? "Replace Image" : "Add Image"}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ticket-url">Ticket URL (Optional)</Label>
                <Input
                  id="ticket-url"
                  placeholder="https://example.com/tickets"
                  value={ticketUrl}
                  onChange={(e) => setTicketUrl(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="organizer">Organizer</Label>
                  <Input
                    id="organizer"
                    placeholder="Event organizer"
                    value={organizer}
                    onChange={(e) => setOrganizer(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact-email">Contact Email</Label>
                  <Input
                    id="contact-email"
                    type="email"
                    placeholder="contact@example.com"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact-phone">Contact Phone</Label>
                  <Input
                    id="contact-phone"
                    placeholder="(123) 456-7890"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                  />
                </div>
              </div>

                <div className="pt-4 flex justify-end gap-2">
                  <Button variant="outline" asChild>
                    <Link href="/admin">Cancel</Link>
                  </Button>
                  <Button onClick={() => {
                    console.log('🔧 Save Changes button clicked!')
                    handleSave()
                  }} disabled={isSaving}>
                    {isSaving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      <footer className="w-full border-t bg-background py-4">
        <div className="container">
          <p className="text-center text-sm text-muted-foreground">
            © 2025 Culture Alberta Admin. All rights reserved.
          </p>
        </div>
      </footer>

      {showImageUploader && (
        <ImageUploader
          onSelect={handleImageSelect}
          onClose={() => setShowImageUploader(false)}
        />
      )}
    </div>
  )
}
